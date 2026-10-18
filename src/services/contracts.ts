import type {
  DemoRoom,
  DialogueClip,
  PersistentProject,
  PersistentRoom,
  PersistentRoomMember,
  PublicRoomSummary,
  RoomVisibility,
} from '../types/domain';

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

/** Shared async boundary for the isolated browser-only sample flow. */
export interface RoomService {
  createRoom(input: CreateRoomRequest): Promise<DemoRoom>;
  joinRoom(code: string): Promise<DemoRoom>;
  getRoom(roomId: string): Promise<DemoRoom | null>;
  listRooms(): Promise<DemoRoom[]>;
}

export interface CreatePersistentRoomRequest {
  name: string;
  description: string;
  visibility: RoomVisibility;
  targetLanguage: string;
  maxMembers: number | null;
}

export interface CreatePersistentRoomResult {
  room: PersistentRoom;
  projectId: string;
  inviteCode: string | null;
  inviteExpiresAt: string | null;
}

export interface JoinRoomResult {
  roomId: string;
  alreadyMember: boolean;
}

export interface RotateRoomInviteResult {
  inviteCode: string;
  expiresAt: string;
}

export interface UpdateRoomSettingsRequest {
  roomId: string;
  name: string;
  description: string;
  targetLanguage: string;
  maxMembers: number | null;
}

/** Supabase-backed room and project operations. Every mutation is a trusted database RPC. */
export interface CollaborativeRoomService {
  createRoom(input: CreatePersistentRoomRequest): Promise<CreatePersistentRoomResult>;
  joinPublicRoom(roomId: string): Promise<JoinRoomResult>;
  joinPrivateRoom(inviteCode: string): Promise<JoinRoomResult>;
  getRoom(roomId: string): Promise<PersistentRoom | null>;
  getMyMembership(roomId: string, userId: string): Promise<PersistentRoomMember | null>;
  listMyRooms(userId: string): Promise<PersistentRoom[]>;
  listPublicRooms(): Promise<PublicRoomSummary[]>;
  listMembers(roomId: string): Promise<PersistentRoomMember[]>;
  getProject(roomId: string): Promise<PersistentProject | null>;
  rotateInvite(roomId: string): Promise<RotateRoomInviteResult>;
  updateRoomSettings(input: UpdateRoomSettingsRequest): Promise<void>;
  transferOwnership(roomId: string, nextOwnerId: string): Promise<void>;
  leaveRoom(roomId: string): Promise<void>;
}

export interface ProjectSummary {
  id: string;
  name: string;
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
