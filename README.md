# DUBROOM

DUBROOM is the product identity in the existing `softseraph01/mimiclarpers` React/Vite repository. Phase 2 adds the first Supabase-backed account and room foundation while keeping the original fictional sample room/timeline on separate `/demo/...` routes. This is not a second application.

## Phase 2 status

Implemented in this review branch: a retro-futuristic audiovisual-workstation redesign; email/password sign-in and registration; profile display-name editing; protected room routes; Supabase-backed room/project/member service calls; public-room browsing; public join and private invitation flows; an owner-editable lobby with explicit handoff; database-backed connection presence; an explicit demo preview; and a persistent-room studio shell that deliberately disables recording, uploads, collaborative timeline editing, and export.

The Supabase project has the additive schema and RLS policies described below. The anonymous public-room RPC and safe public metadata query return an empty list in this new project. Anonymous reads of profiles, owner IDs, and invitation hashes were denied. TypeScript, production build, route manifest, empty-form validation, protected-route redirect, and responsive screenshots passed. **There are no test accounts or application rows in the database, so authenticated create/join/profile/presence behavior has not been end-to-end tested with two accounts.** A working policy definition is not a substitute for those tests.

Supabase project: `MIMICLARPERS` (`zwuddcotycuzflixprjv`), Mumbai (`ap-south-1`), PostgreSQL 17.11. The project-creation quote approved by the owner was `$0/month` recurring; that quote does not guarantee that future usage, add-ons, or other hosting will remain free.

## Database and migrations

Three additive SQL migrations are applied to the Supabase project and committed under `supabase/migrations/`:

1. `20261017171400_phase2_rooms_auth_rls.sql` creates `profiles`, `rooms`, `room_members`, and `projects`; foreign keys, indexes, checks, timestamp triggers, and enums; bounded room create/join/list/settings/invitation/leave/ownership RPCs; explicit grants and RLS policies; and membership-scoped policies for Realtime Presence on the existing `realtime.messages` table.
2. `20261017173400_phase2_auth_profile_guard.sql` makes the profile self-update predicate use a scalar `auth.uid()` subquery and makes the new-user trigger fall back safely when signup metadata contains a missing, blank, or too-short display name. It does not rewrite existing profile rows.
3. `20261017181045_phase2_review_hardening.sql` caps room member limits at 500, revokes direct `owner_id` reads from authenticated clients, creates the RLS-protected `room_presence` table and authenticated lease RPCs, changes owner departure to require an explicit handoff, and adds the presence table to the Realtime publication.

The database history was read back and matches all three filenames/versions. All five application tables have RLS enabled and currently contain zero rows. Public clients can list only open public-room metadata; anonymous users cannot select profile rows, room owner IDs, membership rows, or the private invitation hash. Authenticated clients also have no direct SELECT grant on `rooms.owner_id` or `projects.owner_id`. Membership and project records are only visible to authorized room members. Private invites are random, hashed at rest, short-lived, and only returned by owner-authorized functions.

The Supabase security advisor reports 11 `SECURITY DEFINER` execution warnings: one for the intentionally public, safe-metadata `list_public_rooms()` function and ten for authenticated room operations, including the presence lease RPCs. These functions use a fixed empty `search_path`, schema-qualified references, narrow role grants, and in-function authorization. The warnings remain visible for review; they are not treated as proof of security. Two-account authorization tests remain outstanding. The project has no app rows/traffic yet, so unused-index advisories are informational; do not drop intentionally added indexes solely on that basis.

### Realtime privacy status

The application no longer trusts identity values in a client-supplied Presence payload. Each browser connection receives a random connection UUID and refreshes its short-lived lease through `set_room_presence`, which derives the user from the authenticated JWT and checks room membership. `clear_room_presence` can mark only the caller's own connection offline. The member-only RLS policy controls reads from `room_presence`, and the client receives changes through a private, room-scoped Postgres Changes channel. The heartbeat runs every 15 seconds, online status expires after 45 seconds, and old leases are cleaned after two minutes. Membership and projects remain in PostgreSQL.

The project owner has confirmed that the Supabase project-wide **Allow public access** setting is OFF. The Sandbox browser remained at the Dashboard sign-in page, so this is owner-confirmed rather than independently inspected. Two-account Realtime authorization tests are still outstanding; do not claim end-to-end channel isolation until an authorized member and a non-member have been tested.

## Local development

Requirements: Node.js 22 (recommended) and pnpm `11.25.0`.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Fill `.env.local` with only the browser-safe project URL and public/publishable client key:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-public-key>
```

Then start the app and run checks:

```bash
pnpm dev
pnpm check
pnpm build
```

The development server uses port `3000`. `.env.local` is ignored by Git. The publishable key is intentionally public and is not an authorization secret; access must remain protected by RLS and trusted database functions. Never use a `service_role`/secret key, database password, or other privileged credential in a `VITE_` variable, browser source, or committed `.env` file. `.env.example` contains blank placeholders only.

## Authentication and redirect setup

The project currently allows email signup, enables email/password auth, and requires email confirmation (`mailer_autoconfirm=false`). A user must confirm the message before signing in when Supabase returns no active session. The app preserves a safe same-site return path through that confirmation link.

On an Android tablet, open the Supabase Dashboard, select project `zwuddcotycuzflixprjv`, then open **Authentication → URL Configuration**. Set the Site URL to the actual production origin only when you have confirmed it, and add the exact `/auth` callback for every origin where signup will be tested, for example:

- `http://localhost:3000/auth`
- `https://<the-current-Manus-Preview-host>/auth` (temporary Preview only)
- `https://<Vercel-Preview-domain>/auth`
- `https://<verified-production-domain>/auth`

Do not put a guessed production URL in the allow-list. Hosted Supabase's default email sender is intended for limited testing; use a separately configured SMTP provider before relying on account emails for a real group.

## GitHub and Vercel

Phase 2 work was developed on and pushed to the separate private GitHub review branch `phase-2/supabase-foundation`; the owner has authorized merging it into that repository's `main`. This GitHub operation does not change the separate Manus canonical remote. The app's existing `vercel.json` Vite build and SPA rewrite are preserved. No Vercel settings, environment variables, or deployment were changed or verified in this task; the Vercel connector is not enabled here. The owner has previously described a Vercel deployment, but its URL/project cannot be inspected from the available configuration.

For a Vercel Preview from the review branch, open the existing Vercel project on the tablet and add these two environment variables to the **Preview** environment:

- `VITE_SUPABASE_URL` — the URL shown for project `zwuddcotycuzflixprjv`.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — an enabled `sb_publishable_...` value from Supabase **Project Settings → API Keys**. Do not choose or expose any `service_role`/secret key.

Then redeploy the **Preview** branch build and test the callback URL above. Configure Production variables or deploy to Production only when the production domain and deployment are explicitly approved. If the Vercel project is linked to this repository, verify that the review branch creates a Preview rather than promoting `main`.

## Implemented boundaries and next phase

The separate sample studio at `/demo/studio/scene-042` retains fictional cast and timeline-editing controls, labeled as demo and stored only in the open page. The real `/studio/:roomId` route reads authorized room/project metadata but has no scene video, microphone capture, durable media storage, timestamped dialogue recordings, shared timeline, or renderer. Disabled controls say these capabilities are later work. **Do not claim Phase 3 recording, uploads, synchronization, or export exists.**

The next implementation phase is real browser-microphone capture, saved audio clips, authorized media uploads, character/participant tracks, and timestamped dialogue clips—after the Phase 2 email redirect, Realtime privacy setting, and authenticated two-account flows have been verified.
