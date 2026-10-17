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
- **Typography system:** Manrope (or a system sans fallback) for interface and titles; IBM Plex Mono (or a system monospace fallback) for timecodes, clip coordinates, and compact status details.
- **Brand essence:** a shared voice-over bench for friends who want to localize scenes together, one performance at a time. Personality: cinematic, playful, meticulous.
- **Brand voice:** concise studio language with clear demo caveats. Example headlines/actions: “Stage a scene.” and “Voice it together.”
- **Wordmark & logo:** a compact pair of overlapping speech marks cut by a vertical playhead, paired with a custom-spaced MIMICLARPERS wordmark; treat this as a proposed concept, not an existing brand asset.
- **Signature brand color:** restrained electric cyan for the playhead, focus ring, and selected action.

## Phase 1 implementation and delivery status

Phase 1 is implemented: the dashboard, local room create/join flow, lobby, and responsive studio are delivered with conspicuous demo-only status. The async room boundary and pure timeline-edit boundary are used by the UI; authentication, persistence, media upload, recording, and export interfaces are not connected. `pnpm check` and `pnpm build` pass; browser flows and desktop/tablet/phone layouts were inspected, and the route manifest is served as JSON. The resulting source commit was pushed to the Manus-managed `main`; do not claim that it was saved to the selected GitHub repository or deployed to Vercel.

The selected GitHub repository `softseraph01/mimiclarpers` is a separate, existing empty repository. The supported WebDev canonical-connection flow creates a new private repository and does not adopt or rebind an existing repository; choose a supported source-control path before claiming GitHub delivery. No Vercel deployment has been performed.

## Next production steps

For real Supabase-backed rooms, create or select the Supabase project, provide `VITE_SUPABASE_URL` and the public anon key through protected/environment configuration, then add the first additive migration for profiles/projects/rooms/memberships with explicit RLS policies before wiring the async room service to Supabase. Do not request or place a service-role key in browser code. Validate authorized create/join behavior before adding private media buckets and Realtime; add conflict/version handling with persistence rather than presenting local demo edits as collaborative. Separately resolve the GitHub repository workflow and connect Vercel before deployment. Assess service, worker, storage, and egress limits when selecting production infrastructure; high-quality mixed-audio export requires an actual render pipeline.
