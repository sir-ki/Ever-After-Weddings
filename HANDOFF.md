# Ever After — Handoff

Status snapshot as of Milestone 7, **plus Milestone 8 in progress, paused
mid-session — read §0 first.** Written for whoever picks this up next — a
contractor resuming M8, a future session of this same project, or the
founder coming back after a break.

Companion to `docs/ever-after-build-plan.md`, which this follows milestone by
milestone. Read that first for *why* the work is sequenced this way; this
doc is *where things currently stand*.

---

## 0. Milestone 8 status — IN PROGRESS, paused mid-session

**This file is inside a git worktree, not the main checkout.** Location:
`.claude/worktrees/vendor-directory` off the main repo, branch
`worktree-vendor-directory`, 9 commits ahead of local `main`. **Nothing
here is pushed to origin or merged** — `main` on GitHub still shows M7 as
the latest milestone. If you're a future session picking this up, either
resume in this same worktree or re-derive it: the branch and its commits
only exist locally right now.

**Why a worktree at all:** the user chose isolation for this milestone
specifically (asked explicitly when M7 and both security fixes had gone
straight to `main`) — see the plan doc's own note on this decision.

**Process being followed:** `superpowers:brainstorming` →
`superpowers:writing-plans` → `superpowers:subagent-driven-development`
(fresh implementer subagent per task, independent task-reviewer subagent
per task, fix-loop on Important/Critical findings). Two artifacts this
process produced, both committed to this branch:
- Design spec: `docs/superpowers/specs/2026-08-02-vendor-directory-design.md`
- Implementation plan (9 tasks, full code for each): `docs/superpowers/plans/2026-08-02-vendor-directory.md`

**Progress ledger** (task-by-task history: fix rounds, findings, review
verdicts, commit ranges): `.superpowers/sdd/2026-08-02-vendor-directory/progress.md`.
**This file is gitignored — worktree-local only.** It will not survive if
this worktree is deleted (`git worktree remove` / `ExitWorktree` with
`action: "remove"`). If you need its history preserved, copy it out or
paste it into a commit message before removing the worktree.

**⚠️ Mid-session environment change:** the `superpowers` Claude Code plugin
was uninstalled partway through this work (its skills and helper scripts —
`scripts/task-brief`, `scripts/review-package`, `scripts/sdd-workspace` —
disappeared from `~/.claude/plugins/cache/claude-plugins-official/`). The
plan, spec, and ledger files were unaffected (they're normal repo files,
not plugin state) and Tasks 1–7 plus an out-of-band regression fix had
already gone through the full dispatch-implement-review-fix-loop process
before this happened. After the plugin vanished, the same review discipline
continued manually — diffs generated with plain `git log`/`git diff -U10`
redirected to a file instead of the plugin's `review-package` script,
review subagents dispatched with the same rigor via hand-written prompts.
If the plugin is still missing when you resume, do the same: you don't
need it to finish this, just replicate what it automated.

### Task status (plan has 9 tasks total)

| # | Task | Status |
|---|---|---|
| 1 | Migration `0009_vendor_directory.sql` (`vendors`, `vendor_photos`, `engagement_vendors` + RLS) | ✅ Done, reviewed clean. **Already applied to the live Supabase project** (`soagkxplguuuowgnnnsq`) — the same shared database `main` uses. The schema exists in production right now even though the code isn't merged. |
| 2 | Extend `scripts/verify-rls.mjs` with vendor isolation checks | ✅ Done, reviewed clean (22/22 checks pass) |
| 3 | Vendor signup (`/directory/apply`) | ✅ Done, 1 fix round (report accuracy only, code was already correct), reviewed clean |
| 4 | Public vendor directory (`/directory`) | ✅ Done, reviewed clean |
| 5 | Account approval queue (`/vendors`) | ✅ Done, 1 fix round (report accuracy only, code was already correct), reviewed clean |
| 6 | Header nav link (Account-only "Vendors" link) | ✅ Done, reviewed clean |
| 7 | Per-event vendor log tab | ✅ Done, reviewed clean |
| — | *(out-of-band)* Fix dead fallback branch in `engagements/[id]/page.tsx` | ✅ Done, reviewed clean. Task 7 made the tab-switch ternary exhaustive (all 7 `TABS` entries now have explicit branches), which made the old "lands in Milestone N" placeholder branch unreachable — TypeScript correctly flagged it as `never`. Caught by Task 8's implementer, fixed as its own isolated commit, independently reviewed. Commits `ace28e7..5ccf2c9`. |
| 8 | Suppliers site section (editor + renderer) — the most cross-cutting task: modifies the shared `SiteRenderer` component (used by both `/s/[slug]` and the site-tab preview) and changes `updateSiteSection` from `.update()` to `.upsert()` | **Implemented** (commit `ace28e7`), lint/build clean, implementer's own browser walkthrough reported passing. **Review was in progress and got interrupted before a verdict landed** — a review-package diff was generated (`.superpowers/sdd/2026-08-02-vendor-directory/review-f2e63c6..ace28e7.diff`) and a reviewer subagent was dispatched but the session was interrupted mid-call, so **no review verdict exists yet for this task's own diff**. This is the very next step. |
| 9 | Final verification pass (full `lint`/`build`/`verify:rls`, cookie-free curl sweep of every new route, end-to-end manual walkthrough, update this handoff doc for the real M8 completion) | Not started |

### Exact next step

