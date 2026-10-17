# MIMICLARPERS — Architecture and Phase 1 Plan

## Project context and verified environment

- The initialized project directory is empty; no existing application work is being replaced.
- The Manus project runtime is configured for port `3000`. Its managed server and database capabilities are both off, no build/publish configuration is set, and the project has not been deployed.
- Node.js `22.13.0`, npm `10.9.2`, pnpm `11.25.0`, and Git `2.43.0` are available. TypeScript diagnostics were not registered at initial inspection; host-managed TypeScript diagnostics were enabled before the first application source file was written.
- The user-selected GitHub repository `softseraph01/mimiclarpers` is empty. The Manus project currently uses a Manus-managed repository. Supabase and Vercel connectors are present but disabled. No Supabase credentials or project URL are configured. Phase 1 will not connect to or write to either service.

## Recommended architecture

### Phase 1: frontend interface with an explicitly local demo adapter

Use a Vite + React + TypeScript single-page application. Keep page navigation, visual components, demo state, and service contracts separate. The app will provide useful working navigation and validation for a dashboard, room creation/joining, a room lobby, and a dubbing studio. Seeded content and all local-only interactions will be visibly marked as demo data. In-browser demo state is not shared with other people and is not a persistent project record. Any browser object URL used to preview a chosen local file is temporary and is not an upload.

The studio will have a demonstrative multi-track timeline, character/participant lanes, clip blocks with timestamps, a visible playhead, scene transport controls, and a responsive layout. Where implemented as local interactions, editing the demo timeline changes only the current client-side demo state. Phase 1 will not claim that other users see the changes, media survives disconnection, audio recording is saved, or a final video is rendered.

### Future production architecture (planned, not part of Phase 1)

- **Authentication and authorization:** Supabase Auth. Browser code receives only the Supabase project URL and the public/anon key via public environment variables. Never expose the service-role key in client code.
- **Persistent domain data:** additive Supabase Postgres migrations for user profiles, projects, rooms, room membership, scenes, characters, media metadata, versioned dialogue clips, and export jobs. RLS policies enforce room visibility and membership at the database boundary. Projects belong to durable records, not to the creator's live socket session.
- **Private media:** private Supabase Storage buckets, with per-project ownership/membership authorization and short-lived signed access where appropriate. Store media metadata and object paths in Postgres; do not treat a browser object URL as an upload.
- **Collaboration:** Supabase Realtime Presence/Broadcast for participant presence and ephemeral shared playback position; persist edits as versioned Postgres records. Use a revision/compare-and-update strategy for clip edits, detect stale revisions, and show a conflict/reload or retry path rather than silently overwriting another person's update. Independent editing mode remains distinct from shared playback state.
- **Recording and timeline:** browser microphone capture with explicit permission and supported-format handling; local preview before upload; clip records carry project/scene/character identity and start/end timestamps. Editing operations are implemented against a service contract so demo state can later be replaced with Supabase-backed reads/writes.
- **Export:** create a durable export job and process media/audio mixing in a server-side worker with an actual media toolchain (for example FFmpeg), then store the completed output privately. A Vercel serverless request should not be treated as a long-running high-quality render worker. Worker hosting, queueing, storage, and egress may incur paid costs as usage grows. Until this pipeline is implemented and exercised end-to-end, the UI must not present a simulated export as a finished video.
- **Hosting/source control:** keep the React client compatible with Vercel static deployment and retain the requested GitHub source-control workflow. The existing empty GitHub repository and Manus's current managed canonical repository are separate at initialization; the intended source-control handoff must be resolved before claiming that this project has been saved to the user's GitHub.

### Phase 1 scope boundaries

Included: responsive dashboard; validated room create/join forms; public/private selection and target-language selection in the demo; lobby with clearly identified sample members/room details; studio navigation; a demonstrative, responsive timeline with seeded character/clip lanes; demo labels and capability disclosures; keyboard and touch-usable controls; route handling and useful empty/error states.

Not included or claimed: real accounts or authorization, actual public/private access control, Supabase-backed persistence, rooms discoverable by other browsers, synchronized playback, realtime edits/conflict handling, durable media upload/storage, microphone recording retention, or final rendered/exported media. Real behavior will be added incrementally in later phases and verified before its status is changed.

