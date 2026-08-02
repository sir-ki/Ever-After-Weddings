# Ever After — Handoff

Status snapshot as of Milestone 8. Written for whoever picks this up next —
a contractor scoping post-v1 work, a future session of this same project,
or the founder coming back after a break.

Companion to `docs/ever-after-build-plan.md`, which this follows milestone by
milestone. Read that first for *why* the work is sequenced this way; this
doc is *where things currently stand*.

**⚠️ M8 is code-complete and verified, but lives on branch
`worktree-vendor-directory` (a git worktree at
`.claude/worktrees/vendor-directory`), not yet merged into `main` or pushed
to origin.** `main` on GitHub still shows M7 as the latest milestone. See
§9 for exactly what's on this branch and what merging it involves.

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

## 2. What's built (Milestones 0–8)

| Milestone | State | Notes |
|---|---|---|
| 0 — Foundation | ✅ Done | Auth (sign in/out), `users` + `global_role` |
| 1 — Engagements dashboard | ✅ Done | List, filter, search, create, workspace shell |
| 2 — Guest list | ✅ Done | CRUD, archive, bulk import (paste or CSV) |
| 3 — Guest tokens & RSVP | ✅ Done | `/r/[token]`, `/api/g/[token]`, rate-limited |
| 4 — Tables & seating | ✅ Done | Bulk assign by group, warn-then-spill, individual reassign |
| 5 — The wedding site | ✅ Done | One template, draft/publish, `/s/[slug]` |
| 6 — Day-of hub | ✅ Done | `/r/[token]/day`, announcements, run of show |
| 7 — Checkpoints & scanning | ✅ Done | Checkpoint CRUD, QR + manual scanner, live derived counts — see §6 for a real RLS bug caught while building this |
| 8 — Vendor directory | ✅ Done, **on branch, not merged** | Signup-only (no vendor login this pass), public directory, Account approval queue, per-event vendor log, suppliers site section. See §9. |

That was the last milestone in the build plan — v1 is feature-complete
pending M8's merge.

Every milestone's commit message has the full detail of what shipped and
how it was verified — `git log --oneline` to orient (M0–M7 on `main`, M8 on
`worktree-vendor-directory`), then `git show <hash>` for the write-up.

---

## 3. Database

Nine migrations, in `supabase/migrations/`, **all already applied to the
live Supabase project** — including `0009`, even though the M8 code that
depends on it is still sitting on an unmerged branch. The schema is live in
the shared database regardless of merge status:

1. `0001_init.sql` — `users`, `engagements`, `engagement_members`, RLS helpers (`is_account()`, `has_engagement()`)
2. `0002_guests.sql` — `guests` table, RLS
3. `0003_guest_tokens.sql` — `invite_token` (pgcrypto CSPRNG default), `meal_choice`, `song_request`, `guest_token_requests` (rate-limit table)
4. `0004_tables.sql` — `tables`, `guests.table_id`
5. `0005_sites.sql` — `sites`, `site_sections`, asymmetric RLS + `site_engagement_id()` / `is_site_published()` helpers
6. `0006_day_of_hub.sql` — `schedule_items`, `announcements`
7. `0007_fix_role_privilege_escalation.sql` — closes a critical bug, see §6
8. `0008_checkpoints_scanning.sql` — `checkpoints`, `guest_scans`, unique `(checkpoint_id, guest_id)` index, `guest_engagement_id()` / `checkpoint_engagement_id()` helpers
9. `0009_vendor_directory.sql` — `vendors`, `vendor_photos`, `engagement_vendors`; `vendor_is_approved()` helper; `engagement_vendors` RLS is split by operation (not one `for all`) specifically so its read policy can be broader than its write policy — see §5.

**Not yet in the schema**: `media` (post-v1, deferred — see the data model doc).

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
  see it in screenshots. It also now has one checkpoint ("Arrival") and one
  logged scan (Ana Reyes, `method = 'manual'`) — leftover from live M7
  verification against the real Supabase project, not deliberately seeded.
  Harmless to leave or delete.
- **Erick & Erika** (`5e95d26a-f8b7-4ef0-b215-0cfb161a95c6`) — deliberately
  left sparse, to exercise empty states.

