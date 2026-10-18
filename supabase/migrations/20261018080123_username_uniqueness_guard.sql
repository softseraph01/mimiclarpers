-- Preserve the existing profiles schema and RLS while preventing new duplicate usernames.
-- The existing display_name column is DUBROOM's username field.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.profiles as profile_row
    where pg_catalog.lower(pg_catalog.btrim(profile_row.display_name)) =
          pg_catalog.lower(pg_catalog.btrim(coalesce(p_username, '')))
  );
$$;
revoke all on function public.is_username_available(text) from public, anon, authenticated;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function private.enforce_unique_profile_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.profiles as profile_row
    where profile_row.id <> new.id
      and pg_catalog.lower(pg_catalog.btrim(profile_row.display_name)) =
          pg_catalog.lower(pg_catalog.btrim(new.display_name))
  ) then
    raise exception 'Username is already in use.' using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_unique_profile_username() from public, anon, authenticated;

drop trigger if exists profiles_enforce_unique_username on public.profiles;
create trigger profiles_enforce_unique_username
before insert or update of display_name on public.profiles
for each row execute function private.enforce_unique_profile_username();
