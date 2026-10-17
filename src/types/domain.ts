export type RoomVisibility = 'public' | 'private';
export type RoomStatus = 'open' | 'archived';
export type RoomMemberRole = 'owner' | 'member';

export interface PersistentRoom {
  id: string;
  name: string;
  description: string;
  visibility: RoomVisibility;
  targetLanguage: string;
  status: RoomStatus;
  maxMembers: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentRoomMember {
  roomId: string;
  userId: string;
  displayName: string;
  role: RoomMemberRole;
  joinedAt: string;
  online: boolean;
}

export interface PersistentProject {
  id: string;
  roomId: string;
  title: string;
  updatedAt: string;
}

export interface PublicRoomSummary {
  id: string;
  name: string;
  description: string;
  targetLanguage: string;
  memberCount: number;
  maxMembers: number | null;
  createdAt: string;
}

export interface DemoRoom {
  id: string;
  code: string;
  name: string;
  creator: string;
  visibility: RoomVisibility;
  targetLanguage: string;
  sceneTitle: string;
  participants: Participant[];
  updatedLabel: string;
}

export interface Participant {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: 'host' | 'voice actor';
}

export interface DialogueClip {
  id: string;
  character: string;
  initials: string;
  start: number;
  duration: number;
  transcript: string;
  color: string;
}
