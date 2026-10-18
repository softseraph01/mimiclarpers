-- Host-only room deletion is a reversible archive operation. It removes the room
-- from active listings and revokes its invitation without cascading project/media data.
create or replace function public.delete_room(p_room_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_status public.room_status;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to delete a room.' using errcode = '42501';
  end if;

  select room_row.owner_id, room_row.status
    into v_owner_id, v_status
    from public.rooms as room_row
    where room_row.id = p_room_id
    for update;

  if not found then
    raise exception 'This room is not available.' using errcode = 'P0001';
  end if;
  if v_owner_id <> v_user_id then
    raise exception 'Only the room host can delete this room.' using errcode = '42501';
  end if;
  if v_status = 'archived' then
    return;
  end if;

  update public.rooms
    set status = 'archived', invite_code_hash = null, invite_expires_at = null
    where id = p_room_id;
end;
$$;
revoke all on function public.delete_room(uuid) from public, anon, authenticated;
grant execute on function public.delete_room(uuid) to authenticated;
notify pgrst, 'reload schema';
