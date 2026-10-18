-- DUBROOM Phase 3 persistent studio foundation.
-- Additive only: private media metadata, versioned clip rows, editor state, and a private bucket.
-- Existing rooms, memberships, auth, and RLS policies are preserved.

create table public.project_media_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete restrict,
  kind text not null check (kind in ('scene', 'audio', 'export')),
  object_path text not null unique,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  content_type text not null check (char_length(btrim(content_type)) between 1 and 128),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  duration_seconds numeric(12,3) not null default 0 check (duration_seconds >= 0),
  upload_status text not null default 'uploading' check (upload_status in ('uploading', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_media_assets_project_idx on public.project_media_assets (project_id, kind, created_at desc);
create index project_media_assets_room_idx on public.project_media_assets (room_id, created_at desc);

create table public.project_editor_state (
  project_id uuid primary key references public.projects (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  scene_asset_id uuid null references public.project_media_assets (id) on delete set null,
  playback_position_seconds numeric(12,3) not null default 0 check (playback_position_seconds >= 0),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.timeline_clips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  media_asset_id uuid not null references public.project_media_assets (id) on delete restrict,
  track_user_id uuid not null references auth.users (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete restrict,
  label text not null check (char_length(btrim(label)) between 1 and 128),
  start_seconds numeric(12,3) not null default 0 check (start_seconds >= 0),
  source_offset_seconds numeric(12,3) not null default 0 check (source_offset_seconds >= 0),
  duration_seconds numeric(12,3) not null check (duration_seconds > 0),
  segment_index integer not null default 0 check (segment_index >= 0),
  sort_order integer not null default 0,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index timeline_clips_project_order_idx on public.timeline_clips (project_id, start_seconds, sort_order, created_at);
create index timeline_clips_track_idx on public.timeline_clips (project_id, track_user_id, start_seconds);

create function private.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects as project_row
    where project_row.id = p_project_id
      and private.is_room_member(project_row.room_id)
  );
$$;
revoke all on function private.can_access_project(uuid) from public, anon, authenticated;
grant execute on function private.can_access_project(uuid) to authenticated;

create function private.can_edit_clip(p_clip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.timeline_clips as clip_row
    where clip_row.id = p_clip_id
      and clip_row.created_by = auth.uid()
      and private.is_room_member(clip_row.room_id)
  );
$$;
revoke all on function private.can_edit_clip(uuid) from public, anon, authenticated;
grant execute on function private.can_edit_clip(uuid) to authenticated;

alter table public.project_media_assets enable row level security;
alter table public.project_editor_state enable row level security;
alter table public.timeline_clips enable row level security;
revoke all on table public.project_media_assets from public, anon, authenticated;
revoke all on table public.project_editor_state from public, anon, authenticated;
revoke all on table public.timeline_clips from public, anon, authenticated;
grant select on public.project_media_assets to authenticated;
grant insert, update, delete on public.project_media_assets to authenticated;
grant select, insert, update on public.project_editor_state to authenticated;
grant select on public.timeline_clips to authenticated;
grant insert, update, delete on public.timeline_clips to authenticated;

create policy project_media_assets_select_members
  on public.project_media_assets for select to authenticated
  using (private.is_room_member(room_id));
create policy project_media_assets_insert_member_uploader
  on public.project_media_assets for insert to authenticated
  with check (uploaded_by = auth.uid() and private.is_room_member(room_id) and private.can_access_project(project_id));
create policy project_media_assets_update_uploader
  on public.project_media_assets for update to authenticated
  using (uploaded_by = auth.uid() and private.is_room_member(room_id))
  with check (uploaded_by = auth.uid() and private.is_room_member(room_id));
create policy project_media_assets_delete_uploader
  on public.project_media_assets for delete to authenticated
  using (uploaded_by = auth.uid() and private.is_room_member(room_id));

create policy project_editor_state_select_members
  on public.project_editor_state for select to authenticated
  using (private.is_room_member(room_id));
create policy project_editor_state_insert_member
  on public.project_editor_state for insert to authenticated
  with check (updated_by = auth.uid() and private.is_room_member(room_id) and private.can_access_project(project_id));
create policy project_editor_state_update_member
  on public.project_editor_state for update to authenticated
  using (private.is_room_member(room_id))
  with check (updated_by = auth.uid() and private.is_room_member(room_id));

create policy timeline_clips_select_members
  on public.timeline_clips for select to authenticated
  using (private.is_room_member(room_id));
create policy timeline_clips_insert_creator
  on public.timeline_clips for insert to authenticated
  with check (created_by = auth.uid() and track_user_id = auth.uid() and private.is_room_member(room_id) and private.can_access_project(project_id));
create policy timeline_clips_update_creator
  on public.timeline_clips for update to authenticated
  using (private.can_edit_clip(id))
  with check (private.can_edit_clip(id));
create policy timeline_clips_delete_creator
  on public.timeline_clips for delete to authenticated
  using (private.can_edit_clip(id));

insert into storage.buckets (id, name, public)
values ('dubroom-media', 'dubroom-media', false)
on conflict (id) do nothing;

create policy dubroom_media_select_members
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dubroom-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and private.can_access_project(((storage.foldername(name))[1])::uuid)
  );
create policy dubroom_media_insert_members
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dubroom-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and private.can_access_project(((storage.foldername(name))[1])::uuid)
  );
create policy dubroom_media_update_owner
  on storage.objects for update to authenticated
  using (bucket_id = 'dubroom-media' and owner_id::uuid = auth.uid())
  with check (bucket_id = 'dubroom-media' and owner_id::uuid = auth.uid());
create policy dubroom_media_delete_owner
  on storage.objects for delete to authenticated
  using (bucket_id = 'dubroom-media' and owner_id::uuid = auth.uid());

create trigger project_media_assets_updated_at
  before update on public.project_media_assets
  for each row execute function private.set_updated_at();
create trigger project_editor_state_updated_at
  before update on public.project_editor_state
  for each row execute function private.set_updated_at();
create trigger timeline_clips_updated_at
  before update on public.timeline_clips
  for each row execute function private.set_updated_at();

notify pgrst, 'reload schema';