## Project structure

```text
.
├── public/
│   ├── manus-routes.json            # Declared client page routes for Preview
│   └── mimiclarpers-mark.svg        # Durable MIMICLARPERS brand mark
├── src/
│   ├── App.tsx                      # App shell, route definitions, not-found state
│   ├── components/BrandMark.tsx     # Voice-bubble/playhead brand mark
│   ├── features/
│   │   ├── dashboard/               # Room create/join forms and room list
│   │   ├── rooms/                    # Lobby and sample membership presentation
│   │   └── studio/                   # Scene preview and dialogue timeline
│   ├── services/
│   │   ├── contracts.ts             # Typed room, auth, project, media, timeline, export boundaries
│   │   ├── demoRooms.ts              # In-memory RoomService adapter
│   │   └── demoTimeline.ts           # Pure local TimelineEditService adapter
│   ├── demo/                         # Clearly labeled fictional seed records
│   ├── types/                        # Shared room, participant, and dialogue clip types
│   ├── main.tsx
│   └── styles/                       # Global responsive styling and design tokens
├── .env.example                     # Names and safe placeholders only; no secrets
├── app.config.ts                     # Project metadata and hosted logo URL
├── vercel.json                       # Vercel static-build and SPA fallback config
├── README.md                         # Setup and capability/deployment boundaries
├── package.json / pnpm-lock.yaml    # Pinned toolchain and reproducible dependency graph
├── pnpm-workspace.yaml              # Reviewed pnpm lifecycle-script allowlist
├── plan.md
└── TODO.md                          # Created after plan approval
```

The active `localDemoRoomService` implements the shared asynchronous `RoomService`; the active `localDemoTimelineEditor` implements a pure local editing contract. The UI calls those contracts rather than the concrete demo implementations. Authentication, project persistence, media uploads, recording, database-backed timeline persistence, and rendering remain interfaces only, with no fabricated working adapters. A future Supabase client will use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser; values are supplied through deployment environment settings, never committed to source.

## Design direction

- **Design movement:** a cinematic post-production console, borrowing the purposeful restraint of professional editing bays rather than a generic social dashboard.
- **Core principles:** keep the scene and its timing legible; prioritize touch-sized controls; make demo/live status unmistakable; spend cyan accents on focus, playback, and selected state rather than decoration.
- **Color philosophy:** charcoal and deep graphite surfaces create a quiet viewing environment, with low-glare contrast for long sessions. A restrained cyan identifies active timing and primary actions; secondary states remain neutral so clips are the visual focus.
- **Layout paradigm:** an asymmetric, tool-oriented desktop composition with scene/context rail, central preview stage, and a horizontal timeline beneath it. On phones/tablets, collapse the rail into a compact top/context strip and keep timeline lanes horizontally scrollable with large touch targets; avoid shrinking a desktop editor to fit.
- **Signature elements:** a cyan playhead line with a subtle glow; compact, waveform-inspired clip markings; small filmstrip/timecode details as dividers and labels.
- **Interaction philosophy:** direct manipulation should feel precise but forgiving. Use visible selection/focus, clear labels, forgiving hit areas, and confirmation/error copy; do not rely on hover-only affordances. Honor reduced-motion preferences.
- **Animation:** restrained 120–180 ms transitions for panel/selection changes and an unobtrusive playhead transition; no constant decorative motion, and reduce/disable movement when `prefers-reduced-motion` is set.
- **Typography system:** Space Grotesk (with a system sans fallback) for interface and headings; Space Mono (with a system monospace fallback) for timecodes, clip coordinates, and compact status details; use a pixel/display face sparingly for the DUBROOM wordmark.
- **Brand essence:** a shared voice-over bench for friends who want to localize scenes together, one performance at a time. Personality: cinematic, playful, meticulous.
- **Brand voice:** concise studio language with clear demo caveats. Example headlines/actions: “Stage a scene.” and “Voice it together.”
- **Wordmark & logo:** the DUBROOM wordmark uses a bespoke speech/playhead mark; MIMICLARPERS remains the repository/project identifier rather than a second product identity.
- **Signature brand color:** restrained electric cyan for the playhead, focus ring, and selected action.

## Phase 1 implementation and delivery status

