# Ever After — Handoff

Status snapshot as of Milestone 8. Written for whoever picks this up next —
a contractor scoping post-v1 work, a future session of this same project,
or the founder coming back after a break.

Companion to `docs/ever-after-build-plan.md` (M0–M8, followed milestone by
milestone) and, for everything after v1, `docs/ever-after-launch-readiness-
spec.md` (Parts 1–7). Read whichever plan doc covers the era you're
touching first for *why* the work is sequenced that way; this doc is
*where things currently stand*.

**v1 is feature-complete.** All 8 milestones are merged into `main`, pushed,
and deployed to production. §9 has the detail on how M8 was built, for
context on that milestone's commit history.

**2026-08-02, post-M8: a short hardening pass closed the punch list of
fixable-now gaps** — RLS coverage for `checkpoints`/`guest_scans`,
self-service profile editing (and the "Bruce" placeholder fix), and all
four of M8's deferred minor findings. See §6 and §7 for detail. §10 covers
the workflow this pass used, since it's a deliberate change from how
M0–M8 were built.

**2026-08-03, launch readiness: all seven parts are done, verified live,
and merged.** Part 4 (guest-facing UI/UX pass) — the last one — restyled
`/r/[token]/day`, `/r/[token]`, `/s/[slug]`, `/directory`, and
`/invite/[token]` to the spec's design direction. §11 is the full
writeup for Parts 1/2/3/5; §12 covers Part 6; §13 covers Part 7; §14
covers Part 4. The launch-readiness spec is now fully implemented.

**2026-08-03, post-launch-readiness: real per-couple theming shipped.**
`sites.theme` — unwired since M5, still empty everywhere when Part 4
shipped — now actually drives four curated accent presets across every
themed surface (the site, RSVP, day-of hub, invitation card, place
cards/table numbers), picked from a swatch UI in the site editor. §15
has the full writeup. Accent color only — `heading_font` and
`corner_style` (also named in the template spec) are a documented,
additive-later fast-follow, not implemented yet.

**2026-08-03, post-launch-readiness: media library shipped.** The
`media` table `docs/ever-after-data-model.md` planned from day one but
deferred past MVP ("has no dependents") is now built — real Supabase
Storage uploads for hero/story/gallery images on the wedding site,
alongside the existing paste-a-URL fields rather than replacing them.
§16 has the full writeup. Account/couple uploads only — guest uploads
and the `is_approved` moderation queue the schema already anticipates
are a documented fast-follow, not built. Vendor photos are untouched
(still pasted URLs, a prior deliberate M8-era scope call, not
re-litigated here).

**2026-08-04: the public marketing site shipped.** Five new pages —
`/`, `/how-it-works`, `/pricing`, `/vendors`, `/contact` — the front
door in front of the product, per `docs/ever-after-marketing-site-plan.md`.
`/` moved from the dashboard to the marketing homepage; the dashboard
is now `/dashboard`. §17 has the full writeup.

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
| 8 — Vendor directory | ✅ Done | Signup-only (no vendor login this pass), public directory, Account approval queue, per-event vendor log, suppliers site section. See §9 for how it was built. |

That was the last milestone in the build plan — v1 is feature-complete.

Every milestone's commit message has the full detail of what shipped and
how it was verified — `git log --oneline` to orient, then `git show <hash>`
for the write-up.

---

## 3. Database

Eleven migrations, in `supabase/migrations/`, all applied to the live
Supabase project in order:

1. `0001_init.sql` — `users`, `engagements`, `engagement_members`, RLS helpers (`is_account()`, `has_engagement()`)
2. `0002_guests.sql` — `guests` table, RLS
3. `0003_guest_tokens.sql` — `invite_token` (pgcrypto CSPRNG default), `meal_choice`, `song_request`, `guest_token_requests` (rate-limit table)
4. `0004_tables.sql` — `tables`, `guests.table_id`
5. `0005_sites.sql` — `sites`, `site_sections`, asymmetric RLS + `site_engagement_id()` / `is_site_published()` helpers
6. `0006_day_of_hub.sql` — `schedule_items`, `announcements`
7. `0007_fix_role_privilege_escalation.sql` — closes a critical bug, see §6
8. `0008_checkpoints_scanning.sql` — `checkpoints`, `guest_scans`, unique `(checkpoint_id, guest_id)` index, `guest_engagement_id()` / `checkpoint_engagement_id()` helpers
9. `0009_vendor_directory.sql` — `vendors`, `vendor_photos`, `engagement_vendors`; `vendor_is_approved()` helper; `engagement_vendors` RLS is split by operation (not one `for all`) specifically so its read policy can be broader than its write policy — see §5.
10. `0010_users_self_update.sql` — self-service profile editing: `users_update_self` RLS policy plus `lock_self_update_sensitive_columns` trigger to keep `global_role`/`email`/`archived_at` Account-only — see §5.
11. `0011_fix_users_self_update_trigger.sql` — fixes `0010`'s trigger, which also blocked legitimate service-role writes — see the bug writeup in §6.
12. `0012_member_invites.sql` — `engagement_invites` (launch-readiness Part 1): single-use, expiring invite tokens; RLS is Account read/write, engagement-members read-only. Corrected in place after initial verification found the token's original base64 encoding could contain `/`, breaking the `/invite/[token]` route — now base64url, matching `guests.invite_token`'s existing scheme. See §11.
13. `0013_entourage_processional.sql` — `guests.entourage_role`/`entourage_sort` (launch-readiness Part 6): free text against a suggested list, no check constraint, since entourage roles vary by wedding. New `processional_entries` table (single `for all` RLS policy, same shape as `tables_all`/`schedule_items_all`). Extends `site_sections.section_type` to add `entourage` and `footer` — the latter folded in per the spec's own instruction, closing a known gap left open since M5. See §12.

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
- **Carlos & Diana** (added 2026-08-02, launch-readiness Part 5) — ~300
  guests across 15 `guest_group` clusters, 30 tables (capacity 10), and a
  `guest_cap` of 280 (deliberately below the seeded guest count, so the
  new advisory over-cap banner is visible out of the box). Exists purely
  to stress-test the guest list, seating, and bulk QR export at real
  mid-tier-wedding scale — the two engagements above stay exactly as they
  were, untouched by this addition.

Re-seed with `npm run seed` (idempotent — skips any engagement that
already exists by `display_name`; only ever adds).

