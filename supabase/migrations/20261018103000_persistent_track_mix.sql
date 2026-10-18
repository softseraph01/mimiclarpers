-- DUBROOM bug-fix migration: persist per-track mute and volume in the project editor state.
-- Additive and backwards-compatible: existing rows receive an empty object and remain valid.
alter table public.project_editor_state
  add column if not exists track_mix jsonb not null default '{}'::jsonb;

alter table public.project_editor_state
  drop constraint if exists project_editor_state_track_mix_object_check;

alter table public.project_editor_state
  add constraint project_editor_state_track_mix_object_check
  check (jsonb_typeof(track_mix) = 'object');

notify pgrst, 'reload schema';
