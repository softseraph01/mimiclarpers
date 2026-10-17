-- MIMICLARPERS / DUBROOM Phase 2 foundation.
-- Additive only: this project was inspected before this migration and has no public tables.
-- No audio, recording, storage, timeline-collaboration, or export schema is created here.

create schema private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated;

create type public.room_visibility as enum ('public', 'private');
create type public.room_member_role as enum ('owner', 'member');
create type public.room_status as enum ('open', 'archived');
grant usage on type public.room_visibility, public.room_member_role, public.room_status to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 48),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 3 and 64),
  description text not null default '' check (char_length(description) <= 280),
  visibility public.room_visibility not null,
  invite_code_hash bytea unique,
  invite_expires_at timestamptz,
  target_language text not null check (char_length(btrim(target_language)) between 2 and 48),
  status public.room_status not null default 'open',
  max_members integer check (max_members is null or max_members >= 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_invite_visibility_consistency check (
    (visibility = 'private' and (
      (invite_code_hash is null and invite_expires_at is null)
      or (invite_code_hash is not null and invite_expires_at is not null
          and pg_catalog.octet_length(invite_code_hash) = 32)
    ))
    or (visibility = 'public' and invite_code_hash is null and invite_expires_at is null)
  )
);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.room_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create unique index room_members_one_owner_per_room_idx
  on public.room_members (room_id)
  where role = 'owner';

create table public.projects (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  room_id uuid not null unique references public.rooms (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 64),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rooms_public_open_created_idx
  on public.rooms (created_at desc)
  where visibility = 'public' and status = 'open';
create index rooms_owner_id_idx on public.rooms (owner_id);
create index room_members_user_joined_idx on public.room_members (user_id, joined_at desc);
create index projects_owner_id_idx on public.projects (owner_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function private.set_updated_at();
create trigger projects_set_updated_at
before update on public.projects
for each row execute function private.set_updated_at();

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_email_name text;
begin
  v_display_name := nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_email_name := nullif(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), '');
  v_display_name := coalesce(v_display_name, v_email_name, 'New collaborator');

  insert into public.profiles (id, display_name)
  values (new.id, pg_catalog.left(v_display_name, 48))
  on conflict (id) do nothing;

  return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create function private.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members as member_row
    where member_row.room_id = p_room_id
      and member_row.user_id = auth.uid()
  );
$$;

create function private.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id = auth.uid()
    or exists (
      select 1
      from public.room_members as viewer_member
      join public.room_members as target_member
        on target_member.room_id = viewer_member.room_id
      where viewer_member.user_id = auth.uid()
        and target_member.user_id = p_profile_id
    );
$$;

create function private.can_access_presence_topic(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members as member_row
    where member_row.user_id = auth.uid()
      and p_topic = 'room-presence:' || member_row.room_id::text
  );
$$;