Phase 1 is implemented: the dashboard, local room create/join flow, lobby, and responsive studio are delivered with conspicuous demo-only status. The async room boundary and pure timeline-edit boundary are used by the UI; authentication, persistence, media upload, recording, and export interfaces are not connected. `pnpm check` and `pnpm build` pass; browser flows and desktop/tablet/phone layouts were inspected, and the route manifest is served as JSON. Commit `8d945f6b462926da6b0ab95c79679700413ac1b8` was pushed to the Manus-managed `main` and separately mirrored to GitHub `main` through the `github-backup` remote. The bound Manus WebDev project has no confirmed Vercel deployment.

The GitHub repository `softseraph01/mimiclarpers` was empty at initial setup; it now has `main` at the Phase 1 commit above and remains a separate backup, while the Manus-managed repository is canonical for this WebDev project. The supported WebDev canonical-connection flow creates a new private repository and does not adopt or rebind this existing repository. The user's separate claim of a Vercel deployment could not be verified: the current WebDev runtime reports `not_deployed`, the Vercel connector is disabled, and no Vercel project binding or deployment URL is available here.

## Phase 2 implementation status and remaining steps

The approved Phase 2 code and database changes are being prepared on the local review branch `phase-2/supabase-foundation`, based on the existing Phase 1 GitHub `main`. At this point, no Phase 2 commit has been pushed; neither production `main` nor the Manus canonical remote has been changed by this phase. The separate Phase 1 mirror remains at `8d945f6b462926da6b0ab95c79679700413ac1b8`.

The approved Supabase project `MIMICLARPERS` (`zwuddcotycuzflixprjv`) is active and healthy in Mumbai (`ap-south-1`). Two additive versioned migrations have been applied and read back at their recorded versions: `20261017171400_phase2_rooms_auth_rls.sql` and `20261017173400_phase2_auth_profile_guard.sql`. They create profiles, rooms, memberships, and projects plus bounded room RPCs, explicit grants, RLS, and member-scoped Realtime Presence policies. All four application tables and the pre-existing `realtime.messages` table have RLS enabled. Read-only catalog review confirmed that each public RPC has a fixed empty `search_path`, sensitive room functions are executable only by `authenticated`, and the safe `list_public_rooms` RPC is the only listed RPC available to `anon`. The project currently has no app rows, accounts, media, or storage objects; no test data has been created.

The new DUBROOM UI and Supabase-backed client flows are implemented; the original fictional studio remains under `/demo/...`, and the real studio shell explicitly disables recording, uploads, collaborative timeline editing, and export. `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm build`, and `git diff --check` have passed. The live Preview serves the route manifest as JSON; the empty sign-in form is blocked with validation, `/rooms` returns the genuine empty public list, and an unauthenticated `/profile` request redirects to `/auth?next=%2Fprofile`. DUBROOM auth, public-room browsing, demo lobby/studio, and responsive layouts have been visually inspected at 1280px, 768px, and 390px. No real test accounts were used; authenticated room creation/join, profile update, invitation, and cross-account authorization/presence have not been end-to-end verified.

Still outstanding: confirm Supabase Auth redirect URLs for the current Preview and real Vercel origins; verify the project-wide Realtime setting **Allow public access is off** (the current management tool does not expose it); test the core flows with two separate accounts; inspect/create Vercel Preview configuration once the owner enables access; then commit and push only the review branch to the existing GitHub backup remote. Do not claim a production deployment, two-account authorization, or private Realtime isolation without those confirmations. The user approved the `$0/month` recurring project-creation quote only; do not purchase additional resources or upgrade a plan without explicit approval.


## Phase 2 audit and proposed implementation plan — review before coding

### Current-state audit (read-only; describes the state before Phase 2 implementation)