Re-seed with `npm run seed` (adds the two engagements if missing; skips if
they already exist).

**The one Account login**: `brulkeanjames@gmail.com`, password shared
earlier in an unlogged session. `full_name` on that user is still literally
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
(engagements, guests, tables, site editor, day-of editor, checkpoints,
scanner) — gated by `src/proxy.ts` redirecting unauthenticated requests to
`/login`. `/r/*`, `/api/g/*`, and `/s/*` are explicitly carved out as public
routes in the proxy (see `src/lib/supabase/middleware.ts`) — guests and
public site visitors never hit the login redirect.

**Scanning goes through a server action, not an API route.** The auth doc
sketches `POST /api/scan`, but every authenticated mutation in this app
(guests, tables, schedule, announcements, checkpoints) uses a `"use server"`
action with the RLS-aware session client (`@/lib/supabase/server`) — never
the service-role key. `logScan()` in
`src/app/(app)/engagements/[id]/checkpoints/actions.ts` follows that same
pattern and is called directly from the scanner's client component. It
still explicitly checks for a session itself (belt-and-suspenders, on top
of route-level gating), because the auth doc's hard requirement is that a
token alone must never be able to log its own scan.

**QR decoding is `jsqr` plus a hand-rolled camera/canvas loop**, not a
higher-level scanning library — deliberately, to avoid a dependency that
ships its own Web Worker under Turbopack. See
`src/app/(app)/engagements/[id]/checkpoints/scan/scanner.tsx`.

**Offline handling for the scanner is "fail loudly," not a local queue.**
A failed scan shows an immediate error with a manual retry; nothing is
silently dropped, but nothing is queued for background sync either. This
was an explicit scope call with the user, not an oversight — the build
plan's own text offers both as valid options.

**M8's vendor directory is signup-only in this pass — no vendor login.**
The build plan's own bullet list calls for a "vendor profile editor," and
the auth doc documents a real `global_role = 'vendor'` account with a
login. This pass deliberately doesn't build that: a vendor submits their
full profile once via a public form (`/directory/apply`), and Account
manages any edits afterward (Account already has full read/write on
`vendors`). Explicit scope call with the user — matches the PRD's own MVP
framing ("simple listing page, manually maintained") and avoids building an
entire authenticated portal for the build plan's lowest-priority milestone.
`vendors.owner_user_id` stays in the schema, nullable, so a real
self-service login is a clean addition later, not a rework.

**The public vendor signup insert is the one place besides the guest-token
path that uses the admin/service-role client from an authenticated-app
route.** An anonymous visitor submitting `/directory/apply` has no
session, so the ordinary RLS-aware client can't satisfy
`vendors_write_account`'s `is_account()` check. `status` is hardcoded to
`'pending'` server-side in that one action and never read from form
input — the exact discipline migration `0007`'s bug was about.

**`engagement_vendors`' RLS is split by operation, not one `for all`
policy — public read, scoped write.** The auth doc's permission matrix
says `engagement_vendors` is "credited only" for both guest-token holders
and the public, because the wedding site's suppliers section has to render
credited rows with no session at all. Read gets its own broader policy
(`is_account() or has_engagement(engagement_id) or credit_on_site = true`);
insert/update/delete stay scoped to Account or the owning engagement. Same
asymmetric-policy pattern `sites`/`site_sections` already established in
M5, applied to a table that needed splitting by operation rather than by
table.

**`SiteRenderer` is a pure presentational component that gained a new
required prop, `suppliers`, rather than fetching its own data.** It's
shared verbatim between `/s/[slug]` (public) and the site-tab preview
(Account/couple), specifically so both surfaces render identically —
that constraint already existed from M5 and M8 respects it rather than
special-casing one caller.

**`updateSiteSection` changed from a pure `.update()` to an `.upsert()`.**
Every site created before M8 has no `suppliers` row in `site_sections` —
a plain `.update()` matched on `(site_id, section_type)` would silently
no-op the first time Account tries to save that section on an old site.
The upsert's `sort_order` fallback values are hardcoded to exactly match
what `createSite`'s `defaultSections` array already assigns for every
pre-existing section type, so re-saving hero/story/the_day/rsvp/gallery/
details is a true no-op for that column — verified live against Maria &
Jon's site (created back in M5), not just reasoned about.