**The one Account login**: `brulkeanjames@gmail.com`, password shared
earlier in an unlogged session. `full_name` is now "Account Admin" (was
literally "Bruce", a placeholder guess — see 2026-08-02 fix below).

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

**Self-service profile editing (`/profile`, migrations `0010`/`0011`,
2026-08-02) uses a DB trigger to scope which columns a self-update can
touch, not RLS column privileges.** `users.global_role` lives on the same
row as `full_name`/`phone`, and RLS `using`/`with check` clauses can't be
scoped per-column — so a plain "allow self-update" policy would reopen the
exact privilege-escalation class migration `0007` fixed. Instead, the RLS
policy allows any authenticated user to update their own row, and a
`before update` trigger (`lock_self_update_sensitive_columns`) pins
`global_role`/`email`/`archived_at` back to their old values unless the
caller is Account. The trigger must gate on `auth.role() = 'authenticated'`
(not just `not is_account()`) — see the bug this caused and the `0011`
fix in §6.

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
  write, across `engagements`, `guests`, `sites`, `site_sections`,
  `vendors`/`vendor_photos`/`engagement_vendors` (as of M8), `checkpoints`/
  `guest_scans` (added 2026-08-02 hardening pass), and, as of the
  launch-readiness pass, `engagement_invites` — including the
  public-read carve-outs (anon can read an approved vendor but not a
  pending one, a credited `engagement_vendors` row but not an uncredited
  one) and the "no distinguishing oracle" property for revoked/expired
  invites, and, as of 2026-08-03, `processional_entries` (Part 6). **44
  checks total.**
- `scripts/verify-guest-token-security.mjs` — hits the guest API directly
  over HTTP (not through the UI), confirms guest A's token reveals nothing
  about guest B, no endpoint returns a list, tampered/garbage tokens 404
  identically, writes are blocked past the RSVP deadline, the rate
  limiter actually trips, and — added for Part 2 (token rotation) —
  rotating mid-run kills the old token immediately and the new one
  resolves with RSVP/table data intact. **18 checks.** Needs the app
  running — set `BASE_URL` to point at a deployed URL, or just run
  against local dev.
- `scripts/verify-invitation-card.mjs` — Part 3: proves the QR embedded in
  a generated invitation card actually decodes via `jsqr` (the same
  library the M7 scanner uses), and that the decoded payload parses back
  to the guest's real token through the scanner's own `extractToken()`
  logic. **4 checks.**
- `scripts/verify-rate-limit-scale.mjs` / `scripts/verify-scanner-throughput.mjs` —
  Part 5: confirm the rate limiter is genuinely per-IP (300 distinct
  simulated guest IPs never trip each other) and that 300 simulated
  sequential checkpoint scans complete with no errors/degradation.

Run all of these after any change touching RLS policies, guest endpoints,
invites, or `src/lib/guest-token.ts` / `src/lib/rate-limit.ts` /
`src/lib/supabase/admin.ts` / `src/lib/invite-token.ts`:

```bash
npm run verify:rls
npm run verify:guest-token
npm run verify:invitation-card
npm run verify:rate-limit-scale
npm run verify:scanner-throughput
```

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

5. (migrations `0010`/`0011`, 2026-08-02) **Self-update trigger blocked
   legitimate service-role writes, caught immediately by `verify-rls.mjs`
   regressing.** Migration `0010` added self-service profile editing
   (`/profile`, §5) via a trigger (`lock_self_update_sensitive_columns`)
   meant to stop a user from escalating their own `global_role` on
   self-update — the same class of bug migration `0007` fixed. The
   trigger's condition was `not is_account()`, but `is_account()` is also
   false for the service-role client (`auth.uid()` is null with no
   session) — so it silently pinned `global_role` back to its old value
   even when `scripts/create-account-user.mjs` or `verify-rls.mjs`'s admin
   client did the update. The very next `verify:rls` run caught it (the
   "second Account user" checks failed) before it reached any real
   workflow. Fixed in `0011` by scoping the lock to `auth.role() =
   'authenticated'`, so service-role writes are unaffected.

---

## 7. Known gaps / deliberate deferrals