- This is the existing React 19 + TypeScript + Vite SPA using React Router and Lucide; the current committed source is `8d945f6b462926da6b0ab95c79679700413ac1b8`. GitHub `main` and the Manus-managed repository both point to that commit. The worktree was clean at audit time. I will preserve the app and its existing repository, and will not replace either remote.
- At the initial audit, routes were `/`, `/room/:roomId/lobby`, and `/studio/:roomId`. The dashboard and lobby used an in-memory `localDemoRoomService`; seed room/cast/timeline data was fictional and edits were client-only. There was then no auth provider, Supabase SDK, migration, profile, database-backed room, or Presence. The current app now uses separate persistent-room and `/demo/...` paths; the legacy demo adapter/seed remain for the explicit sample experience. `.env.example` now documents `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the actual local `.env.local` is untracked/ignored.
- At the initial audit, the Supabase account listed **zero projects** and one organization (`softseraph01's Org`). Following explicit approval of the **$0/month project-creation quote** and Mumbai (`ap-south-1`), project **MIMICLARPERS** (`zwuddcotycuzflixprjv`) was created. At first inspection it had no app tables or migrations; it now has the two additive migrations described in the status section above. The app environment uses only the public URL and publishable key; the project-creation quote does not cover future usage/add-ons.
- The app has a valid Vite static-build configuration and SPA rewrite in `vercel.json`, which is preserved. The bound Manus WebDev environment reports `deployStatus: not_deployed`; the Vercel connector is disabled and there is no `.vercel` project binding. The user's statement that Phase 1 is deployed may refer to a separate Vercel project, but no deployment URL/project is available here to inspect or modify. Do not claim the deployed version was checked.
- Project-level Manus server/database features are off. The application will continue using the explicitly requested external Supabase client rather than enabling Manus-managed MySQL/server services.

### Proposed product and implementation approach

Keep the current React/Vite architecture, routing, working room form validation, room/lobby/studio concepts, and timeline editor. Redesign the existing dashboard, lobby, studio, authentication, and room forms as one coherent retro-futuristic audiovisual workstation: midnight navy/plum atmosphere, controlled violet creative actions, cyan playback/focus, coral recording/status cues, amber cautions, translucent bordered glass panels, and a restrained analog grid/scanline treatment built in CSS. Use Space Grotesk for readable interface/headings, Space Mono for timecodes/status, and a small pixel/display face only for the DUBROOM wordmark or short annotations. Keep keyboard focus, contrast, touch targets, reduced-motion behavior, and solid-panel fallbacks when `backdrop-filter` is unavailable. Avoid heavy image/video backgrounds and keep the existing Lucide icon set.

Use `@supabase/supabase-js` with only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the browser; the publishable key is intentionally public, while service-role/secret keys and database passwords must never enter client code, Vite variables, or Git. If these public configuration values are missing, render a clear setup/unavailable state and do not silently fall back to local room creation or imply that data is persistent. Environment values remain separate for local/Preview and Vercel.

Implement email/password registration and sign-in, sign-out, restored Supabase sessions, display-name profiles, form validation, loading/error/success states, and protected lobby/studio routes. Keep public-room discovery limited to safe public metadata; require authentication to create/join and to view member/project details. After authentication, restore a safe internal destination and continue the requested room join. Explain that Supabase email confirmation may require the user to click a verification email before a session is available; do not weaken project auth settings automatically.

Replace the primary dashboard/lobby room adapter with real Supabase queries and narrowly scoped RPCs. The local demo room remains only as a clearly marked, separate preview rather than acting as a persistent room. Keep the demo timeline and editing controls clearly marked as demonstrative; Phase 2 does not implement microphone capture, audio uploads, media storage, timeline synchronization, or rendered video export.

### Proposed additive PostgreSQL schema and security model

Create a single, versioned SQL migration under `supabase/migrations/` only after reviewing the existing target schema. The minimal domain schema is:

- `profiles`: `id` referencing `auth.users` (cascade on account deletion), non-sensitive `display_name`, and creation/update timestamps; a signup trigger creates the profile. No email or authorization role is copied into user-editable metadata.
- `rooms`: UUID, name, optional description, public/private visibility, an invitation-code hash (never exposed in table reads), owner ID, target language, open/closed status, optional maximum members, and timestamps. Index visibility/status/creation and owner lookups.
- `room_members`: room/user foreign keys, owner/member role, joined timestamp, and a unique `(room_id,user_id)` constraint plus indexes. Role and ownership changes are only via owner-checked functions.
- `projects`: UUID, unique associated room, project title/basic JSON metadata, creator/owner reference, and timestamps. Membership grants access; project rows remain after a creator disconnects or a member leaves.

