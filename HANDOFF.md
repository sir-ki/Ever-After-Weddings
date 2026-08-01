# Ever After — Handoff

Status snapshot as of Milestone 6. Written for whoever picks this up next — a
contractor doing the pre-M7 security review, a future session of this same
project, or the founder coming back after a break.

Companion to `docs/ever-after-build-plan.md`, which this follows milestone by
milestone. Read that first for *why* the work is sequenced this way; this
doc is *where things currently stand*.

---

## 1. Live pieces

| | |
|---|---|
| Repo | https://github.com/sir-ki/Ever-After-Weddings |
| Production URL | https://ever-after-weddings-seven.vercel.app |
| Hosting | Vercel project `scheme-soft-solutions/ever-after-weddings`, auto-deploys on push to `main` |
| Database | Supabase project `soagkxplguuuowgnnnsq` |
| Stack | Next.js 16 (App Router, Turbopack), Tailwind CSS 4, Supabase (Postgres/Auth), Vercel |

**Env vars** (in `.env.local`, not committed; also set in Vercel project settings):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
The service-role key bypasses RLS entirely — it's only ever touched by
server-side code under `src/lib/supabase/admin.ts`, `scripts/`, and route
handlers. Never import that admin client from anything client-side.

---

## 2. What's built (Milestones 0–6)

| Milestone | State | Notes |
|---|---|---|
| 0 — Foundation | ✅ Done | Auth (sign in/out), `users` + `global_role` |
| 1 — Engagements dashboard | ✅ Done | List, filter, search, create, workspace shell |
| 2 — Guest list | ✅ Done | CRUD, archive, bulk import (paste or CSV) |
| 3 — Guest tokens & RSVP | ✅ Done | `/r/[token]`, `/api/g/[token]`, rate-limited |
| 4 — Tables & seating | ✅ Done | Bulk assign by group, warn-then-spill, individual reassign |
| 5 — The wedding site | ✅ Done | One template, draft/publish, `/s/[slug]` |
| 6 — Day-of hub | ✅ Done | `/r/[token]/day`, announcements, run of show |
| 7 — Checkpoints & scanning | Not started | Build plan flags this as high-risk, alongside M3 |
| 8 — Vendor directory | Not started | No dependents, no fixed deadline |

Every milestone's commit message on `main` has the full detail of what
shipped and how it was verified — `git log --oneline` to orient, then
`git show <hash>` for the write-up.

---

## 3. Database

Six migrations, in `supabase/migrations/`, already applied to the live
Supabase project in order:

1. `0001_init.sql` — `users`, `engagements`, `engagement_members`, RLS helpers (`is_account()`, `has_engagement()`)
2. `0002_guests.sql` — `guests` table, RLS
3. `0003_guest_tokens.sql` — `invite_token` (pgcrypto CSPRNG default), `meal_choice`, `song_request`, `guest_token_requests` (rate-limit table)
4. `0004_tables.sql` — `tables`, `guests.table_id`
5. `0005_sites.sql` — `sites`, `site_sections`, asymmetric RLS + `site_engagement_id()` / `is_site_published()` helpers
6. `0006_day_of_hub.sql` — `schedule_items`, `announcements`

