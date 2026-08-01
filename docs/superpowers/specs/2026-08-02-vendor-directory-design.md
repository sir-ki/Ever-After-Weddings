# Milestone 8 — Vendor directory: design

Status: approved by user, pending spec self-review sign-off.

## Context

Per `docs/ever-after-build-plan.md`, M8 is the last milestone toward v1: "a
vendor can sign up, you can approve them, and a couple can find them." It's
explicitly the lowest-priority, most negotiable milestone in the plan ("no
dependents, no fixed deadline") — everything else in the app (guest list,
RSVP, tables, the site, day-of hub, checkpoints) is done and doesn't depend
on this.

The data model doc (`docs/ever-after-data-model.md` §7), auth doc
(`docs/ever-after-auth-and-access.md`), PRD, and template spec all describe
vendors, but leave several things genuinely undecided or in tension with
this project's established patterns. This spec resolves those, with the
resolution and reasoning recorded here rather than just implemented, so a
future session can see *why* without reconstructing it from a diff.

## Decisions made (with the user, this session)

1. **Vendor photos are pasted URLs, not uploads.** No Supabase Storage
   bucket, no upload UI. Matches the existing pattern for site section
   images and the handoff's explicit "images are plain URL fields, not a
   media library" decision — nothing in this project touches Supabase
   Storage yet, and introducing it for one milestone's photo gallery isn't
   worth the new infra surface.