---

## 6. Security posture

The build plan calls out M3 and M7 as the two highest-risk milestones. Both
are done, and both got a real security review — this section is no longer
"do this before M7," it's "here's what was found and where the coverage
still has gaps."

**What exists to lean on:**
- `docs/ever-after-auth-and-access.md` — the design doc for the whole
  permission model, RLS policy sketches, and the guest token hardening
  checklist (§5).
- `scripts/verify-rls.mjs` — creates throwaway couple/Account users,
  confirms couple A can't reach couple B's data by list, direct id, or
  write, across `engagements`, `guests`, `sites`, `site_sections`, and (as
  of M8) `vendors`/`vendor_photos`/`engagement_vendors` — including the
  public-read carve-outs (anon can read an approved vendor but not a
  pending one, a credited `engagement_vendors` row but not an uncredited
  one). 22 checks total.
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

**Gap: neither script covers `checkpoints`/`guest_scans` yet.** Still open
— M8 closed the equivalent gap for the new vendor tables (see above) but
didn't retroactively add M7's tables to the suite. Worth folding in before
real event data goes through the scanner.

**M8's RLS design caught two gaps during planning, before any code
existed** — worth noting as a contrast to M7, where the equivalent bugs
were only caught after implementation. Both are recorded in the design
spec's revision history
(`docs/superpowers/specs/2026-08-02-vendor-directory-design.md`):
1. The original `engagement_vendors` policy sketch was one `for all` rule
   with no public-read path at all, which would have made the suppliers
   site section unable to render for anonymous visitors — caught while
   working out how `SiteRenderer`'s new caller would actually query the
   data, before the migration was written.
2. The original plan didn't specify which Supabase client the public
   signup action should use — tracing through `vendors_write_account`'s
   `is_account()` requirement made it clear the ordinary session client
   would reject an anonymous insert, same failure mode migration `0007`
   was about, caught before Task 3 was implemented rather than after.

**Four real bugs caught and fixed, not just theoretical:**

1. (commit `248b944`) The public site page's first version fetched
   engagement info via an embedded PostgREST join, which was itself subject
   to `engagements`' RLS — so published sites silently failed to render for
   genuinely anonymous visitors, because all manual testing had been done
   while logged in as Account. Lesson baked into the fix's commit message:
   test public surfaces with a cookie-free `curl`, not just the browser
   while logged in.

2. (commit `2fa2471`, migration `0007`) **Critical — signup-time privilege
   escalation.** `handle_new_user()`, the trigger that creates a
   `public.users` row on signup, read `global_role` straight from
   client-supplied auth metadata. Anyone hitting Supabase Auth's public
   signup endpoint with the anon key could set `global_role: 'account'` and
   get read/write access to every engagement, every guest list, and site
   content. Confirmed exploitable live against the production project
   before fixing. `app_metadata` looked like the fix at first but isn't
   reliable either — the admin API inserts the `auth.users` row (firing the
   trigger) before merging custom `app_metadata` in, so the trigger never
   observes it. The actual fix: the trigger now always creates new users as
   `'couple'` and never consults any signup-time metadata for role
   assignment; `scripts/create-account-user.mjs` promotes to `'account'` via
   an explicit table update after the user exists instead.

3. (commit `9652156`, migration `0008`) **`guest_scans` RLS gap, caught
   during M7 verification.** The first version of the policy checked that
   the *guest* being scanned belonged to the caller's engagement, but never
   checked that the *checkpoint* did too — so a coordinator could log a
   scan using their own guest against a completely different engagement's
   checkpoint. Doesn't leak the other engagement's guest list, but pollutes
   their live arrival counts. Confirmed live, then fixed by requiring both
   `guest_engagement_id()` and the new `checkpoint_engagement_id()` to
   match.

4. (commits `ace28e7..5ccf2c9`, worktree branch) **Not a security bug —
   a build-breaking regression, caught the same way: by actually running
   the app rather than trusting that code compiled once.** M8's per-event
   vendor log tab (Task 7) completed the tab-switch ternary in
   `engagements/[id]/page.tsx` — all 7 `TABS` entries finally had explicit
   branches — which made the old "lands in Milestone N" placeholder branch
   genuinely unreachable. TypeScript correctly flagged it (`Property
   'label' does not exist on type 'never'`), breaking `npm run build`
   entirely. Not caught by Task 7's own verification (a live browser
   walkthrough, not a full build check); caught when Task 8's own build
   step failed on unrelated code. Fixed by replacing the dead branch with
   `null` — every real tab already had its own branch above it, so nothing
   about real behavior changed.