Everything that was fixable as a self-contained punch-list item was closed
2026-08-02 (see §6's bug #5 and the "fixed" note below). The member-invite
flow and token rotation gaps listed here previously are **closed** — see
§11. The entire launch-readiness spec (Parts 1–7) is now done — see §14
for the last one. What's left below is real feature scope beyond that
spec — each one needs its own design/plan pass before implementation,
not a quick patch.

- **Physical print check for Part 7's printables** — still owed, same
  caveat Part 3 already recorded: no printer/camera has been available in
  any environment used for this project so far. A4 sizing and PDF
  structure are verified programmatically (§13); an actual print of the
  attendee sheet and place cards is the one piece not yet done.
- **Coordinator "who to ask" block** on the day-of hub only renders if an `engagement_members` row with `role = 'coordinator'` exists *and* that user's `users.phone` is filled in. `/profile` (added 2026-08-02) lets any signed-in user set their own phone, and the member-invite flow (§11) now provides a real way to attach a coordinator — this block should light up for any engagement with an invited, phone-having coordinator; still dark for the two original seed engagements since their members were only ever added via SQL.
- **No vendor self-service login or editor** — deliberate M8 scope decision, see §5. Adding it later is additive (the schema already has `vendors.owner_user_id`), not a rework.
- ~~A handful of Minor-severity findings from M8's task reviews were deliberately deferred~~ — **fixed 2026-08-02**: non-numeric `rate_from`/`rate_to` now redirects with an error instead of silently becoming `null` (`src/lib/parse-rate.ts`, used by both `directory/apply/actions.ts` and `(app)/vendors/actions.ts`); the per-event vendor log's off-platform `business_name` is now required server-side (`(app)/engagements/[id]/vendors/actions.ts`); notes on a directory-linked vendor-log entry are no longer discarded (both insert branches now pass `notes` through); `/directory`'s card grid is now `grid-cols-1 sm:grid-cols-2`. Fixing the required-field/rate validation surfaced a small pre-existing gap in the same code — action success paths only called `revalidatePath`, never `redirect`, so a prior error left in the URL's `?error=` param would stick around after a subsequent successful submit; both `addEngagementVendor` and `updateVendor` now redirect on success too.
- **Physical print + camera scan test still owed** (Part 3's own done-when). QR decode correctness is proven by script (`verify-invitation-card.mjs`, using the scanner's actual `jsqr`/`extractToken()` logic), but no environment used for this project so far has had a printer or camera — a real print-and-scan against the live M7 scanner is still worth doing once someone has both.

---

## 8. Running locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run seed          # idempotent, adds the three fake engagements if missing
npm run verify:rls
npm run verify:guest-token       # needs the dev server running
npm run verify:invitation-card
npm run verify:rate-limit-scale
npm run verify:scanner-throughput
```

`node --env-file=.env.local scripts/create-account-user.mjs <email> <password> "<name>"`
creates a new Account (internal team) login directly via the Supabase
admin API — there's no public signup path for that role, by design.

**`NEXT_PUBLIC_SITE_URL`** (added 2026-08-02, launch-readiness Part 1) —
used to build absolute copyable links (invite links, invitation-card QR
payloads). Set to `http://localhost:3000` in local `.env.local`; **must
also be set in the Vercel project's environment variables**
(`https://ever-after-weddings-seven.vercel.app`) or copy-link/QR features
will point at localhost in production. Not yet confirmed set there as of
this writing — check before relying on either feature live.

**Testing as Account/couple in this environment**: there's no saved
password for the one real Account login
(`brulkeanjames@gmail.com` — see §4) in this session's memory, so
walkthroughs this pass used disposable throwaway Account/couple users
created via the admin client (same pattern `verify-rls.mjs` already uses),
signed in through the browser, and deleted again afterward. Nothing
persists from these; if you hit an "already exists" error on an email
like `walkthrough-account-temp*@example.com`, it's leftover from an
interrupted session — safe to delete via `admin.auth.admin.deleteUser`.

---

## 9. How Milestone 8 was built

Built in an isolated git worktree (branch `worktree-vendor-directory`),
merged into `main` as a fast-forward once done (`3c9de03..a478b17` —
`git log --oneline 9652156..a478b17` from `main` shows the full M8 range,
including the design-spec and plan commits that preceded implementation),
pushed, and deployed. The worktree itself has since been removed — it was
fully merged first, so nothing was lost; `git worktree list` now shows only
the main checkout.

**Process:** `superpowers:brainstorming` → `superpowers:writing-plans` →
`superpowers:subagent-driven-development` for Tasks 1–7 (fresh implementer
subagent + independent reviewer subagent per task, fix-loop on
Important/Critical findings), then a direct switch back to the same
plan-mode workflow M7 used for Tasks 8–9 — the user asked to stop using the
`superpowers` plugin's per-task subagent dispatch partway through (it had
also been uninstalled from this environment mid-session, so this was as
much a practical necessity as a preference). Both approaches produced the
same rigor — real diffs read line-by-line, real live browser verification
end-to-end through the actual running app, nothing taken on the strength of
a report alone — just via different mechanics. The design spec
(`docs/superpowers/specs/2026-08-02-vendor-directory-design.md`) and
implementation plan (`docs/superpowers/plans/2026-08-02-vendor-directory.md`)
are both committed to `main` and worth reading for the *why* behind M8's
decisions — same role this handoff plays for the rest of the app.

**Bugs caught during the build**, not just theoretical: see §6 for the two
RLS gaps caught while writing the design spec (before any code existed) and
a build-breaking regression from Task 7 caught during Task 8's review.

**The task-by-task progress ledger did not survive** — it lived at
`.superpowers/sdd/2026-08-02-vendor-directory/progress.md`, gitignored
worktree-local scratch, and was not copied out before the worktree was
removed. Its content (every fix round, every finding, every review verdict)
is summarized in §5's architecture decisions and §6's security posture
above; the line-by-line detail is gone. Worth remembering for next time: if
a ledger like this matters, copy it out (or paste key parts into a commit
message) before removing the worktree that holds it.

**Before merging:** the user hasn't been asked how they want this done —
a straight `git merge` into `main`, or opened as a PR first (this repo has
no GitHub remote branch for this work yet, so a PR would need a push
first). Ask rather than assume. After merging, the usual production
deploy is automatic (Vercel auto-deploys `main`) — no separate deploy step,
but worth a quick check that the build succeeds on Vercel the way it does
locally, same as every prior milestone's push.

---

## 10. Workflow going forward (post-`superpowers`)

