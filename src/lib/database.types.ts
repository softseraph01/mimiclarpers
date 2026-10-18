import type { RoomMemberRole, RoomStatus, RoomVisibility } from '../types/domain';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; created_at: string; updated_at: string };
        Insert: { id: string; display_name: string; created_at?: string; updated_at?: string };
        Update: { display_name?: string; updated_at?: string };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string;
          visibility: RoomVisibility;
          invite_code_hash: string | null;
          invite_expires_at: string | null;
          target_language: string;
          status: RoomStatus;
          max_members: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string;
          visibility: RoomVisibility;
          invite_code_hash?: string | null;
          invite_expires_at?: string | null;
          target_language: string;
          status?: RoomStatus;
          max_members?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          target_language?: string;
          status?: RoomStatus;
          max_members?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: { room_id: string; user_id: string; role: RoomMemberRole; joined_at: string };
        Insert: { room_id: string; user_id: string; role?: RoomMemberRole; joined_at?: string };
        Update: { role?: RoomMemberRole };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          room_id: string;
          owner_id: string;
          title: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          owner_id: string;
          title: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: { owner_id?: string; title?: string; metadata?: Json; updated_at?: string };
        Relationships: [];
      };
      project_media_assets: {
        Row: {
          id: string;
          project_id: string;
          room_id: string;
          uploaded_by: string;
          kind: 'scene' | 'audio' | 'export';
          object_path: string;
          file_name: string;
          content_type: string;
          size_bytes: number;
          duration_seconds: number;
          upload_status: 'uploading' | 'ready' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          room_id: string;
          uploaded_by: string;
          kind: 'scene' | 'audio' | 'export';
          object_path: string;
          file_name: string;
          content_type: string;
          size_bytes?: number;
          duration_seconds?: number;
          upload_status?: 'uploading' | 'ready' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['project_media_assets']['Insert'], 'project_id' | 'room_id' | 'uploaded_by' | 'kind'>>;
        Relationships: [];
      };
      project_editor_state: {
        Row: { project_id: string; room_id: string; scene_asset_id: string | null; playback_position_seconds: number; revision: number; updated_by: string; updated_at: string };
        Insert: { project_id: string; room_id: string; scene_asset_id?: string | null; playback_position_seconds?: number; revision?: number; updated_by: string; updated_at?: string };
        Update: { scene_asset_id?: string | null; playback_position_seconds?: number; revision?: number; updated_by?: string; updated_at?: string };
        Relationships: [];
      };
      timeline_clips: {
        Row: { id: string; project_id: string; room_id: string; media_asset_id: string; track_user_id: string; created_by: string; label: string; start_seconds: number; source_offset_seconds: number; duration_seconds: number; segment_index: number; sort_order: number; revision: number; created_at: string; updated_at: string };
        Insert: { id?: string; project_id: string; room_id: string; media_asset_id: string; track_user_id: string; created_by: string; label: string; start_seconds?: number; source_offset_seconds?: number; duration_seconds: number; segment_index?: number; sort_order?: number; revision?: number; created_at?: string; updated_at?: string };
        Update: { label?: string; start_seconds?: number; source_offset_seconds?: number; duration_seconds?: number; segment_index?: number; sort_order?: number; revision?: number; updated_at?: string };
        Relationships: [];
      };
      room_presence: {
        Row: { room_id: string; user_id: string; connection_id: string; last_seen_at: string };
        Insert: { room_id: string; user_id: string; connection_id: string; last_seen_at?: string };
        Update: { last_seen_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      list_public_rooms: {
        Args: Record<PropertyKey, never>;
        Returns: {
          room_id: string;
          name: string;
          description: string;
          target_language: string;
          member_count: number;
          max_members: number | null;
          created_at: string;
        }[];
      };
      is_username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      create_room: {
        Args: {
          p_name: string;
          p_description: string;
          p_visibility: RoomVisibility;
          p_target_language: string;
          p_max_members?: number | null;
        };
        Returns: { room_id: string; project_id: string; invite_code: string | null; invite_expires_at: string | null }[];
      };
      join_public_room: {
        Args: { p_room_id: string };
        Returns: { room_id: string; already_member: boolean }[];
      };
      join_private_room: {
        Args: { p_invite_code: string };
        Returns: { room_id: string; already_member: boolean }[];
      };
      rotate_room_invite: {
        Args: { p_room_id: string };
        Returns: { invite_code: string; expires_at: string }[];
      };
      update_room_settings: {
        Args: { p_room_id: string; p_name: string; p_description: string; p_target_language: string; p_max_members: number | null };
        Returns: undefined;
      };
      transfer_room_ownership: {
        Args: { p_room_id: string; p_new_owner_id: string };
        Returns: undefined;
      };
      leave_room: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      set_room_presence: {
        Args: { p_room_id: string; p_connection_id: string };
        Returns: undefined;
      };
      clear_room_presence: {
        Args: { p_room_id: string; p_connection_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      room_visibility: RoomVisibility;
      room_member_role: RoomMemberRole;
      room_status: RoomStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
