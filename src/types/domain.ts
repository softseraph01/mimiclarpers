export type RoomVisibility = 'public' | 'private';

export interface Participant {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: 'host' | 'voice actor';
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

export interface DialogueClip {
  id: string;
  character: string;
  initials: string;
  start: number;
  duration: number;
  transcript: string;
  color: string;
}