1. Dispatch (or redo) the Task 8 review. The diff file already exists at
   `.superpowers/sdd/2026-08-02-vendor-directory/review-f2e63c6..ace28e7.diff`
   (base `f2e63c6`, head `ace28e7` — **not** `5ccf2c9`, which is the
   separate out-of-band fix reviewed independently). The implementer's
   report is at `.superpowers/sdd/2026-08-02-vendor-directory/task-8-report.md`.
   Task 8's full brief is at `.superpowers/sdd/2026-08-02-vendor-directory/task-8-brief.md`,
   or read Task 8 directly from the plan doc.
2. Specific things worth extra scrutiny in that review, per the plan's own
   risk assessment: does `SECTION_SORT_ORDER` in `site/actions.ts` exactly
   match what `createSite`'s `defaultSections` already assigns for the
   pre-existing section types (a mismatch would silently reorder existing
   sites' sections on next save)? Is the new `suppliers` prop passed by
   *both* `SiteRenderer` callers? Does `/s/[slug]/page.tsx`'s new query use
   the plain session client, not the admin client? The implementer's
   dispatch ran without the safety classifier available (flagged by a
   system note at the time) — treat that report's claims with extra
   skepticism, same as this handoff's process notes above.
3. Handle any fix-loop rounds the same way Tasks 3 and 5 needed (both had
   Important findings about report accuracy, not actual code bugs — see the
   ledger for exactly how those were resolved, as a template).
4. Once Task 8 is clean, do Task 9 (final verification), including turning
   this §0 back into a normal "✅ Done" row in the milestones table below
   and rewriting this handoff the way M7's completion was written up in
   §6/§7 below — this section (§0) should not exist in the final version.
5. Only after Task 9 is clean and the user's reviewed it: merge this branch
   into `main` (the user has not yet been asked how they want that done —
   ask, don't assume `git merge` vs. a PR).

### Dev server / environment state

A `next dev` server was left running on `http://localhost:3000` from
within this worktree (started via plain `npm run dev &`, not the
`Claude_Browser` preview tooling). It may or may not still be running by
the time you resume — check with `curl -s -o /dev/null -w "%{http_code}"
http://localhost:3000/` before assuming either way, and restart with `npm
run dev` from this worktree directory if needed. `.env.local` was manually
copied into this worktree (it's gitignored, so a fresh worktree won't have
it) — copy it again from the main checkout if you recreate the worktree.

An authenticated Account browser session (`brulkeanjames@gmail.com`) was
open in the `Claude_Browser` pane, tab "tab-1", pointed at this worktree's
dev server — useful for picking up live verification without needing
credentials again, if that session is still alive.

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

## 2. What's built (Milestones 0–7)

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
| 8 — Vendor directory | Not started | No dependents, no fixed deadline |

Every milestone's commit message on `main` has the full detail of what
shipped and how it was verified — `git log --oneline` to orient, then
`git show <hash>` for the write-up.

---

## 3. Database

Eight migrations, in `supabase/migrations/`, already applied to the live
Supabase project in order:

1. `0001_init.sql` — `users`, `engagements`, `engagement_members`, RLS helpers (`is_account()`, `has_engagement()`)
2. `0002_guests.sql` — `guests` table, RLS
3. `0003_guest_tokens.sql` — `invite_token` (pgcrypto CSPRNG default), `meal_choice`, `song_request`, `guest_token_requests` (rate-limit table)
4. `0004_tables.sql` — `tables`, `guests.table_id`
5. `0005_sites.sql` — `sites`, `site_sections`, asymmetric RLS + `site_engagement_id()` / `is_site_published()` helpers
6. `0006_day_of_hub.sql` — `schedule_items`, `announcements`
7. `0007_fix_role_privilege_escalation.sql` — closes a critical bug, see §6
8. `0008_checkpoints_scanning.sql` — `checkpoints`, `guest_scans`, unique `(checkpoint_id, guest_id)` index, `guest_engagement_id()` / `checkpoint_engagement_id()` helpers

**Not yet in the schema** (per the data model's own MVP-first sequencing):
`vendors`, `vendor_photos`, `engagement_vendors`, `media` (M8/post-v1).

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

**Gap: neither script covers `checkpoints`/`guest_scans` yet.** The M7 RLS
work was verified by hand (throwaway couple sessions, live against the
Supabase project, cleaned up after) rather than added to
`verify-rls.mjs`'s 12 checks. Worth folding in before M8 or before real
event data goes through the scanner.

**Three real bugs caught and fixed, not just theoretical:**

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

---

## 7. Known gaps / deliberate deferrals

- **Token rotation UI** — regenerating a guest's link if it leaks. Explicitly listed as "still open" in the auth doc, not attempted.
- **Coordinator "who to ask" block** on the day-of hub only renders if an `engagement_members` row with `role = 'coordinator'` exists *and* that user's `users.phone` is filled in — there's no UI to set phone numbers yet, so this block is currently dark for both seed engagements.
- **Footer site section** — `docs/ever-after-template-spec.md` describes one; the data model's `site_sections.section_type` check constraint doesn't include `footer`. Skipped rather than guessed at; flagged in the M5 commit.
- **`suppliers` section type** exists in the schema's check constraint but has no editor UI yet — it depends on `engagement_vendors`, which doesn't exist until M8.
- **No profile-editing UI** — see the "Bruce" note in §4.
- **No automated RLS regression test for `checkpoints`/`guest_scans`** — see the gap note in §6.

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