Enable RLS on every exposed table. Profiles are readable by their owner and members sharing a room (only the display fields needed by the lobby); users can update only their own allowed profile fields. Public-room discovery returns only open public room metadata. Private rooms, membership lists, and projects are readable only to authorized room members/owners. Direct client writes to protected membership/owner/invitation fields are not granted.

Use authenticated, narrowly granted database functions for atomic room + owner membership + project creation; public joining; private joining by a cryptographically random invitation token whose hash is compared in the database; owner-only room settings/invitation rotation; membership leave/ownership handoff; and capacity/duplicate checks. Capacity is checked while locking the room row to avoid races. Private invitation secrets are returned only by the authorized function, not included in public queries. Any `SECURITY DEFINER` function will use an empty/fixed `search_path`, schema-qualified objects, explicit `auth.uid()` checks, narrow execute grants, and generic errors where revealing room existence would be unsafe. Migration must not drop/reset existing objects or delete data; if an object name/schema collision is found, stop and inspect rather than replace it.

Use a `public.room_presence` table for transient per-connection leases, and Supabase Realtime Postgres Changes on private `room-presence:<uuid>` topics for updates. `set_room_presence` derives the user from `auth.uid()`, verifies membership, and upserts a client-generated connection UUID; `clear_room_presence` can only mark that caller's own connection stale. Table RLS allows reads only to current room members. The client heartbeats every 15 seconds, treats a connection as online for 45 seconds, and the database opportunistically removes rows older than two minutes. Membership and projects remain in PostgreSQL; do not use Realtime for media or timeline edits in this phase. The hardening migration also revokes direct owner-ID reads, caps configured room capacity at 500, and requires an explicit ownership transfer before an owner leaves. The project-wide **Allow public access** setting still requires confirmation in the Supabase Dashboard before claiming private-channel isolation.

### Existing modules to retain and planned changes

- Retain and extend `src/App.tsx`, `src/main.tsx`, existing page modules, `src/types/domain.ts`, and typed service boundaries in `src/services/contracts.ts`.
- Add an auth/session provider and route guard, an email/password auth page, a public-room browsing/join page, a Supabase client/configuration module, Supabase auth/room/project/presence service adapters, and reusable glass-panel/status/form components.
- Update the dashboard and lobby to render real loading/empty/error states and real room/membership data; keep `StudioPage` demo timeline editing but fetch/authorize the real room first, and label the timeline demo. Move seeded room access to an explicit demo-preview route rather than presenting it as a real joined room.
- Replace or restrict `src/services/demoRooms.ts` to the explicit demo preview; do not use it as a fallback when Supabase fails. Add the additive migration(s) and tablet-friendly setup/permission instructions in `supabase/migrations/` and `README.md`. Update `public/manus-routes.json` for all new page routes. Preserve `vercel.json` build/install/output/SPA rewrite settings unless a verified route-specific need requires a change.
- Preserve the base studio mechanics in `src/styles/app.css`; keep the DUBROOM tokens, atmosphere, glass surfaces, responsive breakpoints, focus states, reduced-motion behavior, and fallbacks in `src/styles/redesign.css`.

### Compatibility, deployment, and validation constraints

- Existing local-only rooms are ephemeral and cannot be migrated into Supabase because no durable source of those records exists. After the switch, they will no longer appear as real recent rooms; the built-in fictional sample remains available only in a separate demo preview. Authentication will become required for creating/joining and for lobby/studio data; the public-room browser and auth page can remain accessible before sign-in.
- Add an explicit owner transfer/handoff before an owner can leave, so rooms do not become ownerless; do not cascade-delete a room/project when a user disconnects or leaves. Current room IDs/routes will use actual UUIDs, while the old `scene-042` seeded path will be retained only as a demo path.
- Work on a review branch from the verified GitHub `main` (e.g. `phase-2/supabase-foundation`) and push only that branch to the existing `github-backup` remote after approval and verification. Do not push to production `main`, alter the Manus canonical remote, or trigger a production deploy. A connected Vercel project may create a Preview deployment from that branch; current Vercel connection state is unknown. Deployment environment variables will need separate Vercel setup once access is enabled.
- TypeScript diagnostics were registered before the first app-source change. Frozen-lockfile installation, strict TypeScript check, production build, SQL parsing, applied migration readback, route-manifest HTTP validation, anonymous REST checks, safe sign-in validation, protected-route redirect, and visual responsive checks have passed. The latest run again passed `pnpm check`, `pnpm build`, route-manifest HTTP 200/JSON, and migration grammar parsing. Three migrations are applied and read back; catalog checks confirm owner-ID SELECT grants are absent, presence RPCs are authenticated-only, and the RLS-protected presence table is in the Realtime publication. Two-account room/auth/authorization/presence cases still require real test accounts and are not claimed from catalog inspection alone. No sample or production-like database rows were written.
- Expected application configuration: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. No service-role key or database password is needed by the browser. Exact Vercel env configuration is blocked until Vercel access is enabled. Supabase plan quotas/costs depend on the selected organization/project and will be checked rather than assumed; no paid upgrade or resource purchase is included.

