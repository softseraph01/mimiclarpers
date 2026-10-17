import type { DemoRoom, DialogueClip, RoomVisibility } from '../types/domain';

export interface AuthUser {
  id: string;
  displayName: string;
}

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}

export interface CreateRoomRequest {
  name: string;
  creator: string;
  visibility: RoomVisibility;
  targetLanguage: string;
}

/** Shared async boundary for local demo and future remote room adapters. */
export interface RoomService {
  createRoom(input: CreateRoomRequest): Promise<DemoRoom>;
  joinRoom(code: string): Promise<DemoRoom>;
  getRoom(roomId: string): Promise<DemoRoom | null>;
  listRooms(): Promise<DemoRoom[]>;
}

export interface ProjectSummary {
  id: string;
  name: string;
  ownerId: string;
  roomId: string | null;
  updatedAt: string;
}

export interface ProjectService {
  listProjects(): Promise<ProjectSummary[]>;
  getProject(projectId: string): Promise<ProjectSummary | null>;
}

export interface MediaAsset {
  id: string;
  projectId: string;
  objectPath: string;
  kind: 'video' | 'audio';
  contentType: string;
  sizeBytes: number;
}

export interface MediaUploadService {
  requestUpload(projectId: string, file: File): Promise<{ assetId: string; uploadUrl: string }>;
  getAuthorizedUrl(assetId: string): Promise<string>;
}

export interface RecordingService {
  startRecording(characterId: string): Promise<void>;
  stopRecording(): Promise<Blob>;
}

/** Pure editing operations for the demo UI; they do not save or synchronize clips. */
export interface TimelineEditService {
  reset(): DialogueClip[];
  move(clips: DialogueClip[], id: string, deltaSeconds: number, sceneDurationSeconds: number): DialogueClip[];
  trim(clips: DialogueClip[], id: string, deltaSeconds: number, sceneDurationSeconds: number): DialogueClip[];
  split(clips: DialogueClip[], id: string): DialogueClip[];
}

/** Future persistence boundary for versioned, Supabase-backed clip records. */
export interface TimelineService {
  listClips(sceneId: string): Promise<DialogueClip[]>;
  saveClip(clip: DialogueClip, expectedRevision: number): Promise<{ revision: number }>;
}

export interface ExportJob {
  id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  outputAssetId?: string;
}

export interface ExportService {
  requestMixedAudioExport(projectId: string): Promise<ExportJob>;
  getExportJob(jobId: string): Promise<ExportJob>;
}

// Auth, project persistence, uploads, recording, timeline persistence, and export are future
// boundaries only. Phase 1 instantiates the local room adapter and pure local timeline editor.
