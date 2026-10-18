

## Phase 3.2 private media, durable takes, and timestamped clips — implemented on continuation branch
Acceptance criteria delivered:
- Additive private project media metadata and a private `dubroom-media` Supabase Storage bucket with member-scoped access policies.
- Persist uploaded scene versions and microphone takes; do not send media bytes through Realtime.
- Persist participant track identity, clip start/source-offset/duration timestamps, segment revisions, and shared editor playhead state.
- Authorized room members can read the shared scene/timeline; clip mutation is creator-scoped so one member cannot overwrite or delete another member’s recording.
- Keep the existing retro-futuristic/glassmorphism studio and Android-friendly controls; keep export/render explicitly unavailable until a server-side media worker exists.
Evidence: Supabase migration `20261018092620_persistent_studio_media` applied successfully; live readback shows the new RLS tables and private bucket with zero test rows. `PersistentStudioPage.tsx` and `supabaseStudio.ts` now use signed URLs, durable scene/take uploads, saved clip edits, and editor-state persistence. `pnpm check`, `pnpm build`, and `git diff --check` pass. No real account/media upload or two-account authorization test was performed in this session.

## Phase 3.3 remaining verification and collaboration — open
- Create/use two real permanent accounts on the authorized Preview, upload a scene, record a take, refresh, and verify the scene/take/clip/playhead survive.
- Verify a second room member sees the same private scene and timeline while a non-member cannot read media metadata or obtain a signed URL.
- Add optimistic concurrency/conflict UI for simultaneous clip edits; current clip mutation is creator-scoped rather than full collaborative editing.
- Add a server-side FFmpeg/worker export pipeline only after storage, authorization, and two-account tests pass; do not simulate export in the browser.

## Additional studio controls and host-only room archive — implemented on continuation branch

The persistent studio now defaults original scene audio to muted, exposes a separate original-audio toggle, replaces the large recording card with one-tap recording/review/keep/discard behavior, and records at the shared playhead. Participant audio has independent mute and volume controls. Timeline clips support pointer/touch dragging, selected-state handles, zoom, and persisted placement; saved clips remain non-destructive and export remains intentionally unimplemented.

The additive migration `20261018095459_host_archive_room.sql` adds the host-only `delete_room` RPC. It performs a safe archive rather than a destructive delete, revokes active invitations, hides archived rooms from dashboard lists, and preserves project/media rows. The live Supabase migration history confirms the migration is applied. Build and type checks pass; real Android recording and two-account host/member authorization tests remain unverified.