---

## 7. Known gaps / deliberate deferrals

- **Token rotation UI** — regenerating a guest's link if it leaks. Explicitly listed as "still open" in the auth doc, not attempted.
- **Coordinator "who to ask" block** on the day-of hub only renders if an `engagement_members` row with `role = 'coordinator'` exists *and* that user's `users.phone` is filled in — there's no UI to set phone numbers yet, so this block is currently dark for both seed engagements.
- **Footer site section** — `docs/ever-after-template-spec.md` describes one; the data model's `site_sections.section_type` check constraint doesn't include `footer`. Skipped rather than guessed at; flagged in the M5 commit.
- **No profile-editing UI** — see the "Bruce" note in §4.
- **No automated RLS regression test for `checkpoints`/`guest_scans`** — see the gap note in §6.
- **No vendor self-service login or editor** — deliberate M8 scope decision, see §5. Adding it later is additive (the schema already has `vendors.owner_user_id`), not a rework.
- **A handful of Minor-severity findings from M8's task reviews were deliberately deferred**, not fixed — non-numeric `rate_from`/`rate_to` silently becomes `null` instead of erroring; the per-event vendor log's off-platform `business_name` field isn't marked required; notes typed on a directory-linked vendor-log entry are silently discarded (only the off-platform path stores them); `/directory`'s card grid has no responsive breakpoints. None are security- or data-integrity-relevant. Full detail with file:line references in `.superpowers/sdd/2026-08-02-vendor-directory/progress.md` (worktree-local, not committed — see §9).

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

---

## 9. Merging Milestone 8

**Branch:** `worktree-vendor-directory`, in a git worktree at
`.claude/worktrees/vendor-directory` off this repo. 10 commits ahead of
`main` (9 plan-task commits + this handoff rewrite), all local — nothing
pushed to `origin` yet. `git log --oneline main..HEAD` from the worktree
to see the exact list; each commit message carries its own detail, same as
every prior milestone.

**How this milestone was built**, for context on the commit history's
shape: `superpowers:brainstorming` → `superpowers:writing-plans` →
`superpowers:subagent-driven-development` for Tasks 1–7 (fresh implementer
subagent + independent reviewer subagent per task, fix-loop on
Important/Critical findings), then a direct switch back to the same
plan-mode workflow M7 used (the user asked to stop using the
`superpowers` plugin's per-task subagent dispatch partway through Task 8 —
it had also been uninstalled from this environment mid-session, so this
was as much a practical necessity as a preference). Tasks 8 and 9 were
reviewed and verified directly, not via dispatched reviewer subagents.
Both approaches produced the same rigor — real diffs read line-by-line,
real live browser verification, nothing taken on the strength of a
report alone — just via different mechanics. The design spec
(`docs/superpowers/specs/2026-08-02-vendor-directory-design.md`) and plan
(`docs/superpowers/plans/2026-08-02-vendor-directory.md`) are both
committed to this branch and worth keeping even after merge — they're the
record of *why*, same role this handoff plays for the rest of the app.

**The progress ledger is not committed** —
`.superpowers/sdd/2026-08-02-vendor-directory/progress.md` is gitignored,
worktree-local scratch. It has the full task-by-task history (every fix
round, every finding, every review verdict) that fed into this handoff's
summaries. If you want that detail preserved past the worktree's lifetime,
copy it out before removing the worktree — it won't survive
`git worktree remove` / `ExitWorktree` with `action: "remove"`.

**Before merging:** the user hasn't been asked how they want this done —
a straight `git merge` into `main`, or opened as a PR first (this repo has
no GitHub remote branch for this work yet, so a PR would need a push
first). Ask rather than assume. After merging, the usual production
deploy is automatic (Vercel auto-deploys `main`) — no separate deploy step,
but worth a quick check that the build succeeds on Vercel the way it does
locally, same as every prior milestone's push.
