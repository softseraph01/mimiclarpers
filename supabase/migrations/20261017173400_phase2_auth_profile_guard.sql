-- Non-destructive refinement for the Phase 2 foundation.
-- This changes one equivalent RLS expression and the signup trigger's handling of short metadata.
-- It does not alter existing profile rows, room data, privileges, or unrelated Supabase objects.

alter policy profiles_update_self on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function private.handle_new_auth_user()
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
  v_email_name := nullif(pg_catalog.btrim(pg_catalog.split_part(coalesce(new.email, ''), '@', 1)), '');

  if v_display_name is null or pg_catalog.char_length(v_display_name) < 2 then
    v_display_name := v_email_name;
  end if;
  if v_display_name is null or pg_catalog.char_length(v_display_name) < 2 then
    v_display_name := 'New collaborator';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, pg_catalog.left(v_display_name, 48))
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