M0–M8 (and the first part of M8's Tasks 1–7) used the `superpowers`
plugin: `brainstorming` → `writing-plans` → `subagent-driven-development`
(fresh implementer + independent reviewer subagent per task). Partway
through M8 the user asked to stop using that per-task subagent dispatch —
it had also been uninstalled from the environment around the same time —
and Tasks 8–9 switched to direct plan-mode work instead. The 2026-08-02
hardening pass (see the top of this doc, §6 bug #5, §7) confirmed that as
the going-forward default:

- No more `superpowers` slash-commands or per-task subagent dispatch.
- Plan mode is the approval gate: propose a plan, get explicit sign-off,
  implement directly in-session.
- For anything non-trivial (new table, new RLS policy, new route
  surface), still write a short design/plan doc — the value wasn't the
  `superpowers` plugin, it was having a written record of *why* a
  decision was made before code existed. M8's own two RLS gaps (§6) were
  caught specifically because the design spec forced tracing through the
  data flow before implementation. Commit design notes alongside the
  implementation rather than as a separate ceremony step; `docs/` (not
  `docs/superpowers/`) is the natural home for anything post-`superpowers`.
- Same verification bar as always: real diffs read line-by-line, `npm run
  build`, `npm run verify:rls` (extend it when the change touches a new
  table/policy), and a live browser walkthrough of the actual change —
  nothing taken on the strength of a report alone. The 2026-08-02 pass
  caught two real bugs this way (§6 bug #5, and a stale-error-banner UX
  issue in the M8 minor-findings fix) that would have shipped unnoticed
  without live verification.

---

## 11. Launch-readiness spec — Parts 1, 2, 3, 5 (2026-08-02)

`docs/ever-after-launch-readiness-spec.md` scopes the work between
"v1 feature-complete" and "can take a real client," in seven parts. Parts
1, 2, 3, and 5 are done, following exactly the workflow §10 describes
(plan mode → explicit sign-off → implement → verify live → commit). Three
commits on `main`: `8c59ffc` (Part 1), `7477a20` (Part 2), `f015d7a`
(Part 3), `da3de60` (Part 5).

### Part 1 — Member invite flow

The hard blocker the spec called out: there was no way to attach a couple
or coordinator to an engagement except SQL. Now: a **People tab** lets
Account generate a single-use, 14-day-expiring invite link
(`engagement_invites`, migration `0012`); the invitee accepts at
`/invite/[token]` (public route, admin-client lookup, same discipline as
guest tokens), sets their own password, and is attached via the invite
row's own `engagement_id`/`role` — never client-supplied, matching the
migration-`0007` discipline. New: `src/lib/invite-token.ts`,
`src/app/invite/[token]/*`, `src/app/(app)/engagements/[id]/people/*`.

**Real bug caught during verification, not just planning**: the token's
initial encoding was plain base64, which can contain `/` — a `/` inside
`/invite/[token]` gets parsed as a second URL path segment, breaking the
route. Caught by actually generating a link and opening it, not by reading
the code. Fixed by switching to the same base64url scheme
`guests.invite_token` already used (`0012` corrected in place, re-run).

### Part 2 — Token rotation

The auth doc's own "still open" item, and the last gap with real security
relevance: a leaked guest link couldn't be revoked. Added single-guest and
bulk "regenerate link" actions (`src/app/(app)/engagements/[id]/guests/
[guestId]/rotate/`, `.../rotate-all/`), each behind a confirmation page —
reusing the tables/assign preview-then-confirm idiom already in this
codebase (there is no `window.confirm()`/modal anywhere here) rather than
inventing a new one. Tokens are generated in app code
(`crypto.randomBytes(16).toString("base64url")`, matching the DB column
default's shape exactly) and written through the ordinary RLS-scoped
client — **no new migration**.

### Part 3 — Guest invitation QR delivery

Nothing previously *produced* a QR for a guest to receive, even though
the M7 scanner could decode one. Added a per-guest downloadable invitation
card (PNG: couple names, date, venue, guest name, QR encoding
`/r/[token]`) and a bulk zip for the whole guest list, plus a lighter
"Copy link" action. New dependencies: `qrcode` (encoding — `jsqr` stays
decode-only), `jszip` (bulk zip), and Next's built-in `next/og`
`ImageResponse` for card compositing (no new dependency). Two bundled OFL
fonts (`src/assets/fonts/PTSerif-Regular.ttf`, `PTSans-Regular.ttf`) since
server-side image rendering needs real font binaries, not CSS — picked as
a placeholder pairing, not a final design decision (Part 4 owns real
per-couple typography).

**Verified by decoding, not inspection**: `scripts/verify-invitation-card.mjs`
actually renders a card and decodes its QR with `jsqr` — proving the
payload round-trips through the scanner's own `extractToken()` logic.
**Still owed**: an actual physical print + phone-camera scan against the
live M7 scanner — no printer/camera has been available in any environment
used for this project so far.

Card design (colors, one serif/one sans) follows Part 4's own default
token values, hardcoded — `sites.theme` is still an untyped `jsonb` stub
with no read/write anywhere in the codebase, so there's no per-couple
theme convention to hook into yet.

### Part 5 — Open guest cap

`guest_cap` (defaulted to 50, never editable anywhere) now has an inline
Account-only edit form on the Overview tab
(`src/app/(app)/engagements/[id]/actions.ts`), and is purely **advisory**
— the guest list shows an amber over-cap banner, nothing is ever blocked,
same discipline `tables.capacity`'s existing badge already followed.

Also: the first pagination this app has ever had
(`guests/guest-list-tab.tsx`, `.range()`-based, 50/page) — nothing
anywhere paginated before this. And a third seeded engagement, **Carlos &
Diana** (~300 guests, 30 tables, 15 groups — see §4), specifically to
stress-test Parts 2/3/5 against a real mid-tier-wedding scale instead of
the dozen-or-so guests every other feature was built and tested against.

**The scale risk Part 3 explicitly deferred** ("decide before building
Part 3, not after it fails") now has a real answer: bulk zip rendering is
batched (concurrency 8) with an explicit `maxDuration = 60`, and measured
live at **13.8 seconds for 300 cards** — comfortable margin under the
60s Vercel Hobby-plan ceiling. The rate limiter was confirmed genuinely
per-IP (not a global counter) via `verify-rate-limit-scale.mjs`, and
scanner throughput was confirmed steady (223ms/scan average, dominated by
network latency to Supabase, not degradation) via
`verify-scanner-throughput.mjs` across 300 simulated sequential arrivals.

### A testing-environment quirk worth knowing about

In the sandboxed preview browser used for these verification passes,
plain synthetic clicks (`computer` tool) on server-action submit buttons
frequently didn't dispatch a request at all — no error, just silent
no-ops, repeatedly, across multiple unrelated forms (login, guest-cap
save, bulk-assign confirm). Forcing the same button via
`element.click()` / `form.requestSubmit()` through `javascript_tool`
always worked correctly. Not a product bug — every action fired correctly
and produced the right server-side result once actually triggered — but
worth trying that fallback immediately if a form seems to do nothing
during a future live walkthrough, rather than assuming the feature is
broken. **One refinement found during Part 6's walkthrough:** don't grab
`document.forms[0]` blindly — the header's "Sign out" button is its own
form and is almost always first in DOM order, so a blind `forms[0]`
submit signs the session out instead of submitting the intended form.
Select the target form by a distinguishing attribute (a hidden input's
`name`/`value`, or the submit button's own text) instead.

---

## 12. Launch-readiness spec — Part 6 (2026-08-03)

Entourage & processional, per `docs/ever-after-launch-readiness-spec.md`
Part 6 — the most visible Filipino-wedding gap the spec called out. Done,
verified live against Maria & Jon's seeded guests, and merged. One
commit on `main` (migration `0013_entourage_processional.sql` plus the
app-layer changes below).

**Roles are an attribute on `guests`, not a separate table.** Entourage
members are guests like any other — they RSVP, get seated, get scanned —
so `entourage_role`/`entourage_sort` are plain nullable columns, free text
against a suggested list (`src/lib/entourage-roles.ts`) rather than a
check constraint, since Filipino weddings vary and a constraint would
force a migration every time a couple adds a role the list didn't
anticipate. New **Entourage tab**
(`src/app/(app)/engagements/[id]/entourage/`) has two views: roles
(assign/remove, grouped by role with per-role counts) and processional
(ordered pairs/singles/free-text entries, with move-up/move-down actions
that swap adjacent `sort_order` values — this codebase had no
drag-and-drop or reorder pattern anywhere before this, so it introduces
the simplest version: a form-per-row swap, not a client-side library).

**`processional_entries` is a new table**, RLS via the same single
`for all` policy shape as `tables_all`/`schedule_items_all` — no
asymmetric public-read path needed, because the names that surface on the
public site come from `guests` directly, not from this table.

**The public site's entourage section reads `guests` via the admin
client**, same discipline as the public site page's existing engagement
lookup (`src/app/s/[slug]/page.tsx`): `guests` has no public-read RLS
carve-out, rightly so, since the same row holds phone, notes and
`invite_token`. The site page's admin lookup is narrowed to exactly
`full_name` + `entourage_role` for non-archived guests with a role set —
nothing else off that row ever reaches an anonymous visitor.

**`footer` was folded into this migration**, per the spec's own
instruction — it needed the same `site_sections.section_type` check
constraint change as `entourage`, and had been a known gap since M5 (the
template spec describes a footer section; M5 never added it to the check
constraint). Both are additive to `SiteRenderer`
(`src/components/site-renderer.tsx`), the site editor's
`defaultSections`/`buildSectionContent`/`SECTION_SORT_ORDER`
(`src/app/(app)/engagements/[id]/site/actions.ts`), and its editor forms
(`site-tab.tsx`) — same upsert-per-section-type pattern M8 already
established, so sites created before this migration only gain an
`entourage`/`footer` row the first time Account saves that section (same
gap `suppliers` had pre-M8, same fix shape).

**Day-of hub gets a "View processional ↗" link** next to "Add item" in
the run-of-show header — a link only, no data coupling.
`schedule_items` and `processional_entries` stay separate tables, per the
spec's own scope boundary.

**Verified live, not just built:** signed in as a disposable throwaway
Account user (same pattern §8/§11 already establish — no saved password
for the real Account login in this session), assigned Rico Santos
(Maria & Jon) the `principal_sponsor` role via the Entourage tab, added
two processional entries (one guest pair, one free-text "Church
coordinator"), confirmed move-up actually reordered them, then confirmed
the entourage section and footer both render correctly on the live public
site (`/s/mariaandjon`) once each section was saved once. All test data
and the throwaway Account user were cleaned up afterward — nothing
persists in Maria & Jon's engagement from this pass.
`npm run verify:rls` extended with 5 new checks for `processional_entries`
isolation (44 total, all passing) and `npm run build` passes clean.

---

## 13. Launch-readiness spec — Part 7 (2026-08-03)

Printables & exports, per `docs/ever-after-launch-readiness-spec.md`
Part 7. Seven documents, all Account/couple-only, reusing Part 3's
rendering machinery per the spec's own instruction rather than building
a second pipeline. Done, verified live, merged.

**New shared infrastructure, factored out of Part 3's card renderer
rather than duplicated:**
- `src/lib/print-theme.ts` — `loadFonts()` and the `COLORS` palette,
  extracted from `src/lib/invitation-card.tsx` (behavior unchanged),
  plus a new `contentDisposition()` helper (see the bug below).
- `src/lib/printable-pdf.tsx` — `renderPagePng()` (generic A4-at-150dpi
  `next/og` `ImageResponse` wrapper), `assemblePdf()` (new dependency
  **`pdf-lib`** — pure JS, no native deps, no Web Worker, same constraint
  that shaped the `jsqr`/`qrcode` choices under Turbopack — embeds each
  rendered page PNG full-bleed into an A4-point PDF page), and
  `renderTablePdf()` (paginates arbitrary rows into table pages, shared
  by the attendee sheet and the processional running order).
- `src/lib/csv.ts` — `toCsv()`, proper quoting/escaping. Nothing like it
  existed before; `parseGuestRows` (Part 5) is CSV *parsing*, not
  generation.

**The seven documents**, all under a new **Printables tab**
(`src/app/(app)/engagements/[id]/printables/`): table number signage and
place cards (PDF, one page/grid per table or guest), an attendee sheet
per checkpoint (PDF, alphabetical + table + tick column — the tab lists
one link per checkpoint), a day-of call sheet (PDF, suppliers +
run of show on one page), a caterer headcount export and a full guest
list export (both CSV), and the processional running order (PDF). Every
route uses the ordinary RLS-aware `createClient()`, never the
service-role client, so "unreachable without an authenticated session"
falls out of existing `guests`/`tables`/`schedule_items`/
`engagement_vendors`/`processional_entries` RLS for free — no new RLS
policies, no `verify-rls.mjs` changes needed for this part.

**Theming**: the spec wants place cards and table numbers to follow the
couple's site theme, house palette for the internal documents. Since
`sites.theme` is still an unwired `jsonb` stub (same gap Part 3 already
noted), all seven use the house palette for now — not a new deferral,
the same one Part 3 recorded.

**Real bug caught live, not just in code review**: `renderTablePdf`'s
first page for the attendee sheet is titled `"Attendee sheet — {checkpoint
name}"` — an em dash. A plain `Content-Disposition: attachment;
filename="..."` header value must be Latin1/ASCII; the em dash threw a
`TypeError` at the fetch layer (`Cannot convert argument to a ByteString
because the character at index 49 has a value of 8212...`), a 500 on
every attendee-sheet download. This wasn't a one-off — every route
building a filename from a couple's `display_name` or a guest's
`full_name` had the same latent bug, including Part 3's two existing
routes (never triggered there only because no seed name happens to
contain a non-Latin1 character). Fixed with a proper RFC 5987
`contentDisposition()` helper in `print-theme.ts` (ASCII fallback +
`filename*=UTF-8''...` for the real name), applied to all nine routes
that send a download — the two Part 3 ones included, not just the five
new ones. Caught by actually calling the route in a live walkthrough,
not by reading the code — the same lesson §6/§10 already draw about live
verification over reasoning-about-code.

**Verified live**, against both seed engagements: all seven downloaded
successfully for Maria & Jon (populated) with correct content types and
non-trivial byte sizes; the caterer headcount and guest list CSV row
counts matched the guest list tab's own Accepted/Invited counters exactly
(2 and 11 respectively); for Erick & Erika (sparse), table numbers, place
cards, and the processional route all degraded to a clean 400 "nothing
to print" JSON error rather than emitting a broken document, while the
call sheet and both CSVs still rendered correctly with empty-state
messaging ("No suppliers logged yet.", header-only CSV) — the spec's own
"degrades sensibly for a sparse engagement" done-when. `npm run build`
passes clean. **Still owed**: an actual physical print of the attendee
sheet and place cards to confirm A4 margins/cut-lines for real — no
printer available in this environment, same caveat Part 3 already
recorded for its own QR print-and-scan test.

---

## 14. Launch-readiness spec — Part 4 (2026-08-03) — spec complete

Guest-facing UI/UX pass, per `docs/ever-after-launch-readiness-spec.md`
Part 4 — the last part of the spec, done deliberately last so it styles
every surface built by Parts 1–3/5/6/7 in one sweep. Restyled: the
day-of hub, the invitation/RSVP page, the public wedding site (via
`SiteRenderer`), the vendor directory, and the member-invite acceptance
page. **The entire launch-readiness spec is now implemented.**

**Design was done in two passes, at the user's explicit request, before
any app code was touched** — a deliberate change from every other part's
workflow so far (plan → sign-off → implement directly). Two rounds of a
static HTML mockup (Claude Artifact) were reviewed and iterated against
the spec's exact tokens before writing a single line of real code:
round 1 matched the spec literally (flat two-stop hero wash, no
imagery); round 2 added a painterly hero-banner treatment with real
scroll parallax, after the user asked for something less flat. The
follow-up decision, made explicitly rather than assumed: **ship the
banner art, drop the parallax motion** — real scroll-linked JS fights
the spec's own "nothing that delays content" rule, and wasn't worth
that tension for a v1 pass. Worth remembering for future design-heavy
work: showing a mockup before writing code caught this tension while it
was still cheap to resolve, instead of after a parallax implementation
existed to un-write.

**New shared theme layer, scoped to guest routes only:**
- `src/lib/guest-fonts.ts` — PT Serif (400) + PT Sans (400/700) via
  `next/font/google`, the same pair already bundled as TTFs for Part
  3's invitation card, now also loaded as webfonts. **Real constraint
  hit here**: PT Sans only ships 400/700 on Google Fonts, no 500 — the
  spec's own type scale calls for weight 500 on the day-of hub's table
  number specifically. Substituted 700 (documented in the file) rather
  than silently picking a different, unspecified weight.
- `src/app/globals.css` — a new `.ea-theme` class (never `:root`) with
  all nine `--ea-*` tokens plus `.ea-hero-banner`/`__art`/`__arch`/
  `__scrim` (the static painterly wash — see above) and `.ea-fade-in`
  (300ms rise, gated behind `prefers-reduced-motion`).
- Four new thin layouts — `src/app/r/layout.tsx`, `s/layout.tsx`,
  `directory/layout.tsx`, `invite/layout.tsx` — each just apply the
  `.ea-theme` class and the two font variables to their subtree.
  `src/app/(app)/*` never gets this class; confirmed by direct
  side-by-side screenshot during verification, logged in as both a
  throwaway Account user and a throwaway couple user.

**One deliberate exception to "`(app)/*` untouched"**: the read-only
site preview inside `(app)/engagements/[id]/site/site-tab.tsx` gets a
local `.ea-theme` wrapper around its `SiteRenderer` call, matching the
public `s/[slug]` page. Reasoning: that preview's whole job, per the
M5/M8 constraint already on record, is to render *identically* to the
public site — leaving it unthemed would make the internal tool lie
about what a couple's site actually looks like. Nothing else in that
file, or anywhere else under `(app)/*`, changed. Verified live: the
preview and the public page render pixel-identical hero banner, fonts,
and section styling side by side.

**`SiteRenderer`'s hero now actually reads `heroContent.image_url`**
(a field that already existed and was already editable in the site
editor, just never rendered as a background before this pass) — not a
new feature, just finally using data that was already there. Falls back
to the painterly wash when empty, matching the spec's own note that an
empty hero "should look deliberate, not empty." Section-gating logic
(`showStory`, `showTheDay`, etc.) is unchanged — presentation only, per
the spec's own "no functional changes" constraint.

**Two small content additions, both named in
`docs/ever-after-template-spec.md` §6, both already flagged in the plan
rather than slipped in silently:**
- `getDayHubByToken` (`src/lib/guest-token.ts`) now returns
  `weddingDate` in both the locked and unlocked branches, so the
  locked-state message can state the actual date instead of just "check
  back then." On investigation, the declined/no-reply guest's schedule
  visibility turned out to **already** be correct — `hub.schedule`,
  venue, and coordinator blocks were already siblings of the
  accepted-only table card, not nested inside it, so non-accepted
  guests already saw the schedule per §6's requirement. Only the
  wording needed a pass, not new conditional logic — a smaller change
  than the plan anticipated, worth noting since it's a case of the
  exploration phase catching something before it became unnecessary
  work.

**Verified live**, at a 380px mobile viewport, real seed data:
`npm run verify:guest-token` (18/18, unchanged — confirms this pass
touched only presentation, not guest-token security logic);
`npm run build` clean; RSVP flow (awaiting-reply, confirmed, and the
locked/before-hub-unlocks state via an engagement with no `sites` row
at all); day-of hub (unlocked+accepted with a real table number,
unlocked+no-reply with the warm note and schedule still showing,
locked-with-date); the public site (`/s/[slug]`) including a real
`hero.image_url` background, the entourage/footer sections correctly
rendering nothing since no data exists for them right now (empty-state
discipline holding); `/directory`'s empty state; `/invite/[token]`'s
invalid-token state. All throwaway test users cleaned up afterward.

---

## 15. Real per-couple theming (2026-08-03, post-launch-readiness)

`sites.theme` (`jsonb`, `default '{}'`) existed since M5 and was still
completely unread/unwritten anywhere in the codebase when Part 4
shipped — confirmed by exploration before starting this. Every couple
got the identical hardcoded palette Part 4 built. This wires up the
accent half of what `docs/ever-after-template-spec.md` §4 describes.

**Scope decision, made explicitly rather than silently expanding**:
shipped **accent-color presets only**. `heading_font` (§4 also names
this — "2-3 curated serif options") needs a second bundled TTF for
print rendering, since `next/og`'s `ImageResponse` needs a raw font
buffer, not a webfont — real sourcing risk for comparatively small
payoff next to the color work, so it's deferred as a documented
fast-follow. `corner_style` (`soft`/`sharp`) would touch every
`rounded-[10px]` instance across all five Part-4-restyled files for a
purely cosmetic toggle — deferred too. `sites.theme` stores
`{ accent: "<preset-key>" }` for now; `src/lib/site-themes.ts`'s types
are shaped so both fields are additive later, not a rework.

**Four presets** (`src/lib/site-themes.ts`): Blush (the existing
default, unchanged), Sage, Dusty Blue, Amber. Every preset reuses the
exact same canvas/ink/ink-secondary/ink-muted/border as the default —
already AA-verified, and the template spec's "muted accents" language
implies the neutral base doesn't move — only `blush`/`champagne`/
`accent`/`accent-ink` vary. Contrast ratios were computed with the real
WCAG relative-luminance formula (a throwaway Node script, not
eyeballed) and iteratively darkened until every preset cleared
white-on-accent ≥4.5:1 and accent-ink-on-canvas ≥6:1 — matching the
default's own margin, not just scraping the AA floor.

**Site editor**: a new "Theme" section in `site-tab.tsx` (Account-only,
swatch buttons — no free color picker, per the spec's own instruction),
a new `updateSiteTheme` action in `site/actions.ts` writing
`{ accent: key }` straight onto `sites.theme`.

**Wired into every surface the spec's Part 4 table marks "themed:
yes"**: `src/app/r/layout.tsx` and `s/layout.tsx` moved to
`r/[token]/layout.tsx` / `s/[slug]/layout.tsx` specifically so they
could read their own route param and resolve the engagement's actual
preset (previously impossible — a layout above the dynamic segment has
no access to it). `src/lib/guest-token.ts` gained `getThemeByToken()`
for this. Resolved tokens are applied as inline CSS custom properties
on the existing `.ea-theme` wrapper — the class stays for structural
rules, the inline style is what actually varies per engagement. The
site-tab preview picked up the same treatment (it already had the
`.ea-theme` class from Part 4; this just adds the per-engagement
override). `directory/layout.tsx` and `invite/layout.tsx` are
**untouched** — those stay on the class's own fixed default forever,
per the spec's explicit "No" row for those two surfaces.

**Print surfaces**: `renderInvitationCardPng()` (`src/lib/
invitation-card.tsx`) now takes an optional `colors` param (defaults to
the house palette, so nothing broke for any caller that doesn't pass
one) — both of its routes (`guests/[guestId]/invitation`,
`guests/invitations` bulk zip) now look up the engagement's `sites.theme`
and pass the resolved preset through. Same pattern in the
`printables/table-numbers` and `printables/place-cards` routes. Every
other printable (attendee sheet, call sheet, both CSVs, processional
order) is **untouched** — internal documents stay house palette always,
per the spec's own explicit split, which the original Part 7 pass
already anticipated by keeping `printable-pdf.tsx`'s shared helpers
palette-agnostic.

**Verified live**: set Maria & Jon to Dusty Blue via the new Theme
picker, confirmed the color actually changed on `/s/[slug]` (hero
countdown text, "The day" section fill), `/r/[token]/day` (table card,
announcement fill), a downloaded invitation-card PNG (QR block, guest
name), and that `place-cards`/`table-numbers` PDFs still generate
(200 OK) with the new theme wired in. Confirmed `/directory` did
**not** change color across this — the spec's own "No" row holding.
Reset back to the default afterward so Maria & Jon's live site isn't
left in a test state. `npm run verify:guest-token` (18/18, unchanged)
and `npm run build` both clean.

---

## 16. Media library (2026-08-03, post-launch-readiness)

`docs/ever-after-data-model.md` planned a `media` table from the start
(`storage_path, kind, uploaded_by, source, caption, is_approved`) but
explicitly deferred it past MVP — "media can come after, it has no
dependents." Every image on the site was a pasted external URL until
now. Supabase Storage was completely unused anywhere in this codebase
before this pass (confirmed by exploration: zero matches for
`.storage`/`getPublicUrl`).

**Scope decision**: **Account/couple uploads only, wedding-site images
only.** The schema's own `source` (`couple`/`account`/`guest`) and
`is_approved` columns anticipate a guest-upload moderation flow — real,
separately-sized scope (a guest-facing upload surface, an approval
queue, moderation notifications) — deliberately not built here.
`is_approved` defaults `true` for this pass's only two sources, since
there's no moderation queue yet to hold anything back from. Vendor
photos (`vendor_photos.photo_url`) were **not** touched — that table
has its own prior, explicit in-code comment from M8 choosing pasted
URLs over Storage, a scope call this pass isn't re-litigating.

**Additive, not a replacement.** `site_sections.content.hero.image_url`
etc. are still plain URL strings — `SiteRenderer` and
`buildSectionContent`/`updateSiteSection` needed **zero changes**. A
new upload path just writes a Supabase Storage public URL into the
same field a couple could otherwise paste an external URL into. Both
paths coexist in the editor UI; pasting isn't removed.

**`supabase/migrations/0014_media.sql`** — the `media` table, RLS via
the same single-policy `has_engagement()`/`is_account()` shape every
other engagement-scoped table uses. Also creates the `media` Storage
bucket (public — published-site images must load for anonymous
visitors without signed URLs, same as every other image on the site)
and three `storage.objects` policies (insert/select/delete) scoped by
path: every object must live at `{engagement_id}/{filename}`, checked
via `storage.foldername(name)` — the standard Supabase idiom for
folder-scoped bucket permissions — against the exact same two RLS
helpers (`is_account()`, `has_engagement()`) every table policy in this
schema already reuses. This is the first place those helpers govern
`storage.objects` rather than a plain table.

**No browser-side upload path introduced.** `src/lib/supabase/client.ts`
(the browser Supabase client) still has zero callers — file uploads go
through ordinary `"use server"` actions
(`uploadHeroImage`/`uploadStoryImage`/`uploadGalleryPhotos` in
`site/actions.ts`), the same pattern every other write in this app
already uses. The one existing precedent for a real `File` object
arriving through a server action (`guests/import`'s CSV upload) proved
this works before building on it. Each action: validates file type
(`image/jpeg`/`png`/`webp`) and size (8MB cap) server-side, uploads via
the ordinary RLS-aware `createClient()` (never admin — Storage RLS
enforces the same engagement scoping as everything else), inserts a
`media` row, and folds the resulting public URL straight into the same
`site_sections.content` upsert `updateSiteSection` already does — a
successful upload is immediately live, not a separate save step.

**Accepted, documented gap**: replacing an image leaves the old Storage
object and `media` row orphaned — no cleanup job this pass, matching
the schema's own "no dependents" framing. Worth a GC pass later if
storage cost ever matters at this scale, not before.

**A real verification-environment limitation, not a product gap**:
this session's browser-automation tools could not drive a native file
picker (`file_upload` requires the user to interactively grant a file
to the session first, which wasn't available here) — so the actual
site-editor upload buttons were never clicked in a live browser this
pass. Instead, verified every layer the UI depends on directly against
the live Supabase project: signed in as both a throwaway couple and a
throwaway Account user, confirmed the Storage policies exactly as
written (couple can upload to their own engagement's folder, cannot
upload to another's, the public URL resolves with a real `fetch`), then
replayed the exact sequence `uploadHeroImage` performs — upload →
insert a `media` row → merge the public URL into
`site_sections.content.hero.image_url` — end to end via script,
confirmed the stored value matched the uploaded file's public URL, and
cleaned up (media row, storage object, hero `image_url` reset, test
users) so Maria & Jon's live site carries nothing from this pass. What's
still owed: an actual click-through of the upload buttons in a real
browser, first chance someone has one with file-picker access. `npm run
build` clean; `verify-rls.mjs` extended with 3 new `media` isolation
checks (47 total, all passing).

---

## 17. Marketing site (2026-08-04)

The public front door, per `docs/ever-after-marketing-site-plan.md` —
anonymous visitors, no auth, no data, whose only jobs are to explain the
product and hand people to `/login` or an enquiry. Same Next.js app, new
public routes, same design tokens — not a second project. Design
reference: `design_handoff_ever_after/Ever After.dc.html` (an internal
HTML prototyping format, not shippable code — copy, colors, spacing,
and behavior were ported by hand into real components against this
codebase's own conventions).

**Five new pages** under a new `src/app/(marketing)/` route group:
`/` (home), `/how-it-works`, `/pricing`, `/vendors`, `/contact`.
`/vendors` here is the public supplier pitch page (why list, benefits,
apply) — distinct from `/directory`, the existing public vendor
listing (launch-readiness Part 6), which it links out to.

**`/` changed meaning — the biggest structural change.** It used to be
the authenticated dashboard (`(app)/page.tsx`). That's now
`(app)/dashboard/page.tsx`, and every internal link/redirect that
pointed at `/` (`(app)/layout.tsx`'s wordmark, `login/actions.ts`'s
post-sign-in redirect, engagement-list "Clear" links, the "back to
engagements" breadcrumb, a couple of Account-only-route guards) was
repointed to `/dashboard`. `src/lib/supabase/middleware.ts` gained a
`user && pathname === "/"` check that redirects a signed-in visitor to
`/dashboard` before the marketing route ever renders for them — an
anonymous visitor sees the marketing homepage, per the plan's own
"signed-in users hitting `/` should be sent to their dashboard rather
than shown a sales pitch."

**Route collision, caught before it broke anything**: the plan's own
sitemap names `/vendors` for the public pitch page, but
`(app)/vendors` already existed — the Account-only vendor-approval
queue from M8. Renamed that internal route to `(app)/vendor-approvals`
(directory rename + its two `redirect("/")` calls + the layout's nav
link) so the two `/vendors` don't fight over the same URL.

**Marketing routes are public in the middleware**, alongside the
existing `/r/`, `/s/`, `/directory`, `/invite/` carve-outs — `"/"`,
`/how-it-works`, `/pricing`, `/vendors`, `/contact` are all reachable
with no session.

**New theme layer, `.mkt-theme` (`globals.css`), scoped to
`(marketing)/layout.tsx` only** — same `--ea-*` color values every
other themed surface defaults to (this site has no engagement to
resolve a per-couple theme from), but its own fonts: Newsreader/Sora
(`src/lib/marketing-fonts.ts`), not the guest-facing PT Serif/PT Sans.
Deliberately a different pair — the marketing site is the front door
before a visitor ever reaches the product, not required to match the
in-product identity pixel-for-pixel.

**Scroll effects, ported from the design reference's rAF-based
approach rather than pulled in as a library** — no new dependency
earns its weight for six sections' worth of motion. Four small client
components under `src/components/marketing/`:
- `reveal.tsx` — fade-and-rise on scroll-into-view via
  `IntersectionObserver`. Reduced motion is handled entirely by CSS
  (`.mkt-reveal`'s `@media (prefers-reduced-motion: reduce)` override
  forces the settled state) — no JS branch needed.
- `parallax.tsx` — the layered hero/promise depth, transform-only,
  same continuous-rAF-reading-`getBoundingClientRect()` technique the
  design reference uses. Disabled under reduced motion and below the
  plan's own 880px breakpoint (checked via `matchMedia` in the
  effect, since this one can't be pure CSS).
- `count-up.tsx` — the pricing-figure animation, `IntersectionObserver`
  triggered, cubic ease-out. Reduced motion jumps straight to target.
- `how-it-works-timeline.tsx` — the sticky two-column layout, active
  step tracked via `IntersectionObserver` with a centered root margin
  band, rather than the reference's per-frame distance calculation.

**Real bug caught live, not in review: `position: sticky` silently
broke.** The how-it-works sticky pane never stuck — it scrolled away
with the page. Root cause, found by walking the ancestor chain in a
live browser session (`getComputedStyle` per ancestor, not just
reading the JSX): `(marketing)/layout.tsx`'s root wrapper had
`overflow-x-hidden` (added for the hero's off-edge decorative ring),
and any ancestor with `overflow` off `visible` on either axis becomes
the containing block sticky measures against — silently breaking it
even though the div was never meant to scroll internally. Fixed two
ways: moved `overflow-x-hidden` down to just the hero section that
actually needs it (`(marketing)/page.tsx`), and split the sticky
pane's own wrapper into an outer grid item (stretches to the tall row
by default) and an inner sticky div (what actually pins) —
`self-start`/`h-fit` directly on the sticky element collapses its own
containing block to content height, which independently breaks
sticking even with the overflow fix. Verified live by scrolling
through all seven steps and checking the pane updates.

**Photography**: every image is `PlaceholderImage`
(`src/components/marketing/placeholder-image.tsx`) — the striped-box
plus monospace-caption pattern from the design reference, sized and
positioned where a real photo drops in later. No stock photography
used, per the brand brief. The one real content gap the plan itself
calls out unresolved: no real wedding photos, no testimonial (the
testimonial section is deliberately a dashed-border placeholder, not
invented), and the Contact page's Facebook link is still the
placeholder name-search URL from the design reference (no vanity URL
was ever provided).

**Verified live**: all five pages, both desktop (1440×900) and mobile
(390×844, hamburger menu open/close), `/dashboard` still correctly
redirects an anonymous visitor to `/login`, `npm run build` clean.
`verify-rls.mjs`/`verify-guest-token.mjs` untouched by this pass — no
RLS or guest-token surface was touched, this is presentation and
routing only.