### Approval gate and next step

At the time this plan was presented, no Phase 2 source, schema, project, environment, or deployment changes had been made. The user has since approved the plan and the $0/month project quote, selected Mumbai, and authorized project creation. Later migrations and implementation progress are recorded below. No production Vercel or GitHub `main` changes are authorized by this plan.


## Post-approval progress — 2026-10-17

The user approved the Phase 2 plan, explicitly approved project creation at the quoted $0/month recurring amount, and selected Mumbai (`ap-south-1`). The project is active and healthy. Three non-destructive additive migrations are applied and read back; all five app tables have RLS enabled and contain zero rows. The hardening migration is recorded as `20261017181045` and the local filename now matches. Owner-ID direct SELECT grants are absent, authenticated-only presence lease RPCs are installed, and `room_presence` is in the Realtime publication. The app's auth, room, lobby, database-backed presence, profile, and studio foundation is implemented on the separate review branch. The current public-room empty state and unauthenticated route guard were tested in the actual Preview. No real user accounts or data exist; private Realtime project-wide configuration and cross-account behavior remain unverified. No Vercel environment or production deployment was changed.


## Specific design decisions

**Design movement:** a late-1980s audiovisual control-room console reinterpreted through modern glassmorphism, with cinematic sunset color and restrained instrument-panel detail rather than generic cyberpunk.

**Core principles:** (1) atmosphere frames the work but never competes with dialogue or controls; (2) room, member, and timeline state remain legible at a glance; (3) every interaction works on touch and keyboard; (4) functional truth is visible, so demo-only media and unconfigured backend states are not disguised.

**Color philosophy:** midnight navy and deep plum establish a calm, cinematic night studio; violet signals creative actions; electric cyan is the ownable playback/focus color; coral is reserved for recording/status cues; amber marks warnings and important attention. The user-provided values are retained as tokens, with muted variants and contrast-safe foregrounds instead of simultaneous high-intensity neon. Frosted white is a surface material, not a text color.

**Layout paradigm:** an off-center control-room composition: a slim persistent navigation rail, a spacious working area with asymmetric panels, and the studio's video/timeline controls arranged as a console rather than a centered SaaS card grid. On narrow screens, secondary cast/settings panels collapse or stack below the main work surface; no action is hover-only.

**Signature elements:** a fine CRT/grid texture behind the app shell; a cyan audio-playhead/waveform motif linking navigation, playback, and timeline selection; compact retro status LEDs paired with monospaced technical readouts. Use each motif sparingly.

**Interaction philosophy:** direct manipulation with immediate, truthful feedback. Pressed/focused/selected states are explicit; asynchronous operations disable only their relevant action and announce success/failure; room and invite actions clearly distinguish private authorization from public browsing. Touch controls keep the established 44px-class hit area where practical. Keyboard focus and form labels remain visible.

**Animation:** short (roughly 140–220ms) opacity/transform transitions for hover, press, panel entry, and focus; no perpetual background motion or large parallax. An occasional low-key LED pulse may indicate a connected state. `prefers-reduced-motion: reduce` removes nonessential transitions/pulses, and static gradients preserve the atmosphere. Provide opaque-surface fallbacks for unsupported `backdrop-filter`.

**Typography:** Space Grotesk for readable body/interface/headings; Space Mono for timecodes, track names, and status; a restrained pixel/display face for DUBROOM wordmark and short annotations only. Use system fallbacks and keep the font load non-blocking. Headings are compact but readable; long descriptions/forms use normal sans-serif sizes.