**Not yet in the schema** (per the data model's own MVP-first sequencing):
`checkpoints`, `guest_scans` (M7); `vendors`, `vendor_photos`, `engagement_vendors`, `media` (M8/post-v1).

If you're setting this up fresh, or reviewing schema history, paste each
file into the Supabase SQL Editor in order — they're idempotent (`if not
exists`, `drop policy if exists`) so re-running is safe.

---

## 4. Test data

Two fake engagements exist per the build plan's "two fake engagements from
day one" rule — every feature gets built and tested against both:

- **Maria & Jon** (`606ece77-8c2a-409f-ab16-195fffa1c430`) — has a published
  site, seeded guests across two tables, a posted announcement, and an
  unlocked day-of hub. This is the one with real content in it; expect to
  see it in screenshots.
- **Erick & Erika** (`5e95d26a-f8b7-4ef0-b215-0cfb161a95c6`) — deliberately
  left sparse, to exercise empty states.

Re-seed with `npm run seed` (adds the two engagements if missing; skips if
they already exist).

**The one Account login**: `brulkeanjames@gmail.com`, password shared
earlier in this session. `full_name` on that user is still literally
"Bruce" — a placeholder I guessed and the user never corrected. Worth
fixing before this goes anywhere real; there's no profile-edit UI yet, so
it needs a direct `update users set full_name = '...' where email = ...`
in the SQL editor, or a quick script.

---

## 5. Key architecture decisions

**Guest access is never RLS + anon key.** Guests aren't authenticated —
their token *is* their credential. All guest-facing reads/writes route
through server-side handlers (`src/lib/guest-token.ts`,
`src/app/api/g/[token]/*`) using the service-role client, and every
response is hand-built (never `select *`). This was deliberate per
`docs/ever-after-auth-and-access.md` §5 and is the most security-sensitive
code in the app — see §6 below before touching it.

**The wedding site and the guest hub are separate surfaces, on purpose.**
`docs/ever-after-template-spec.md` describes a merged experience (site URL
+ `?t=token` shows a personalized band, RSVP, day-of hub). The build plan
sequences that merge into M6/beyond and M5's own done-when didn't require
it, so — after an explicit check-in with the user — the public site
(`/s/[slug]`) stayed content-only, and guest personalization stayed on the
separate `/r/[token]` and `/r/[token]/day` routes from M3. If a future
milestone wants the full merge, that's a real refactor, not a small patch.

**Images are plain URL fields, not a media library.** The `media` table is
explicitly deferred past MVP in the data model doc. Hero/story/gallery
sections in `site_sections.content` just take pasted image URLs. Revisit
if/when `media` + Supabase Storage gets built.

**Rate limiting is Postgres-backed, not Redis/Upstash.** `guest_token_requests`
holds one row per request; `src/lib/rate-limit.ts` counts rows in the
trailing window and self-cleans old ones. This was a deliberate choice for
this app's scale (Phase 0, dozens of guests) — it works correctly across
serverless instances (unlike an in-memory limiter), at the cost of a DB
round-trip per guest request.

**Route groups**: `src/app/(app)/*` is the authenticated internal tool
(engagements, guests, tables, site editor, day-of editor) — gated by
`src/proxy.ts` redirecting unauthenticated requests to `/login`. `/r/*`,
`/api/g/*`, and `/s/*` are explicitly carved out as public routes in the
proxy (see `src/lib/supabase/middleware.ts`) — guests and public site
visitors never hit the login redirect.

---

## 6. Security posture — read before M7

The build plan calls out M3 and M7 as the two highest-risk milestones. M3
is done and has real coverage (below). Before starting M7 (checkpoint
scanning), or before any real guest data goes in, the build plan explicitly
recommends a security review of the RLS policies and the token path — this
hasn't happened yet.

**What exists to lean on:**
- `docs/ever-after-auth-and-access.md` — the design doc for the whole
  permission model, RLS policy sketches, and the guest token hardening
  checklist (§5).
- `scripts/verify-rls.mjs` — creates throwaway couple/Account users,
  confirms couple A can't reach couple B's data (engagements, guests,
  sites, site_sections) by list, direct id, or write. 12 checks.
- `scripts/verify-guest-token-security.mjs` — hits the guest API directly
  over HTTP (not through the UI), confirms guest A's token reveals nothing
  about guest B, no endpoint returns a list, tampered/garbage tokens 404
  identically, writes are blocked past the RSVP deadline, and the rate
  limiter actually trips. 15 checks. Needs the app running — set
  `BASE_URL` to point at a deployed URL, or just run against local dev.

Run both after any change touching RLS policies, guest endpoints, or
`src/lib/guest-token.ts` / `src/lib/rate-limit.ts` / `src/lib/supabase/admin.ts`:

```bash
npm run verify:rls
npm run verify:guest-token
```

**One real bug already caught and fixed** (see commit `248b944`): the
public site page's first version fetched engagement info via an embedded
PostgREST join, which was itself subject to `engagements`' RLS — so
published sites silently failed to render for genuinely anonymous
visitors, because all manual testing had been done while logged in as
Account. Lesson baked into the fix's commit message: test the public
surfaces with a cookie-free `curl`, not just the browser while logged in.

---

## 7. Known gaps / deliberate deferrals

- **Token rotation UI** — regenerating a guest's link if it leaks. Explicitly listed as "still open" in the auth doc, not attempted.
- **Coordinator "who to ask" block** on the day-of hub only renders if an `engagement_members` row with `role = 'coordinator'` exists *and* that user's `users.phone` is filled in — there's no UI to set phone numbers yet, so this block is currently dark for both seed engagements.
- **Footer site section** — `docs/ever-after-template-spec.md` describes one; the data model's `site_sections.section_type` check constraint doesn't include `footer`. Skipped rather than guessed at; flagged in the M5 commit.
- **`suppliers` section type** exists in the schema's check constraint but has no editor UI yet — it depends on `engagement_vendors`, which doesn't exist until M8.
- **No profile-editing UI** — see the "Bruce" note in §4.

---

## 8. Running locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run seed          # idempotent, adds the two fake engagements if missing
npm run verify:rls
npm run verify:guest-token   # needs the dev server running
```

`node --env-file=.env.local scripts/create-account-user.mjs <email> <password> "<name>"`
creates a new Account (internal team) login directly via the Supabase
admin API — there's no public signup path for that role, by design.