revoke all on function private.is_room_member(uuid) from public, anon, authenticated;
revoke all on function private.can_view_profile(uuid) from public, anon, authenticated;
revoke all on function private.can_access_presence_topic(text) from public, anon, authenticated;
grant execute on function private.is_room_member(uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.can_access_presence_topic(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.projects enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.rooms from public, anon, authenticated;
revoke all on table public.room_members from public, anon, authenticated;
revoke all on table public.projects from public, anon, authenticated;

grant select (id, display_name, created_at, updated_at) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select (id, name, description, visibility, target_language, status, max_members, created_at, updated_at)
  on public.rooms to anon;
grant select (id, owner_id, name, description, visibility, target_language, status, max_members, created_at, updated_at)
  on public.rooms to authenticated;
grant select (room_id, user_id, role, joined_at) on public.room_members to authenticated;
grant select (id, room_id, owner_id, title, metadata, created_at, updated_at) on public.projects to authenticated;

create policy profiles_select_self_or_roommate
  on public.profiles for select to authenticated
  using (private.can_view_profile(id));
create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy rooms_select_public_open_for_anon
  on public.rooms for select to anon
  using (visibility = 'public' and status = 'open');
create policy rooms_select_public_or_member
  on public.rooms for select to authenticated
  using ((visibility = 'public' and status = 'open') or private.is_room_member(id));

create policy room_members_select_room_members
  on public.room_members for select to authenticated
  using (private.is_room_member(room_id));

create policy projects_select_room_members
  on public.projects for select to authenticated
  using (private.is_room_member(room_id));

create function public.list_public_rooms()
returns table (
  room_id uuid,
  name text,
  description text,
  target_language text,
  member_count bigint,
  max_members integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select room_row.id,
         room_row.name,
         room_row.description,
         room_row.target_language,
         pg_catalog.count(member_row.user_id) as member_count,
         room_row.max_members,
         room_row.created_at
  from public.rooms as room_row
  left join public.room_members as member_row on member_row.room_id = room_row.id
  where room_row.visibility = 'public'
    and room_row.status = 'open'
  group by room_row.id
  order by room_row.created_at desc
  limit 100;
$$;
revoke all on function public.list_public_rooms() from public, anon, authenticated;
grant execute on function public.list_public_rooms() to anon, authenticated;

create function public.create_room(
  p_name text,
  p_description text,
  p_visibility public.room_visibility,
  p_target_language text,
  p_max_members integer default null
)
returns table (
  room_id uuid,
  project_id uuid,
  invite_code text,
  invite_expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid := pg_catalog.gen_random_uuid();
  v_project_id uuid := pg_catalog.gen_random_uuid();
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_description text := pg_catalog.btrim(coalesce(p_description, ''));
  v_language text := pg_catalog.btrim(coalesce(p_target_language, ''));
  v_code text;
  v_hash bytea;
  v_expires timestamptz;
  v_attempt integer;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to create a room.' using errcode = '42501';
  end if;
  if pg_catalog.char_length(v_name) < 3 or pg_catalog.char_length(v_name) > 64 then
    raise exception 'Room name must be between 3 and 64 characters.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_description) > 280 then
    raise exception 'Room description must be 280 characters or fewer.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_language) < 2 or pg_catalog.char_length(v_language) > 48 then
    raise exception 'Target language must be between 2 and 48 characters.' using errcode = '22023';
  end if;
  if p_visibility is null then
    raise exception 'Choose public or private room visibility.' using errcode = '22023';
  end if;
  if p_max_members is not null and p_max_members < 2 then
    raise exception 'A room capacity must be at least 2, including its owner.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles as profile_row where profile_row.id = v_user_id) then
    raise exception 'Your profile is still being prepared. Refresh and try again.' using errcode = 'P0001';
  end if;

  if p_visibility = 'private' then
    for v_attempt in 1..5 loop
      v_code := pg_catalog.upper(pg_catalog.encode(extensions.gen_random_bytes(24), 'hex'));
      v_hash := extensions.digest(pg_catalog.convert_to(v_code, 'UTF8'), 'sha256');
      exit when not exists (
        select 1 from public.rooms as existing_room where existing_room.invite_code_hash = v_hash
      );
    end loop;
    if v_code is null or exists (
      select 1 from public.rooms as existing_room where existing_room.invite_code_hash = v_hash
    ) then
      raise exception 'Could not create a unique room invitation. Try again.' using errcode = '23505';
    end if;
    v_expires := pg_catalog.now() + interval '7 days';
  end if;

  insert into public.rooms (
    id, owner_id, name, description, visibility, invite_code_hash, invite_expires_at,
    target_language, max_members
  ) values (
    v_room_id, v_user_id, v_name, v_description, p_visibility, v_hash, v_expires,
    v_language, p_max_members
  );

  insert into public.room_members (room_id, user_id, role)
  values (v_room_id, v_user_id, 'owner');

  insert into public.projects (id, room_id, owner_id, title)
  values (v_project_id, v_room_id, v_user_id, v_name);

  return query select v_room_id, v_project_id, v_code, v_expires;
end;
$$;
revoke all on function public.create_room(text, text, public.room_visibility, text, integer) from public, anon, authenticated;
grant execute on function public.create_room(text, text, public.room_visibility, text, integer) to authenticated;

create function public.join_public_room(p_room_id uuid)
returns table (room_id uuid, already_member boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_visibility public.room_visibility;
  v_status public.room_status;
  v_capacity integer;
  v_member_count bigint;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to join a room.' using errcode = '42501';
  end if;

  select room_row.visibility, room_row.status, room_row.max_members
    into v_visibility, v_status, v_capacity
    from public.rooms as room_row
    where room_row.id = p_room_id
    for update;
  if not found or v_visibility <> 'public' or v_status <> 'open' then
    raise exception 'This public room is not available.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.room_members as member_row
    where member_row.room_id = p_room_id and member_row.user_id = v_user_id
  ) then
    return query select p_room_id, true;
    return;
  end if;

  select pg_catalog.count(*) into v_member_count
    from public.room_members as member_row where member_row.room_id = p_room_id;
  if v_capacity is not null and v_member_count >= v_capacity then
    raise exception 'This room has reached its member limit.' using errcode = 'P0001';
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (p_room_id, v_user_id, 'member');
  return query select p_room_id, false;
end;
$$;
revoke all on function public.join_public_room(uuid) from public, anon, authenticated;
grant execute on function public.join_public_room(uuid) to authenticated;

create function public.join_private_room(p_invite_code text)
returns table (room_id uuid, already_member boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_invite_code, '')));
  v_hash bytea;
  v_room_id uuid;
  v_status public.room_status;
  v_capacity integer;
  v_member_count bigint;
  v_expires timestamptz;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to join a private room.' using errcode = '42501';
  end if;
  if pg_catalog.char_length(v_code) <> 48 or v_code !~ '^[0-9A-F]{48}$' then
    raise exception 'This invitation is invalid or expired.' using errcode = 'P0001';
  end if;

  v_hash := extensions.digest(pg_catalog.convert_to(v_code, 'UTF8'), 'sha256');
  select room_row.id, room_row.status, room_row.max_members, room_row.invite_expires_at
    into v_room_id, v_status, v_capacity, v_expires
    from public.rooms as room_row
    where room_row.visibility = 'private'
      and room_row.invite_code_hash = v_hash
    for update;
  if not found or v_expires is null or v_expires <= pg_catalog.now() or v_status <> 'open' then
    raise exception 'This invitation is invalid or expired.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.room_members as member_row
    where member_row.room_id = v_room_id and member_row.user_id = v_user_id
  ) then
    return query select v_room_id, true;
    return;
  end if;

  select pg_catalog.count(*) into v_member_count
    from public.room_members as member_row where member_row.room_id = v_room_id;
  if v_capacity is not null and v_member_count >= v_capacity then
    raise exception 'This room has reached its member limit.' using errcode = 'P0001';
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (v_room_id, v_user_id, 'member');
  return query select v_room_id, false;
end;
$$;
revoke all on function public.join_private_room(text) from public, anon, authenticated;
grant execute on function public.join_private_room(text) to authenticated;

create function public.rotate_room_invite(p_room_id uuid)
returns table (invite_code text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_visibility public.room_visibility;
  v_code text;
  v_hash bytea;
  v_expires timestamptz := pg_catalog.now() + interval '7 days';
  v_attempt integer;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to manage room invitations.' using errcode = '42501';
  end if;

  select room_row.owner_id, room_row.visibility
    into v_owner_id, v_visibility
    from public.rooms as room_row where room_row.id = p_room_id for update;
  if not found or v_owner_id <> v_user_id then
    raise exception 'Only the room owner can manage invitations.' using errcode = '42501';
  end if;
  if v_visibility <> 'private' then
    raise exception 'Public rooms do not use private invitations.' using errcode = '22023';
  end if;

  for v_attempt in 1..5 loop
    v_code := pg_catalog.upper(pg_catalog.encode(extensions.gen_random_bytes(24), 'hex'));
    v_hash := extensions.digest(pg_catalog.convert_to(v_code, 'UTF8'), 'sha256');
    exit when not exists (
      select 1 from public.rooms as existing_room
      where existing_room.invite_code_hash = v_hash and existing_room.id <> p_room_id
    );
  end loop;
  if v_code is null or exists (
    select 1 from public.rooms as existing_room
    where existing_room.invite_code_hash = v_hash and existing_room.id <> p_room_id
  ) then
    raise exception 'Could not create a unique invitation. Try again.' using errcode = '23505';
  end if;

  update public.rooms
    set invite_code_hash = v_hash, invite_expires_at = v_expires
    where id = p_room_id;
  return query select v_code, v_expires;
end;
$$;
revoke all on function public.rotate_room_invite(uuid) from public, anon, authenticated;
grant execute on function public.rotate_room_invite(uuid) to authenticated;

create function public.update_room_settings(
  p_room_id uuid,
  p_name text,
  p_description text,
  p_target_language text,
  p_max_members integer
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_description text := pg_catalog.btrim(coalesce(p_description, ''));
  v_language text := pg_catalog.btrim(coalesce(p_target_language, ''));
  v_member_count bigint;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to update a room.' using errcode = '42501';
  end if;
  select room_row.owner_id into v_owner_id
    from public.rooms as room_row where room_row.id = p_room_id for update;
  if not found or v_owner_id <> v_user_id then
    raise exception 'Only the room owner can update room details.' using errcode = '42501';
  end if;
  if pg_catalog.char_length(v_name) < 3 or pg_catalog.char_length(v_name) > 64 then
    raise exception 'Room name must be between 3 and 64 characters.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_description) > 280 then
    raise exception 'Room description must be 280 characters or fewer.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_language) < 2 or pg_catalog.char_length(v_language) > 48 then
    raise exception 'Target language must be between 2 and 48 characters.' using errcode = '22023';
  end if;
  if p_max_members is not null and p_max_members < 2 then
    raise exception 'A room capacity must be at least 2, including its owner.' using errcode = '22023';
  end if;

  select pg_catalog.count(*) into v_member_count
    from public.room_members as member_row where member_row.room_id = p_room_id;
  if p_max_members is not null and p_max_members < v_member_count then
    raise exception 'The member limit cannot be lower than the current member count.' using errcode = '22023';
  end if;

  update public.rooms
    set name = v_name,
        description = v_description,
        target_language = v_language,
        max_members = p_max_members
    where id = p_room_id;
  update public.projects
    set title = v_name
    where room_id = p_room_id;
end;
$$;
revoke all on function public.update_room_settings(uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.update_room_settings(uuid, text, text, text, integer) to authenticated;

create function public.transfer_room_ownership(p_room_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to transfer room ownership.' using errcode = '42501';
  end if;
  select room_row.owner_id into v_owner_id
    from public.rooms as room_row where room_row.id = p_room_id for update;
  if not found or v_owner_id <> v_user_id then
    raise exception 'Only the current owner can transfer room ownership.' using errcode = '42501';
  end if;
  if p_new_owner_id = v_user_id then
    return;
  end if;
  if not exists (
    select 1 from public.room_members as member_row
    where member_row.room_id = p_room_id and member_row.user_id = p_new_owner_id
  ) then
    raise exception 'The new owner must already be a room member.' using errcode = '22023';
  end if;

  update public.room_members set role = 'member'
    where room_id = p_room_id and user_id = v_user_id and role = 'owner';
  update public.room_members set role = 'owner'
    where room_id = p_room_id and user_id = p_new_owner_id;
  update public.rooms set owner_id = p_new_owner_id where id = p_room_id;
  update public.projects set owner_id = p_new_owner_id where room_id = p_room_id;
end;
$$;
revoke all on function public.transfer_room_ownership(uuid, uuid) from public, anon, authenticated;
grant execute on function public.transfer_room_ownership(uuid, uuid) to authenticated;

create function public.leave_room(p_room_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_next_owner_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to leave a room.' using errcode = '42501';
  end if;
  select room_row.owner_id into v_owner_id
    from public.rooms as room_row where room_row.id = p_room_id for update;
  if not found then
    raise exception 'This room is not available.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.room_members as member_row
    where member_row.room_id = p_room_id and member_row.user_id = v_user_id
  ) then
    return;
  end if;

  if v_owner_id = v_user_id then
    select member_row.user_id into v_next_owner_id
      from public.room_members as member_row
      where member_row.room_id = p_room_id and member_row.user_id <> v_user_id
      order by member_row.joined_at, member_row.user_id
      limit 1;
    if v_next_owner_id is null then
      raise exception 'Invite another member before leaving so the room keeps an owner.' using errcode = 'P0001';
    end if;
    update public.room_members set role = 'member'
      where room_id = p_room_id and user_id = v_user_id and role = 'owner';
    update public.room_members set role = 'owner'
      where room_id = p_room_id and user_id = v_next_owner_id;
    update public.rooms set owner_id = v_next_owner_id where id = p_room_id;
    update public.projects set owner_id = v_next_owner_id where room_id = p_room_id;
  end if;

  delete from public.room_members
    where room_id = p_room_id and user_id = v_user_id;
end;
$$;
revoke all on function public.leave_room(uuid) from public, anon, authenticated;
grant execute on function public.leave_room(uuid) to authenticated;

-- Supabase already enables RLS on realtime.messages and locks down the realtime schema.
-- Do not alter its RLS setting or create functions/tables in that schema.
create policy room_members_can_read_presence
  on realtime.messages for select to authenticated
  using (
    extension = 'presence'
    and private.can_access_presence_topic((select realtime.topic()))
  );
create policy room_members_can_track_presence
  on realtime.messages for insert to authenticated
  with check (
    extension = 'presence'
    and private.can_access_presence_topic((select realtime.topic()))
  );

notify pgrst, 'reload schema';