**Brand essence:** “A collaborative dubbing room where friends give every line a voice.” Personality: cinematic, inventive, welcoming.

**Brand voice:** concise, studio-aware, encouraging, and honest about capability. Example headline: “Bring the scene back to life.” Example action/microcopy: “Room saved. Invite your cast.” Do not call temporary local media “uploaded” or a demo timeline “synced.”

**Wordmark and mark:** set DUBROOM in the selected display face with a bespoke inline-SVG waveform/playhead glyph that can also stand alone in the compact navigation rail; retain MIMICLARPERS as the repository/project identifier, not as a second product identity. Use a custom vector/markup mark rather than stock imagery.

**Signature brand color:** electric cyan `#55E7F2`, used as the DUBROOM active/playback signature; violet remains the principal creative-tool action color.

## Project structure and module responsibilities

Keep the existing repository and page modules; add focused modules rather than consolidating the application into a large file. The planned structure is:

```text
src/
  App.tsx                         existing route shell; add auth/public/demo routes
  main.tsx                        existing React/router bootstrap
  components/                     shared brand mark, glass surfaces, forms, status/loader
  providers/AuthProvider.tsx      Supabase session restoration and auth state
  features/auth/                  email/password registration and sign-in
  features/dashboard/             authenticated workspace, create-room form, recent projects
  features/rooms/                 public listing, invite-code join, lobby/member actions
  features/studio/                existing studio, authorized room context, explicit demo timeline
  services/                       typed contracts plus Supabase client/auth/room/project/presence adapters
  types/                          domain types and generated/maintained Supabase schema types
  styles/app.css                  design tokens, responsive layout, reduced-motion/fallback styles
  demo/                           clearly isolated fictional seed room/timeline
supabase/
  migrations/                     additive, versioned SQL for profiles/rooms/members/projects/RLS/RPCs
public/manus-routes.json          complete static client-page route declaration
```

The Vite app remains a static SPA served by Vercel; Supabase Auth, PostgREST/RPC, Postgres, and Realtime are external managed services. There is no application server or service-role credential in this phase. Local Preview uses untracked local environment values; Vercel needs separately configured Preview/Production values. Migration SQL can be applied through the Supabase dashboard SQL Editor on an Android tablet, but it must be verified against the created project's actual schema and migration result before saying it succeeded.


## Supabase implementation references checked

- Supabase's [Postgres RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) explains that privileges and RLS combine: newly exposed tables need RLS plus deliberate grants, and adding a policy does not itself remove broad table grants. New tables below will therefore receive explicit grants/revokes as well as policies.
- Supabase's [database functions guide](https://supabase.com/docs/guides/database/functions) says `SECURITY DEFINER` functions run with the creator's privileges, can bypass RLS, are executable by broad roles by default, and must pin `search_path`. Room RPCs will use an empty fixed search path, fully schema-qualified objects, authorization checks inside the body, `REVOKE EXECUTE ... FROM PUBLIC, anon`, and explicit grants only to the required roles.
- Supabase's [Realtime authorization guide](https://supabase.com/docs/guides/realtime/authorization) says private channels require both `config.private: true` client channels and policies on the already-RLS-enabled `realtime.messages` table; authenticated Presence needs `SELECT` and `INSERT` policies filtered to `extension = 'presence'` and a membership check against `realtime.topic()`. The project already has RLS enabled on `realtime.messages` and the `realtime` schema exposes no current policies. Do **not** issue `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY` or create functions/tables in the locked `realtime` schema. Supabase also requires its Realtime “Allow public access” setting to be disabled to enforce private channels. The current tool set did not return that setting; it remains an explicit dashboard setup/verification item, so Presence cannot be claimed securely verified until it is confirmed off and member/non-member behavior is tested.
- Supabase's [Password-based Auth guide](https://supabase.com/docs/guides/auth/passwords) says email/password sign-in is enabled by default and hosted projects require email confirmation by default. Signup confirmation redirect targets must be allow-listed in Auth URL Configuration. The app will handle signup returning no active session and show a confirmation-pending state; no Auth project setting has been changed or directly inspected. Supabase's default email sender is best-effort and limited to 2 messages per hour; production email reliability requires a separately configured SMTP provider, which is outside this approved phase.
