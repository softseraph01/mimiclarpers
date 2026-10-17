import { seedRoom } from '../demo/seedData';
import type { CreateRoomRequest, RoomService } from './contracts';
import type { DemoRoom } from '../types/domain';

const rooms = new Map<string, DemoRoom>([[seedRoom.id, seedRoom]]);

function makeCode(): string {
  return `MIM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const localDemoRoomService: RoomService = {
  async createRoom(input: CreateRoomRequest): Promise<DemoRoom> {
    const name = input.name.trim();
    const creator = input.creator.trim();
    const targetLanguage = input.targetLanguage.trim();
    if (name.length < 3) throw new Error('Give the room a name of at least 3 characters.');
    if (creator.length < 2) throw new Error('Add a display name of at least 2 characters.');
    if (targetLanguage.length < 2) throw new Error('Choose or enter a target language.');

    const id = `local-${Math.random().toString(36).slice(2, 8)}`;
    const initials = creator.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    const room: DemoRoom = {
      id,
      code: makeCode(),
      name,
      creator,
      visibility: input.visibility,
      targetLanguage,
      sceneTitle: 'Untitled scene',
      updatedLabel: 'Created in this browser demo',
      participants: [{ id: `host-${id}`, name: creator, initials, color: 'cyan', role: 'host' }],
    };
    rooms.set(id, room);
    return room;
  },

  async joinRoom(code: string): Promise<DemoRoom> {
    const normalized = code.trim().toUpperCase();
    const room = [...rooms.values()].find((candidate) => candidate.code === normalized);
    if (!room) throw new Error('No local demo room matches that code. Room discovery needs the future backend.');
    return room;
  },

  async getRoom(roomId: string): Promise<DemoRoom | null> {
    return rooms.get(roomId) ?? null;
  },

  async listRooms(): Promise<DemoRoom[]> {
    return [...rooms.values()].reverse();
  },
};
