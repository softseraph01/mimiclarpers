# MIMICLARPERS

MIMICLARPERS is a browser-based dubbing-studio prototype. Phase 1 delivers the dashboard, room creation/joining flow, room lobby, and a responsive demonstrative studio. It is a **local interface demo**, not a connected collaboration service.

## What works in Phase 1

- Create a room in the current page session with a validated name, display name, public/private demo label, and built-in or custom target language.
- Join the seeded example room with code `SCN-042`; invalid/missing codes receive a useful explanation.
- Navigate between the workspace, room lobby, and studio using browser routes.
- Inspect clearly identified fictional cast/scene details and an example multi-character timeline.
- Select a sample dialogue clip and nudge its position, adjust its demo duration, split it into local demo blocks, or reset the timeline.
- Play/seek a demonstrative timeline. Optionally select a local video under 250 MB for temporary in-browser preview; the selected file is not uploaded or saved by this app.

Room records and timeline edits exist only in the current browser session. Refreshing clears newly created rooms and clip edits. Private/public choices are labels only; there is no account system, access control, room discovery across browsers, multiplayer presence/playback, persisted project, saved audio recording, microphone workflow, durable upload, or rendered/exported video. Export and recording are visibly marked as not yet implemented.

## Local setup

Requirements: Node.js 22 (recommended) and pnpm `11.25.0`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The development server listens on port `3000`. Useful checks:

```bash
pnpm check
pnpm build
```

`pnpm-workspace.yaml` explicitly permits the Vite/esbuild package's required build script; no other package build scripts are approved in that file. `public/manus-routes.json` is the Preview route declaration and should be updated alongside any route changes.

## Supabase configuration (future work; unused by this demo)

`.env.example` lists the future browser variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, but Phase 1 does not initialize a Supabase client and these values are not needed to run or build the demo. Never add a Supabase service-role key to browser code, a `VITE_` variable, or a committed `.env` file.

The next step for real Supabase-backed rooms is to create/select the Supabase project, supply its project URL and public anon key through protected project/deployment environment settings, then implement an additive migration for profiles/projects/rooms/memberships with explicit RLS policies. Validate authorized create/join behavior before wiring the room service to those tables. Private media buckets and Realtime come after that room authorization boundary; do not use destructive migrations without explaining their effects.

## Vercel

The app is prepared for Vercel's Vite static build (`pnpm build`, output `dist`) with SPA route rewrites in `vercel.json`. Phase 1 needs no deployment secrets. **It has not been deployed to Vercel**; the Vercel connector is disabled and no deployment was requested or confirmed.

## Planned production boundaries

Supabase Auth, durable project/room records, RLS-protected membership, private Storage, and Realtime/versioned conflict handling are later milestones, not demo capabilities. High-quality mixed-audio rendering requires an actual media pipeline and worker; it is not represented by a client-side fake export. Costs and capacity limits should be assessed when the Supabase project and worker host are selected.
