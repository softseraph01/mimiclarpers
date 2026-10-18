-- Phase 2 review hardening. Additive only: no existing rows are deleted or reset.
-- Presence uses short-lived, database-validated connection leases rather than trusting
-- identity values in a client-supplied Realtime Presence payload.

alter table public.rooms
  add constraint rooms_max_members_upper_bound_check
  check (max_members is null or max_members <= 500);

-- Owner identifiers are already represented for authorized members by room_members.
-- Keep them unavailable to direct room/project reads from authenticated clients.
revoke select (owner_id) on public.rooms from authenticated;
revoke select (owner_id) on public.projects from authenticated;

create table public.room_presence (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null,
  last_seen_at timestamptz not null default pg_catalog.now(),
  primary key (room_id, user_id, connection_id)
);
create index room_presence_active_by_room
  on public.room_presence (room_id, last_seen_at desc);

alter table public.room_presence enable row level security;
revoke all on table public.room_presence from public, anon, authenticated;
grant select (room_id, user_id, connection_id, last_seen_at)
  on public.room_presence to authenticated;

create policy room_presence_select_members
  on public.room_presence for select to authenticated
  using ((select private.is_room_member(room_id)));

create function public.set_room_presence(p_room_id uuid, p_connection_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in is required to report room presence.' using errcode = '42501';
  end if;
  if p_room_id is null or p_connection_id is null then
    raise exception 'A room and connection are required.' using errcode = '22023';
  end if;
  if not private.is_room_member(p_room_id) then
    raise exception 'Room membership is required.' using errcode = '42501';
  end if;

  -- Remove expired leases opportunistically; stale rows are already considered offline.
  delete from public.room_presence
    where room_id = p_room_id
      and last_seen_at < pg_catalog.now() - interval '2 minutes';

  insert into public.room_presence (room_id, user_id, connection_id, last_seen_at)
    values (p_room_id, v_user_id, p_connection_id, pg_catalog.now())
  on conflict (room_id, user_id, connection_id)
    do update set last_seen_at = excluded.last_seen_at;
end;
$$;

create function public.clear_room_presence(p_room_id uuid, p_connection_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in is required to clear room presence.' using errcode = '42501';
  end if;
  if p_room_id is null or p_connection_id is null then
    raise exception 'A room and connection are required.' using errcode = '22023';
  end if;

  -- Mark this connection offline, rather than deleting it, so subscribed members receive
  -- an RLS-authorized UPDATE event. Other tabs/connections for the same user are untouched.
  update public.room_presence
    set last_seen_at = pg_catalog.now() - interval '1 minute'
    where room_id = p_room_id
      and user_id = v_user_id
      and connection_id = p_connection_id;
end;
$$;

revoke all on function public.set_room_presence(uuid, uuid) from public, anon, authenticated;
revoke all on function public.clear_room_presence(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_room_presence(uuid, uuid) to authenticated;
grant execute on function public.clear_room_presence(uuid, uuid) to authenticated;

-- A room owner must explicitly transfer ownership before leaving. Do not silently
-- nominate the earliest member or leave a room/project with mismatched ownership.
create or replace function public.leave_room(p_room_id uuid)
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
    raise exception 'Sign in is required to leave a room.' using errcode = '42501';
  end if;
  select room_row.owner_id into v_owner_id
    from public.rooms as room_row
    where room_row.id = p_room_id
    for update;
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
    raise exception 'Transfer ownership to another room member before leaving.' using errcode = 'P0001';
  end if;

  update public.room_presence
    set last_seen_at = pg_catalog.now() - interval '1 minute'
    where room_id = p_room_id and user_id = v_user_id;
  delete from public.room_members
    where room_id = p_room_id and user_id = v_user_id;
end;
$$;
revoke all on function public.leave_room(uuid) from public, anon, authenticated;
grant execute on function public.leave_room(uuid) to authenticated;

-- The table is new, so it cannot already be in this default Supabase publication.
alter publication supabase_realtime add table public.room_presence;

notify pgrst, 'reload schema';