2. **The suppliers site section is included in this pass**, not deferred as
   a separate follow-up (even though it was tracked as its own item in the
   handoff's known gaps). Rationale: it's the actual payoff of the
   per-event vendor log — without it, vendors get logged internally but a
   couple's public site never shows them, which is a half-finished feature.

3. **Editing an approved listing drops it back to `pending`.** Resolves the
   auth doc's own explicitly-flagged open question (§9: "does editing an
   approved listing drop it back to pending?") in favor of re-review —
   matches the auth doc's own suggested default and prevents a vendor
   changing their listing to something never reviewed after initial
   approval. Since this pass has no vendor self-editing (see next point),
   this only fires when *Account* edits a vendor's row after approval.

4. **This pass builds signup-only; no persistent vendor login or
   self-service editor.** A vendor fills out one form once. If anything
   needs to change afterward, Account edits it directly — Account already
   has full read/write on `vendors`. This is the biggest deviation from the
   build plan's literal bullet list (which names "vendor profile editor —
   cannot self-approve" as an M8 deliverable) and from the auth doc's
   documented role model (`global_role = 'vendor'` with a real login).
   Chosen because:
   - It matches the PRD's own MVP framing for this feature: "Vendor
     directory | Simple listing page, manually maintained."
   - A full vendor-authenticated portal (new route group, new nav, new
     session-gated edit flow) is roughly comparable in size to the guest
     RSVP flow (M3) — a lot of net-new surface for the build plan's own
     lowest-priority milestone.
   - It sidesteps a real security question entirely: this session's
     critical fix (migration `0007`) was specifically about signup-time
     role assignment being untrustworthy. A public form that creates *no*
     Supabase Auth account and assigns *no* `global_role` at all has zero
     surface for that class of bug, versus a new self-serve signup path
     that would need the same scrutiny `create-account-user.mjs` and the
     trigger fix already went through.
   - `owner_user_id` stays in the schema as documented (nullable) so a real
     vendor-login pass is a clean, isolated addition later — nothing about
     this design forecloses it.

## Architecture

Three new tables (migration `0009_vendor_directory.sql`), four new surfaces:

```
Public, no auth                         Authenticated (app)
─────────────────                       ───────────────────
/directory            vendor listing    /vendors            Account-only
/directory/apply       signup form                          approval queue
                                        /engagements/[id]
                                          ?tab=vendors        per-event log
                                                              (existing stub,
                                                               wired up)

                                        site editor: new
                                        "suppliers" section
                                        type
```

**Route collision avoided deliberately**: an earlier draft of this design
proposed `/vendors` for both the public directory and the admin approval
queue — impossible, same path. Public directory lives at `/directory`
instead; `/vendors` is exclusively the authenticated admin queue, gated the
same way every other `(app)` page is (no middleware change needed for it).
`/directory` and `/directory/apply` need one new prefix added to
`proxy.ts`'s public-route carve-out, mirroring how `/s/*` is already
carved out.

## Data model

`supabase/migrations/0009_vendor_directory.sql`:

```sql
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users (id) null,
  business_name text not null,
  category text not null
    check (category in ('photo', 'venue', 'catering', 'florals', 'hmua', 'cake', 'music', 'other')),
  description text,
  rate_from numeric,
  rate_to numeric,
  rate_note text,
  contact_phone text,
  contact_email text,
  socials jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references users (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendors_status_category_idx on vendors (status, category);

create table if not exists vendor_photos (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  photo_url text not null,
  sort_order int not null default 0
);

create table if not exists engagement_vendors (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  vendor_id uuid references vendors (id) null,
  business_name text not null,
  category text not null
    check (category in ('photo', 'venue', 'catering', 'florals', 'hmua', 'cake', 'music', 'other')),
  contact_phone text,
  contact_email text,
  notes text,
  credit_on_site boolean not null default false
);
```

Note: `vendor_photos.photo_url` deviates from the data model doc's literal
`storage_path` — matches decision 1 above (pasted URLs, not Storage).
`vendors.status` drops `suspended` from the doc's four-value set, since
nothing in this pass's approval queue produces or consumes a suspended
state (approve / reject / send-back-with-a-note only) — can be added back
trivially if a future pass needs it, but an unused status value that
nothing sets or checks is dead surface, not forward-compatibility.

**RLS** — `checkpoint_engagement_id()`-style security-definer helper for
the asymmetric public-read pattern already used by `sites`:

```sql
create or replace function vendor_is_approved(vid uuid) returns boolean
language sql stable security definer as $$
  select coalesce((select status = 'approved' from vendors where id = vid), false);
$$;

alter table vendors enable row level security;
create policy vendors_read on vendors for select
  using (is_account() or status = 'approved');
create policy vendors_write_account on vendors for all
  using (is_account()) with check (is_account());

alter table vendor_photos enable row level security;
create policy vendor_photos_read on vendor_photos for select
  using (is_account() or vendor_is_approved(vendor_id));
create policy vendor_photos_write_account on vendor_photos for all
  using (is_account()) with check (is_account());

alter table engagement_vendors enable row level security;
create policy engagement_vendors_all on engagement_vendors for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));
```

No `owner_user_id`-based write policy in this pass (would need
`auth.uid()`-based access, which requires a real vendor login this pass
doesn't build) — Account is the only writer of `vendors`/`vendor_photos`
for now, consistent with "Account manages edits." Adding a
`vendors_owner_write` policy later (per the auth doc's original sketch) is
additive and doesn't require touching this policy.

**Public read uses the plain RLS-aware session client, not the admin
client** — unlike `/s/[slug]`, which needs the admin client only for its
narrow `engagements` lookup (since `engagements` has no public-read RLS
carve-out at all, by design — full rows hold internal fields like `notes`).
`vendors` and `vendor_photos` both get a real public-read policy above, so
an anonymous visitor's query already satisfies RLS directly — no embedded
join risk like the M5 bug (commit `248b944`), since both tables in any
directory query are genuinely publicly readable when approved.

## Flows

**Vendor signup** (`/directory/apply`, public): a single form — business
name, category, description, rate range + note, contact phone/email,
socials, photo URLs (repeatable field) — submitted via a server action
that inserts one `vendors` row (`status = 'pending'`) and any
`vendor_photos` rows. No Supabase Auth account created. No email
confirmation, no password. Confirmation screen: "Thanks — we'll be in
touch once it's reviewed," no dead-end 200 with no feedback.

**Account approval queue** (`/vendors`, inside `(app)`): gated by
`profile.global_role !== 'account' → redirect("/")`, identical to
`engagements/new/page.tsx`'s existing pattern. Lists `pending` vendors.
Each row: full submitted detail, three actions —
- **Approve**: `status = 'approved'`, `reviewed_by`, `reviewed_at` set.
- **Reject**: `status = 'rejected'`, `reviewed_by`, `reviewed_at`,
  `review_note` (why).
- **Send back with a note**: stays `pending`, `review_note` set — since
  there's no vendor login to notify in this pass, this is Account's own
  marker for "I looked, it needs a fix before I approve it," and Account
  edits the row directly afterward.

A second view (or filter) on the same page lists `approved` vendors for
Account to edit directly; saving an edit to an `approved` row resets it to
`pending` per decision 3.

An Account-only "Vendors" link is added to `src/app/(app)/layout.tsx`'s
header (which currently has no nav array at all beyond the logo/sign-out),
visible only when `profile.global_role === 'account'`.

**Public directory** (`/directory`, public): approved vendors, filterable
by category (same query-param filter pattern as the guest list's
status/group filters). Card per vendor: business name, category, rate
range if set, description, first photo (or a placeholder), link/expand to
contact details. No ratings, no reviews — directory only, matching the PRD
("no in-app chat between couples and vendors... couples browse and contact
vendors directly").

**Per-event vendor log** (`/engagements/[id]?tab=vendors`, already stubbed
in `TABS`): a `VendorsTab` component following the `tables-tab.tsx` /
`day-of-tab.tsx` pattern exactly — list of `engagement_vendors` for this
engagement, a form to add one (search-select an *approved* directory
vendor by name, which pre-fills `business_name`/`category`/contact and
sets `vendor_id`, or leave the vendor unselected and type
`business_name`/`category`/contact directly for an off-platform supplier),
`credit_on_site` checkbox per row, delete.

**Suppliers site section**: `site_sections.section_type` already allows
`'suppliers'` in its check constraint (migration `0005`) — just has no
editor UI or renderer yet. This pass adds:
- An editor block in the site tab (heading text field, defaulting to
  "Suppliers" per the template spec) — the section's actual *content* is
  computed, not edited (see below), so the editor is just visibility +
  heading, same shape as other lightweight sections.
- A renderer case in `site-renderer.tsx` that queries
  `engagement_vendors` where `credit_on_site = true` for this engagement
  and renders business name, category, and contact — a straight credit
  list, no ratings, per the template spec (`docs/ever-after-template-spec.md`
  §3.8).

## Testing / verification

- `npm run lint`, `npm run build` (this introduces a new public route
  prefix in `proxy.ts` — needs a cookie-free `curl` check per the M5
  lesson, same as every other public-route change in this project).
- Extend `scripts/verify-rls.mjs` with `vendors`/`vendor_photos`/
  `engagement_vendors` isolation checks (couple A can't write another
  engagement's `engagement_vendors`; a `pending`/`rejected` vendor is
  invisible to an anonymous read; an `approved` vendor's photos are
  readable anonymously but a `pending` vendor's aren't) — this closes the
  same kind of gap the handoff flagged for `checkpoints`/`guest_scans`
  (verified by hand, not added to the automated suite) before it
  accumulates further.
- Manual browser verification: submit a vendor via `/directory/apply`,
  confirm it's invisible at `/directory` while pending, approve it via
  `/vendors`, confirm it now appears at `/directory` and its photos load,
  edit the approved vendor and confirm it drops back to pending and
  disappears from `/directory` again, add it to Maria & Jon's per-event
  vendor log with `credit_on_site` on, confirm it renders in the public
  site's suppliers section.
- Cookie-free `curl` against `/vendors` (should redirect to `/login`) and
  against `/directory` (should 200 with no session) — the concrete version
  of this project's own established "test public surfaces logged out"
  lesson.
