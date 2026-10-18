import { supabase } from '../lib/supabase';
import type { PersistentProject, PersistentRoom, PersistentRoomMember, PublicRoomSummary, RoomMemberRole, RoomStatus, RoomVisibility } from '../types/domain';
import type {
  CollaborativeRoomService,
  CreatePersistentRoomRequest,
  CreatePersistentRoomResult,
  JoinRoomResult,
  RotateRoomInviteResult,
  UpdateRoomSettingsRequest,
} from './contracts';

type RoomRow = {
  id: string;
  name: string;
  description: string;
  visibility: RoomVisibility;
  target_language: string;
  status: RoomStatus;
  max_members: number | null;
  created_at: string;
  updated_at: string;
};

function getClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
}

function mapRoom(row: RoomRow): PersistentRoom {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    targetLanguage: row.target_language,
    status: row.status,
    maxMembers: row.max_members,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireRpcRow<T>(rows: T[] | null, message: string): T {
  const row = rows?.[0];
  if (!row) throw new Error(message);
  return row;
}

const roomColumns = 'id, name, description, visibility, target_language, status, max_members, created_at, updated_at' as const;

export const supabaseRoomService: CollaborativeRoomService = {
  async createRoom(input: CreatePersistentRoomRequest): Promise<CreatePersistentRoomResult> {
    const client = getClient();
    const { data, error } = await client.rpc('create_room', {
      p_name: input.name.trim(),
      p_description: input.description.trim(),
      p_visibility: input.visibility,
      p_target_language: input.targetLanguage.trim(),
      p_max_members: input.maxMembers,
    });
    if (error) throw error;
    const created = requireRpcRow(data, 'The room was not created. Please try again.');
    const room = await this.getRoom(created.room_id);
    if (!room) throw new Error('The room was created, but could not be loaded. Refresh your workspace.');
    return {
      room,
      projectId: created.project_id,
      inviteCode: created.invite_code,
      inviteExpiresAt: created.invite_expires_at,
    };
  },

  async joinPublicRoom(roomId: string): Promise<JoinRoomResult> {
    const { data, error } = await getClient().rpc('join_public_room', { p_room_id: roomId });
    if (error) throw error;
    const result = requireRpcRow(data, 'The room did not return a join confirmation.');
    return { roomId: result.room_id, alreadyMember: result.already_member };
  },

  async joinPrivateRoom(inviteCode: string): Promise<JoinRoomResult> {
    const normalized = inviteCode.trim().toUpperCase().replace(/\s+/g, '');
    const { data, error } = await getClient().rpc('join_private_room', { p_invite_code: normalized });
    if (error) throw error;
    const result = requireRpcRow(data, 'This invitation is invalid or expired.');
    return { roomId: result.room_id, alreadyMember: result.already_member };
  },

  async getRoom(roomId: string): Promise<PersistentRoom | null> {
    const { data, error } = await getClient().from('rooms').select(roomColumns).eq('id', roomId).maybeSingle();
    if (error) throw error;
    return data ? mapRoom(data) : null;
  },

  async getMyMembership(roomId: string, userId: string): Promise<PersistentRoomMember | null> {
    const client = getClient();
    const { data, error } = await client
      .from('room_members')
      .select('room_id, user_id, role, joined_at')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('display_name')
      .eq('id', data.user_id)
      .maybeSingle();
    if (profileError) throw profileError;
    return {
      roomId: data.room_id,
      userId: data.user_id,
      displayName: profile?.display_name ?? 'Collaborator',
      role: data.role as RoomMemberRole,
      joinedAt: data.joined_at,
      online: false,
    };
  },

  async listMyRooms(userId: string): Promise<PersistentRoom[]> {
    const client = getClient();
    const { data: memberships, error: membershipError } = await client
      .from('room_members')
      .select('room_id')
      .eq('user_id', userId);
    if (membershipError) throw membershipError;
    const ids = (memberships ?? []).map((membership) => membership.room_id);
    if (ids.length === 0) return [];
    const { data, error } = await client.from('rooms').select(roomColumns).in('id', ids).eq('status', 'open').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRoom);
  },

  async listPublicRooms(): Promise<PublicRoomSummary[]> {
    const { data, error } = await getClient().rpc('list_public_rooms');
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.room_id,
      name: row.name,
      description: row.description,
      targetLanguage: row.target_language,
      memberCount: Number(row.member_count),
      maxMembers: row.max_members,
      createdAt: row.created_at,
    }));
  },

  async listMembers(roomId: string): Promise<PersistentRoomMember[]> {
    const client = getClient();
    const { data: rows, error } = await client
      .from('room_members')
      .select('room_id, user_id, role, joined_at')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    if (!rows?.length) return [];
    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    if (profilesError) throw profilesError;
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
    return rows.map((row) => ({
      roomId: row.room_id,
      userId: row.user_id,
      displayName: names.get(row.user_id) ?? 'Collaborator',
      role: row.role as RoomMemberRole,
      joinedAt: row.joined_at,
      online: false,
    }));
  },

  async getProject(roomId: string): Promise<PersistentProject | null> {
    const { data, error } = await getClient()
      .from('projects')
      .select('id, room_id, title, updated_at')
      .eq('room_id', roomId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id: data.id, roomId: data.room_id, title: data.title, updatedAt: data.updated_at };
  },

  async rotateInvite(roomId: string): Promise<RotateRoomInviteResult> {
    const { data, error } = await getClient().rpc('rotate_room_invite', { p_room_id: roomId });
    if (error) throw error;
    const result = requireRpcRow(data, 'The invitation could not be refreshed.');
    return { inviteCode: result.invite_code, expiresAt: result.expires_at };
  },

  async updateRoomSettings(input: UpdateRoomSettingsRequest): Promise<void> {
    const { error } = await getClient().rpc('update_room_settings', {
      p_room_id: input.roomId,
      p_name: input.name.trim(),
      p_description: input.description.trim(),
      p_target_language: input.targetLanguage.trim(),
      p_max_members: input.maxMembers,
    });
    if (error) throw error;
  },

  async transferOwnership(roomId: string, nextOwnerId: string): Promise<void> {
    const { error } = await getClient().rpc('transfer_room_ownership', { p_room_id: roomId, p_new_owner_id: nextOwnerId });
    if (error) throw error;
  },

  async leaveRoom(roomId: string): Promise<void> {
    const { error } = await getClient().rpc('leave_room', { p_room_id: roomId });
    if (error) throw error;
  },

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await getClient().rpc('delete_room', { p_room_id: roomId });
    if (error) throw error;
  },
};
