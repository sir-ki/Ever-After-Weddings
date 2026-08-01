# Vendor Directory (Milestone 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Milestone 8 — a vendor can sign up, Account can approve them, and a couple can find them and credit them on their public wedding site.

**Architecture:** Three new tables (`vendors`, `vendor_photos`, `engagement_vendors`) with asymmetric RLS (public read of approved/credited rows, Account-or-owning-engagement write). Four new UI surfaces: a public signup form, a public filterable directory, an Account-only approval queue, and a per-engagement vendor log tab — plus a new `suppliers` site section that renders credited suppliers on the public wedding site. No new Supabase Auth accounts or login flow in this pass; Account manages all edits.

**Tech Stack:** Next.js 16 App Router (Turbopack), Supabase (Postgres/Auth), Tailwind CSS 4 — same as the rest of this repo. No new dependencies.

**Design spec:** `docs/superpowers/specs/2026-08-02-vendor-directory-design.md` — read this first for the *why* behind every decision below. This plan implements it exactly, including the two amendments made while writing this plan (the admin-client note for signup, and the public-read policy for `engagement_vendors`).

## Global Constraints

- No Supabase Storage, no file uploads — vendor photos are pasted URL text fields (`vendor_photos.photo_url`), matching `site_sections`' existing image-URL pattern. Never introduce a storage bucket for this milestone.
- No new Supabase Auth accounts, no vendor login, no vendor self-service editing. Every vendor-facing write in this milestone is either the one-time public signup insert or an Account-only edit.
- `vendors.status` is a 3-value set: `pending` | `approved` | `rejected` (not the data model doc's 4-value set — `suspended` is intentionally dropped, nothing in this pass produces or consumes it).
- Every authenticated mutation uses the RLS-aware session client from `@/lib/supabase/server` (`createClient()`), never the admin client — except the one documented exception: the public signup insert in Task 3, which must use `createAdminClient()` from `@/lib/supabase/admin` because an anonymous visitor has no session to satisfy `is_account()`.
- `status` on a new vendor row is always hardcoded server-side to `'pending'` — never read from form input. This is a hard rule, not a style preference: this session already fixed one critical bug (migration `0007`) caused by trusting client-supplied data for an access-control-relevant field.
- All Tailwind conventions must match the existing codebase exactly: `rounded-lg border border-neutral-200 bg-white p-4` for cards, `rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800` for primary buttons, `rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100` for secondary buttons, `w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none` for inputs. No component library exists in this repo (`src/components/` has one file, `site-renderer.tsx`) — everything is hand-rolled Tailwind, matched to existing tab components (`tables-tab.tsx`, `day-of-tab.tsx`, `checkpoints-tab.tsx`).
- Every migration is pasted manually into the Supabase SQL Editor by the user — there is no local DB CLI access in this environment. Write migrations as idempotent (`create table if not exists`, `create or replace function`, `drop policy if exists` before `create policy`).
- The vendor category set is fixed and must be used verbatim, identically, everywhere it appears (the `vendors` and `engagement_vendors` check constraints, every `<select>` in the UI): `photo`, `venue`, `catering`, `florals`, `hmua`, `cake`, `music`, `other`.

---

## Task 1: Migration `0009_vendor_directory.sql`

**Files:**
- Create: `supabase/migrations/0009_vendor_directory.sql`

**Interfaces:**
- Produces: tables `vendors`, `vendor_photos`, `engagement_vendors`; helper function `vendor_is_approved(vid uuid) returns boolean`. Every later task's queries against these tables assume this exact schema.

- [ ] **Step 1: Write the migration file**

```sql
-- Ever After — Milestone 8 schema
-- vendors, vendor_photos, engagement_vendors, with asymmetric RLS: public
-- read of approved vendors / credited engagement_vendors, Account-or-
-- owning-engagement write. See docs/superpowers/specs/2026-08-02-vendor-directory-design.md
-- for the full design and the reasoning behind every deviation from the
-- data model doc's original sketch.
-- Paste this whole file into the Supabase SQL Editor and run it once.

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

-- set_updated_at() already exists, defined once in 0001_init.sql — reuse
-- it here rather than redefining, same as 0002_guests.sql and
-- 0005_sites.sql already do.
drop trigger if exists vendors_set_updated_at on vendors;
create trigger vendors_set_updated_at
  before update on vendors
  for each row execute procedure set_updated_at();

-- photo_url, not storage_path: pasted URLs, matching site_sections'
-- existing image pattern. No Supabase Storage in this pass.
create table if not exists vendor_photos (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  photo_url text not null,
  sort_order int not null default 0
);

create index if not exists vendor_photos_vendor_idx on vendor_photos (vendor_id);

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

create index if not exists engagement_vendors_engagement_idx on engagement_vendors (engagement_id);

-- Security-definer helper for the asymmetric public-read pattern, same
-- shape as is_site_published().
create or replace function vendor_is_approved(vid uuid) returns boolean
language sql stable security definer as $$
  select coalesce((select status = 'approved' from vendors where id = vid), false);
$$;

alter table vendors enable row level security;

drop policy if exists vendors_read on vendors;
create policy vendors_read on vendors for select
  using (is_account() or status = 'approved');

drop policy if exists vendors_write_account on vendors;
create policy vendors_write_account on vendors for all
  using (is_account()) with check (is_account());

alter table vendor_photos enable row level security;

drop policy if exists vendor_photos_read on vendor_photos;
create policy vendor_photos_read on vendor_photos for select
  using (is_account() or vendor_is_approved(vendor_id));

drop policy if exists vendor_photos_write_account on vendor_photos;
create policy vendor_photos_write_account on vendor_photos for all
  using (is_account()) with check (is_account());

-- engagement_vendors is split by operation (not one `for all`): read is
-- broader than write, because the public wedding site's suppliers
-- section needs to read credit_on_site = true rows with no session at
-- all — "credited only" per the auth doc's permission matrix.
alter table engagement_vendors enable row level security;

drop policy if exists engagement_vendors_read on engagement_vendors;
create policy engagement_vendors_read on engagement_vendors for select
  using (is_account() or has_engagement(engagement_id) or credit_on_site = true);

drop policy if exists engagement_vendors_insert on engagement_vendors;
create policy engagement_vendors_insert on engagement_vendors for insert
  with check (is_account() or has_engagement(engagement_id));

drop policy if exists engagement_vendors_update on engagement_vendors;
create policy engagement_vendors_update on engagement_vendors for update
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));

drop policy if exists engagement_vendors_delete on engagement_vendors;
create policy engagement_vendors_delete on engagement_vendors for delete
  using (is_account() or has_engagement(engagement_id));
```

- [ ] **Step 2: Ask the user to paste this file into the Supabase SQL Editor and run it**

Say: "Please paste `supabase/migrations/0009_vendor_directory.sql` into the Supabase SQL Editor and run it — same as every prior migration this session. Let me know when it's done."

Wait for confirmation before continuing.

- [ ] **Step 3: Verify the tables and RLS exist**

Run:
```bash
export PATH="/opt/homebrew/bin:$PATH" && node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { error: e1 } = await admin.from('vendors').select('id').limit(1);
  console.log('vendors reachable:', !e1, e1?.message ?? '');
  const { error: e2 } = await admin.from('vendor_photos').select('id').limit(1);
  console.log('vendor_photos reachable:', !e2, e2?.message ?? '');
  const { error: e3 } = await admin.from('engagement_vendors').select('id').limit(1);
  console.log('engagement_vendors reachable:', !e3, e3?.message ?? '');
  const { data: anonRead, error: e4 } = await anon.from('vendors').select('id');
  console.log('anon read (should be empty, no error):', anonRead?.length, e4?.message ?? 'none');
})();
"
```

Expected: all three tables reachable with no errors, anon read returns an empty array (no approved vendors exist yet) with no error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0009_vendor_directory.sql
git commit -m "Milestone 8 schema: vendors, vendor_photos, engagement_vendors"
```

---

## Task 2: Extend `verify-rls.mjs` with vendor isolation checks

**Files:**
- Modify: `scripts/verify-rls.mjs`

**Interfaces:**
- Consumes: `mariaJon.id`, `erickErika.id`, `admin` client — all already defined earlier in the file (lines 23–37).
- Produces: nothing consumed by later tasks; this is a standalone verification script addition.

This closes the exact gap the handoff flagged for `checkpoints`/`guest_scans` (verified by hand, never added to the automated suite) — do it for vendors from the start.

- [ ] **Step 1: Insert the new block**

Insert this immediately after the closing `}` of the first `finally` block (after line 228, `await admin.auth.admin.deleteUser(testUserId);` then `}`), and before the line `const secondAccountEmail = ...`:

```javascript
// Milestone 8: vendors / vendor_photos / engagement_vendors isolation,
// including the public-read carve-outs (approved vendors, credited
// engagement_vendors) that no other script exercises.
const asAnon = createClient(url, anonKey);

const { data: pendingVendor } = await admin
  .from("vendors")
  .insert({ business_name: "RLS Test Pending Vendor", category: "photo" })
  .select("id")
  .single();
const { data: approvedVendor } = await admin
  .from("vendors")
  .insert({
    business_name: "RLS Test Approved Vendor",
    category: "florals",
    status: "approved",
  })
  .select("id")
  .single();
const { data: approvedPhoto } = await admin
  .from("vendor_photos")
  .insert({ vendor_id: approvedVendor.id, photo_url: "https://example.com/a.jpg" })
  .select("id")
  .single();
const { data: pendingPhoto } = await admin
  .from("vendor_photos")
  .insert({ vendor_id: pendingVendor.id, photo_url: "https://example.com/p.jpg" })
  .select("id")
  .single();

const couple2Email = `rls-test-couple2-${Date.now()}@example.com`;
const couple2Password = "verify-rls-temp-password-1234";
const { data: created2, error: create2Error } = await admin.auth.admin.createUser({
  email: couple2Email,
  password: couple2Password,
  email_confirm: true,
  user_metadata: { full_name: "RLS Test Couple 2" },
});
if (create2Error) {
  console.error("Failed to create second test couple:", create2Error.message);
  process.exit(1);
}
const couple2UserId = created2.user.id;
await admin.from("engagement_members").insert({
  engagement_id: mariaJon.id,
  user_id: couple2UserId,
  role: "partner",
});

const { data: creditedVendor } = await admin
  .from("engagement_vendors")
  .insert({
    engagement_id: mariaJon.id,
    business_name: "RLS Test Credited Supplier",
    category: "cake",
    credit_on_site: true,
  })
  .select("id")
  .single();
const { data: uncreditedVendor } = await admin
  .from("engagement_vendors")
  .insert({
    engagement_id: mariaJon.id,
    business_name: "RLS Test Uncredited Supplier",
    category: "music",
    credit_on_site: false,
  })
  .select("id")
  .single();
const { data: otherEngagementVendor } = await admin
  .from("engagement_vendors")
  .insert({
    engagement_id: erickErika.id,
    business_name: "RLS Test Erick & Erika Supplier",
    category: "venue",
  })
  .select("id")
  .single();

try {
  const asCouple2 = createClient(url, anonKey);
  const { error: signIn2Error } = await asCouple2.auth.signInWithPassword({
    email: couple2Email,
    password: couple2Password,
  });
  if (signIn2Error) {
    console.error("Failed to sign in as second test couple:", signIn2Error.message);
    process.exit(1);
  }

  const { data: anonApproved } = await asAnon
    .from("vendors")
    .select("id")
    .eq("id", approvedVendor.id)
    .maybeSingle();
  check("anon can read an approved vendor", anonApproved?.id === approvedVendor.id);

  const { data: anonPending } = await asAnon
    .from("vendors")
    .select("id")
    .eq("id", pendingVendor.id)
    .maybeSingle();
  check("anon cannot read a pending vendor", anonPending === null);

  const { data: anonApprovedPhoto } = await asAnon
    .from("vendor_photos")
    .select("id")
    .eq("id", approvedPhoto.id)
    .maybeSingle();
  check(
    "anon can read an approved vendor's photos",
    anonApprovedPhoto?.id === approvedPhoto.id,
  );

  const { data: anonPendingPhoto } = await asAnon
    .from("vendor_photos")
    .select("id")
    .eq("id", pendingPhoto.id)
    .maybeSingle();
  check("anon cannot read a pending vendor's photos", anonPendingPhoto === null);

  await asCouple2
    .from("vendors")
    .update({ business_name: "hacked" })
    .eq("id", approvedVendor.id);
  const { data: vendorAfterWrite } = await admin
    .from("vendors")
    .select("business_name")
    .eq("id", approvedVendor.id)
    .single();
  check(
    "couple cannot write to vendors (Account-only per RLS)",
    vendorAfterWrite?.business_name !== "hacked",
  );

  const { data: ownEngagementVendors } = await asCouple2
    .from("engagement_vendors")
    .select("id, engagement_id");
  const ownIds = new Set(ownEngagementVendors?.map((v) => v.id));
  check(
    "couple's engagement_vendors list is scoped to their own engagement",
    ownEngagementVendors?.every((v) => v.engagement_id === mariaJon.id) &&
      ownIds.has(creditedVendor.id) &&
      ownIds.has(uncreditedVendor.id) &&
      !ownIds.has(otherEngagementVendor.id),
  );

  const { data: coupleInsert, error: coupleInsertError } = await asCouple2
    .from("engagement_vendors")
    .insert({
      engagement_id: mariaJon.id,
      business_name: "RLS Test Couple-Added Supplier",
      category: "other",
    })
    .select("id")
    .maybeSingle();
  check(
    "couple can add to their own engagement's vendor log",
    !coupleInsertError && !!coupleInsert,
  );
  if (coupleInsert) {
    await admin.from("engagement_vendors").delete().eq("id", coupleInsert.id);
  }

  const { error: crossInsertError } = await asCouple2.from("engagement_vendors").insert({
    engagement_id: erickErika.id,
    business_name: "should not be allowed",
    category: "other",
  });
  check(
    "couple cannot add to another engagement's vendor log",
    crossInsertError !== null,
  );

  const { data: anonCredited } = await asAnon
    .from("engagement_vendors")
    .select("id")
    .eq("id", creditedVendor.id)
    .maybeSingle();
  check(
    "anon can read a credited engagement_vendors row",
    anonCredited?.id === creditedVendor.id,
  );

  const { data: anonUncredited } = await asAnon
    .from("engagement_vendors")
    .select("id")
    .eq("id", uncreditedVendor.id)
    .maybeSingle();
  check("anon cannot read an uncredited engagement_vendors row", anonUncredited === null);
} finally {
  await admin.from("engagement_vendors").delete().eq("id", creditedVendor.id);
  await admin.from("engagement_vendors").delete().eq("id", uncreditedVendor.id);
  await admin.from("engagement_vendors").delete().eq("id", otherEngagementVendor.id);
  await admin.from("engagement_members").delete().eq("user_id", couple2UserId);
  await admin.auth.admin.deleteUser(couple2UserId);
  await admin.from("vendor_photos").delete().eq("id", approvedPhoto.id);
  await admin.from("vendor_photos").delete().eq("id", pendingPhoto.id);
  await admin.from("vendors").delete().eq("id", pendingVendor.id);
  await admin.from("vendors").delete().eq("id", approvedVendor.id);
}
```

- [ ] **Step 2: Run it**

```bash
export PATH="/opt/homebrew/bin:$PATH" && npm run verify:rls
```

Expected: all prior 12 checks plus the ~10 new vendor checks PASS. If any FAIL, stop and fix the migration/policy before proceeding — every later task builds on this RLS being correct.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-rls.mjs
git commit -m "Extend verify-rls.mjs with vendor/engagement_vendors isolation checks"
```

---

## Task 3: Vendor signup (`/directory/apply`)

**Files:**
- Create: `src/app/directory/apply/actions.ts`
- Create: `src/app/directory/apply/page.tsx`

**Interfaces:**
- Consumes: `createAdminClient` from `src/lib/supabase/admin.ts` (`createAdminClient(): SupabaseClient`, already exists).
- Produces: server action `submitVendorApplication(formData: FormData): Promise<void>` — later tasks don't call this directly, but Task 4's directory page and Task 5's approval queue both read rows this action creates.

- [ ] **Step 1: Write the server action**

`src/app/directory/apply/actions.ts`:
```typescript
"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORIES = ["photo", "venue", "catering", "florals", "hmua", "cake", "music", "other"];

// Public, unauthenticated signup — no Supabase Auth account is created
// here at all. status is hardcoded to 'pending' and never taken from the
// form, the same way guest-token writes never trust a client-supplied
// field for anything access-control-relevant (see AGENTS.md / the M7
// security review this session). Uses the admin client narrowly for this
// one insert: an anonymous visitor has no session to satisfy
// vendors_write_account's is_account() check, same established pattern
// as guest RSVP writes in src/app/api/g/[token]/rsvp/route.ts.
export async function submitVendorApplication(formData: FormData) {
  const business_name = (formData.get("business_name") as string)?.trim();
  const category = formData.get("category") as string;

  if (!business_name || !CATEGORIES.includes(category)) {
    redirect(
      `/directory/apply?error=${encodeURIComponent("Business name and a valid category are required.")}`,
    );
  }

  const photoUrls = ((formData.get("photo_urls") as string) || "")
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 12);

  const rateFromRaw = formData.get("rate_from") as string;
  const rateToRaw = formData.get("rate_to") as string;

  const admin = createAdminClient();

  const { data: vendor, error } = await admin
    .from("vendors")
    .insert({
      business_name,
      category,
      description: (formData.get("description") as string) || null,
      rate_from: rateFromRaw ? Number(rateFromRaw) : null,
      rate_to: rateToRaw ? Number(rateToRaw) : null,
      rate_note: (formData.get("rate_note") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !vendor) {
    redirect(
      `/directory/apply?error=${encodeURIComponent("Something went wrong. Please try again.")}`,
    );
  }

  if (photoUrls.length) {
    await admin.from("vendor_photos").insert(
      photoUrls.map((photo_url, i) => ({
        vendor_id: vendor.id,
        photo_url,
        sort_order: i,
      })),
    );
  }

  redirect("/directory/apply?submitted=1");
}
```

- [ ] **Step 2: Write the page**

`src/app/directory/apply/page.tsx`:
```tsx
import { submitVendorApplication } from "./actions";

const CATEGORIES = [
  { value: "photo", label: "Photography" },
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "florals", label: "Florals" },
  { value: "hmua", label: "Hair & makeup" },
  { value: "cake", label: "Cake" },
  { value: "music", label: "Music" },
  { value: "other", label: "Other" },
];

export default async function VendorApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { error, submitted } = await searchParams;

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">Thanks for applying</h1>
        <p className="mt-2 text-sm text-neutral-500">
          We&apos;ll be in touch once your listing has been reviewed.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-xl font-semibold text-neutral-900">List your business</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Free to be listed. We just need a few details and some photos.
      </p>

      <form action={submitVendorApplication} className="mt-6 space-y-4">
        <div>
          <label className={labelClass}>Business name</label>
          <input name="business_name" type="text" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select name="category" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose a category…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea name="description" rows={4} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Rate from</label>
            <input name="rate_from" type="number" min={0} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rate to</label>
            <input name="rate_to" type="number" min={0} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Rate note</label>
          <input
            name="rate_note"
            type="text"
            placeholder="per event, packages from…"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Contact phone</label>
          <input name="contact_phone" type="text" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Contact email</label>
          <input name="contact_email" type="email" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Photo URLs (one per line)</label>
          <textarea name="photo_urls" rows={4} className={`${inputClass} font-mono`} />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Submit application
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Add `/directory` to the public-route carve-out**

`/directory/apply` needs to be reachable with no session. Read `src/lib/supabase/middleware.ts` first — find the `isPublicRoute` constant (checks `startsWith("/r/")`, `startsWith("/api/g/")`, `startsWith("/s/")`). Add a fourth line:

```typescript
request.nextUrl.pathname.startsWith("/directory")
```

so the block reads:

```typescript
const isPublicRoute =
  request.nextUrl.pathname.startsWith("/r/") ||
  request.nextUrl.pathname.startsWith("/api/g/") ||
  request.nextUrl.pathname.startsWith("/s/") ||
  request.nextUrl.pathname.startsWith("/directory");
```

This single prefix covers both `/directory` (Task 4) and `/directory/apply` (this task) — no further middleware changes needed for either.

- [ ] **Step 4: Verify with a cookie-free curl and a real submission**

```bash
# Confirm no login redirect
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3000/directory/apply"
# Expected: HTTP 200, not a redirect

# Submit a real application and confirm it landed as pending, no auth user created
curl -s -X POST "http://localhost:3000/directory/apply" \
  -d "business_name=Plan Verify Test Vendor&category=cake&description=test&photo_urls=https://example.com/x.jpg" \
  -w "\nHTTP %{http_code}\n" -o /dev/null -L
```

Then confirm in the database (dev server must be running — `npm run dev` in another terminal first):
```bash
export PATH="/opt/homebrew/bin:$PATH" && node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await admin.from('vendors').select('id, business_name, status').eq('business_name', 'Plan Verify Test Vendor').maybeSingle();
  console.log('created vendor:', data);
  if (data) await admin.from('vendors').delete().eq('id', data.id);
})();
"
```
Expected: a row with `status: 'pending'`, then clean up (the script above deletes it).

- [ ] **Step 5: Commit**

```bash
git add src/app/directory/apply/ src/lib/supabase/middleware.ts
git commit -m "Vendor signup: /directory/apply"
```

---

## Task 4: Public vendor directory (`/directory`)

**Files:**
- Create: `src/app/directory/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server` (session client — works for anonymous visitors too since RLS grants a real public-read policy on `vendors`/`vendor_photos`, no admin client needed here).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the page**

`src/app/directory/page.tsx`:
```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "photo", label: "Photography" },
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "florals", label: "Florals" },
  { value: "hmua", label: "Hair & makeup" },
  { value: "cake", label: "Cake" },
  { value: "music", label: "Music" },
  { value: "other", label: "Other" },
];

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("vendors")
    .select(
      "id, business_name, category, description, rate_from, rate_to, rate_note, contact_phone, contact_email, vendor_photos(photo_url, sort_order)",
    )
    .eq("status", "approved")
    .order("business_name");

  if (category) {
    query = query.eq("category", category);
  }

  const { data: vendors } = await query;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Vendor directory</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Suppliers we&apos;ve worked with, or who&apos;ve applied to be listed.
          </p>
        </div>
        <Link
          href="/directory/apply"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          List your business
        </Link>
      </div>

      <form method="get" className="mb-6 flex gap-2">
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Filter
        </button>
      </form>

      {vendors?.length ? (
        <div className="grid grid-cols-2 gap-4">
          {vendors.map((vendor) => {
            const photos = (vendor.vendor_photos ?? []).slice().sort(
              (a, b) => a.sort_order - b.sort_order,
            );
            return (
              <div key={vendor.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                {photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photos[0].photo_url}
                    alt=""
                    className="mb-3 aspect-video w-full rounded-md object-cover"
                  />
                )}
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900">{vendor.business_name}</h3>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {vendor.category}
                  </span>
                </div>
                {vendor.description && (
                  <p className="mb-2 text-sm text-neutral-600">{vendor.description}</p>
                )}
                {(vendor.rate_from || vendor.rate_to) && (
                  <p className="text-sm text-neutral-500">
                    {vendor.rate_from ? `From ${vendor.rate_from}` : ""}
                    {vendor.rate_to ? ` to ${vendor.rate_to}` : ""}
                    {vendor.rate_note ? ` — ${vendor.rate_note}` : ""}
                  </p>
                )}
                <div className="mt-2 text-sm text-neutral-500">
                  {vendor.contact_phone && <p>{vendor.contact_phone}</p>}
                  {vendor.contact_email && <p>{vendor.contact_email}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          No vendors listed in this category yet.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify with a cookie-free curl and an approved-vendor check**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3000/directory"
# Expected: HTTP 200, no redirect
```

Create a throwaway approved vendor, confirm it renders, then clean up:
```bash
export PATH="/opt/homebrew/bin:$PATH" && node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await admin.from('vendors').insert({ business_name: 'Plan Verify Directory Vendor', category: 'cake', status: 'approved' }).select('id').single();
  console.log('created:', data.id);
})();
"
curl -s "http://localhost:3000/directory" | grep -o "Plan Verify Directory Vendor" || echo "NOT FOUND"
export PATH="/opt/homebrew/bin:$PATH" && node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  await admin.from('vendors').delete().eq('business_name', 'Plan Verify Directory Vendor');
  console.log('cleaned up');
})();
"
```
Expected: the grep finds the business name; cleanup confirms.

- [ ] **Step 3: Commit**

```bash
git add src/app/directory/page.tsx
git commit -m "Public vendor directory: /directory"
```

---

## Task 5: Account approval queue (`/vendors`)

**Files:**
- Create: `src/app/(app)/vendors/actions.ts`
- Create: `src/app/(app)/vendors/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: server actions `approveVendor`, `rejectVendor`, `sendBackVendor`, `updateVendor` (all `(formData: FormData) => Promise<void>`) — not consumed by other tasks, but establishes the "editing an approved vendor drops it to pending" behavior Task 9's manual verification checks.

- [ ] **Step 1: Write the actions**

`src/app/(app)/vendors/actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user!.id)
    .single();
  if (profile?.global_role !== "account") {
    redirect("/");
  }
  return { supabase, userId: user!.id };
}

export async function approveVendor(formData: FormData) {
  const vendorId = formData.get("vendor_id") as string;
  const { supabase, userId } = await requireAccount();

  await supabase
    .from("vendors")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
}

export async function rejectVendor(formData: FormData) {
  const vendorId = formData.get("vendor_id") as string;
  const reviewNote = (formData.get("review_note") as string) || null;
  const { supabase, userId } = await requireAccount();

  await supabase
    .from("vendors")
    .update({
      status: "rejected",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
}

export async function sendBackVendor(formData: FormData) {
  const vendorId = formData.get("vendor_id") as string;
  const reviewNote = (formData.get("review_note") as string) || null;
  const { supabase, userId } = await requireAccount();

  await supabase
    .from("vendors")
    .update({
      status: "pending",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
}

// Editing any field on a vendor's row. Per the design spec, saving an
// edit to an already-approved vendor drops it back to 'pending' — an
// edit is never silently live on an approved listing.
export async function updateVendor(formData: FormData) {
  const vendorId = formData.get("vendor_id") as string;
  const wasApproved = formData.get("was_approved") === "on";
  const { supabase } = await requireAccount();

  const rateFromRaw = formData.get("rate_from") as string;
  const rateToRaw = formData.get("rate_to") as string;

  await supabase
    .from("vendors")
    .update({
      business_name: formData.get("business_name") as string,
      category: formData.get("category") as string,
      description: (formData.get("description") as string) || null,
      rate_from: rateFromRaw ? Number(rateFromRaw) : null,
      rate_to: rateToRaw ? Number(rateToRaw) : null,
      rate_note: (formData.get("rate_note") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      ...(wasApproved ? { status: "pending" } : {}),
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
}
```

- [ ] **Step 2: Write the page**

`src/app/(app)/vendors/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveVendor, rejectVendor, sendBackVendor, updateVendor } from "./actions";

const CATEGORIES = ["photo", "venue", "catering", "florals", "hmua", "cake", "music", "other"];

type Vendor = {
  id: string;
  business_name: string;
  category: string;
  description: string | null;
  rate_from: number | null;
  rate_to: number | null;
  rate_note: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  review_note: string | null;
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-neutral-100 text-neutral-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <form action={updateVendor} className="space-y-3">
        <input type="hidden" name="vendor_id" value={vendor.id} />
        <input
          type="hidden"
          name="was_approved"
          value={vendor.status === "approved" ? "on" : ""}
        />
        <div className="flex items-center justify-between gap-3">
          <input
            name="business_name"
            type="text"
            defaultValue={vendor.business_name}
            className={inputClass}
          />
          {statusBadge(vendor.status)}
        </div>
        <select name="category" defaultValue={vendor.category} className={inputClass}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea
          name="description"
          rows={2}
          defaultValue={vendor.description ?? ""}
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="rate_from"
            type="number"
            defaultValue={vendor.rate_from ?? ""}
            placeholder="Rate from"
            className={inputClass}
          />
          <input
            name="rate_to"
            type="number"
            defaultValue={vendor.rate_to ?? ""}
            placeholder="Rate to"
            className={inputClass}
          />
        </div>
        <input
          name="rate_note"
          type="text"
          defaultValue={vendor.rate_note ?? ""}
          placeholder="Rate note"
          className={inputClass}
        />
        <input
          name="contact_phone"
          type="text"
          defaultValue={vendor.contact_phone ?? ""}
          placeholder="Contact phone"
          className={inputClass}
        />
        <input
          name="contact_email"
          type="text"
          defaultValue={vendor.contact_email ?? ""}
          placeholder="Contact email"
          className={inputClass}
        />
        {vendor.review_note && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Note: {vendor.review_note}
          </p>
        )}
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save changes
        </button>
      </form>

      <div className="mt-3 flex items-end gap-2 border-t border-neutral-100 pt-3">
        <form action={approveVendor}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Approve
          </button>
        </form>
        <form action={sendBackVendor} className="flex flex-1 gap-2">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <input
            name="review_note"
            type="text"
            placeholder="What needs to change…"
            className={inputClass}
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Send back
          </button>
        </form>
        <form action={rejectVendor}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-red-50 hover:text-red-700"
          >
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function VendorReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user.id)
    .single();

  if (profile?.global_role !== "account") {
    redirect("/");
  }

  const { data: vendors } = await supabase
    .from("vendors")
    .select(
      "id, business_name, category, description, rate_from, rate_to, rate_note, contact_phone, contact_email, status, review_note",
    )
    .order("business_name");

  const pending = (vendors ?? []).filter((v) => v.status === "pending");
  const approved = (vendors ?? []).filter((v) => v.status === "approved");
  const rejected = (vendors ?? []).filter((v) => v.status === "rejected");

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Vendor review</h1>

      <h2 className="mb-3 text-sm font-medium uppercase text-neutral-500">
        Pending ({pending.length})
      </h2>
      <div className="mb-8 space-y-4">
        {pending.length ? (
          pending.map((v) => <VendorCard key={v.id} vendor={v} />)
        ) : (
          <p className="text-sm text-neutral-400">Nothing waiting on review.</p>
        )}
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase text-neutral-500">
        Approved ({approved.length})
      </h2>
      <div className="mb-8 space-y-4">
        {approved.length ? (
          approved.map((v) => <VendorCard key={v.id} vendor={v} />)
        ) : (
          <p className="text-sm text-neutral-400">No approved listings yet.</p>
        )}
      </div>

      {rejected.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase text-neutral-500">
            Rejected ({rejected.length})
          </h2>
          <div className="space-y-4">
            {rejected.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify with a cookie-free curl**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\nLocation: %{redirect_url}\n" "http://localhost:3000/vendors"
```
Expected: `HTTP 307`, `Location: http://localhost:3000/login` — no session, no access, matching every other `(app)` page.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/vendors/"
git commit -m "Account approval queue: /vendors"
```

---

## Task 6: Header nav link

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `profile.global_role` (already fetched in this file), links to `/vendors` (produced by Task 5).

- [ ] **Step 1: Add the link**

Read `src/app/(app)/layout.tsx` first. In the header's `<div className="flex items-center gap-4">` block, immediately before the `<span>` showing the user's name, add:

```tsx
{profile?.global_role === "account" && (
  <Link href="/vendors" className="text-sm text-neutral-500 hover:text-neutral-900">
    Vendors
  </Link>
)}
```

`Link` from `next/link` is already imported at the top of this file (used for the "Ever After" logo link) — no new import needed.

- [ ] **Step 2: Verify visually**

Start the dev server if not already running (`npm run dev`), sign in as the Account user (`brulkeanjames@gmail.com`), confirm a "Vendors" link appears in the header and navigates to `/vendors`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/layout.tsx"
git commit -m "Add Account-only Vendors link to header nav"
```

---

## Task 7: Per-event vendor log tab

**Files:**
- Create: `src/app/(app)/engagements/[id]/vendors/actions.ts`
- Create: `src/app/(app)/engagements/[id]/vendors/vendors-tab.tsx`
- Modify: `src/app/(app)/engagements/[id]/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `VendorsTab({ engagementId: string })` component, wired into `page.tsx`'s existing `TABS`/if-else chain exactly like `CheckpointsTab` was wired in Milestone 7.

- [ ] **Step 1: Write the actions**

`src/app/(app)/engagements/[id]/vendors/actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addEngagementVendor(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const vendorId = (formData.get("vendor_id") as string) || null;
  const supabase = await createClient();

  if (vendorId) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("business_name, category, contact_phone, contact_email")
      .eq("id", vendorId)
      .single();

    await supabase.from("engagement_vendors").insert({
      engagement_id: engagementId,
      vendor_id: vendorId,
      business_name: vendor?.business_name ?? "",
      category: vendor?.category ?? "other",
      contact_phone: vendor?.contact_phone ?? null,
      contact_email: vendor?.contact_email ?? null,
    });
  } else {
    await supabase.from("engagement_vendors").insert({
      engagement_id: engagementId,
      business_name: formData.get("business_name") as string,
      category: formData.get("category") as string,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });
  }

  revalidatePath(`/engagements/${engagementId}`);
}

export async function toggleEngagementVendorCredit(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const creditOnSite = formData.get("credit_on_site") === "on";
  const supabase = await createClient();

  await supabase
    .from("engagement_vendors")
    .update({ credit_on_site: creditOnSite })
    .eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function deleteEngagementVendor(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("engagement_vendors").delete().eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}
```

- [ ] **Step 2: Write the tab component**

`src/app/(app)/engagements/[id]/vendors/vendors-tab.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import {
  addEngagementVendor,
  toggleEngagementVendorCredit,
  deleteEngagementVendor,
} from "./actions";

const CATEGORIES = ["photo", "venue", "catering", "florals", "hmua", "cake", "music", "other"];

export default async function VendorsTab({ engagementId }: { engagementId: string }) {
  const supabase = await createClient();

  const [{ data: booked }, { data: directory }] = await Promise.all([
    supabase
      .from("engagement_vendors")
      .select(
        "id, business_name, category, contact_phone, contact_email, notes, credit_on_site, vendor_id",
      )
      .eq("engagement_id", engagementId)
      .order("business_name"),
    supabase
      .from("vendors")
      .select("id, business_name, category")
      .eq("status", "approved")
      .order("business_name"),
  ]);

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

  return (
    <div>
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-neutral-900">Add a supplier</h3>
        <form action={addEngagementVendor} className="space-y-3">
          <input type="hidden" name="engagement_id" value={engagementId} />
          <div>
            <label className={labelClass}>From the directory (optional)</label>
            <select name="vendor_id" defaultValue="" className={inputClass}>
              <option value="">Off-platform — enter details below</option>
              {directory?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.business_name} ({v.category})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Business name</label>
              <input name="business_name" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" defaultValue="other" className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Contact phone</label>
              <input name="contact_phone" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact email</label>
              <input name="contact_email" type="text" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea name="notes" rows={2} className={inputClass} />
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add supplier
          </button>
        </form>
      </div>

      {booked?.length ? (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Business</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Contact</th>
              <th className="py-2 pr-3 font-medium">Credit on site</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {booked.map((v) => (
              <tr key={v.id}>
                <td className="py-2 pr-3 text-neutral-900">
                  {v.business_name}
                  {v.vendor_id && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      Directory
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-neutral-600">{v.category}</td>
                <td className="py-2 pr-3 text-neutral-600">
                  {v.contact_phone || v.contact_email || "—"}
                </td>
                <td className="py-2 pr-3">
                  <form action={toggleEngagementVendorCredit}>
                    <input type="hidden" name="engagement_id" value={engagementId} />
                    <input type="hidden" name="id" value={v.id} />
                    <input
                      type="hidden"
                      name="credit_on_site"
                      value={v.credit_on_site ? "" : "on"}
                    />
                    <button
                      type="submit"
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.credit_on_site
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {v.credit_on_site ? "Credited" : "Not credited"}
                    </button>
                  </form>
                </td>
                <td className="py-2">
                  <form action={deleteEngagementVendor} className="text-right">
                    <input type="hidden" name="engagement_id" value={engagementId} />
                    <input type="hidden" name="id" value={v.id} />
                    <button
                      type="submit"
                      className="text-sm text-neutral-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          No suppliers logged yet.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into the workspace page**

Read `src/app/(app)/engagements/[id]/page.tsx` first. Add the import alongside the other tab imports:

```tsx
import VendorsTab from "./vendors/vendors-tab";
```

Then add a branch to the if/else chain, following the exact pattern used for `checkpoints` in Milestone 7 — insert this immediately before the final `) : (` fallback:

```tsx
) : activeTab.key === "vendors" ? (
  <VendorsTab engagementId={id} />
```

The `TABS` array already has a `vendors` entry (`{ key: "vendors", label: "Vendors", milestone: 8 }`) from Milestone 0 — no change needed there.

- [ ] **Step 4: Verify in the browser**

Start the dev server, navigate to `/engagements/606ece77-8c2a-409f-ab16-195fffa1c430?tab=vendors` (Maria & Jon), confirm the tab renders (empty state: "No suppliers logged yet"), add an off-platform supplier, confirm it appears in the table, toggle "Credited", confirm the badge flips, remove it, confirm it disappears.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/engagements/[id]/vendors/" "src/app/(app)/engagements/[id]/page.tsx"
git commit -m "Per-event vendor log tab"
```

---

## Task 8: Suppliers site section (editor + renderer)

This is one task, not two, even though it touches four files — an editor with no renderer isn't testable end-to-end, and a renderer with no editor has no way to toggle visibility. Each half is meaningless alone.

**Files:**
- Modify: `src/components/site-renderer.tsx`
- Modify: `src/app/(app)/engagements/[id]/site/actions.ts`
- Modify: `src/app/(app)/engagements/[id]/site/site-tab.tsx`
- Modify: `src/app/s/[slug]/page.tsx`

**Interfaces:**
- Produces: `SiteRenderer` gains a new required prop `suppliers: SupplierCredit[]` where `SupplierCredit = { business_name: string; category: string; contact_phone: string | null; contact_email: string | null }`. Both callers must pass it.

- [ ] **Step 1: Add the suppliers case to `site-renderer.tsx`**

Read the file first. Add these two type exports alongside the existing ones (`HeroContent`, `StoryContent`, etc.):

```typescript
export type SuppliersContent = { heading?: string };
export type SupplierCredit = {
  business_name: string;
  category: string;
  contact_phone: string | null;
  contact_email: string | null;
};
```

Add `suppliers: SupplierCredit[]` to the `SiteRenderer` function's props destructuring and type signature — it currently reads:
```typescript
export default function SiteRenderer({
  sections,
  fallbackHeadline,
  weddingDate,
}: {
  sections: SiteSectionRow[];
  fallbackHeadline: string;
  weddingDate: string | null;
}) {
```
change to:
```typescript
export default function SiteRenderer({
  sections,
  fallbackHeadline,
  weddingDate,
  suppliers,
}: {
  sections: SiteSectionRow[];
  fallbackHeadline: string;
  weddingDate: string | null;
  suppliers: SupplierCredit[];
}) {
```

Inside the function body, alongside the other `const x = byType.get(...)` lines, add:
```typescript
const suppliersSection = byType.get("suppliers");
const suppliersContent = (suppliersSection?.content ?? {}) as SuppliersContent;
const showSuppliers = suppliersSection?.is_visible && suppliers.length > 0;
```

In the JSX, immediately after the `{showDetails && (...)}` block and before the closing `</div>` of the root element, add:
```tsx
{showSuppliers && (
  <section className="mx-auto max-w-2xl px-6 py-16">
    <h2 className="mb-4 text-2xl font-semibold text-neutral-900">
      {suppliersContent.heading || "Suppliers"}
    </h2>
    <ul className="space-y-3 text-neutral-700">
      {suppliers.map((s, i) => (
        <li key={i}>
          <p className="font-medium text-neutral-900">{s.business_name}</p>
          <p className="text-sm text-neutral-500">
            {s.category}
            {s.contact_phone ? ` · ${s.contact_phone}` : ""}
            {s.contact_email ? ` · ${s.contact_email}` : ""}
          </p>
        </li>
      ))}
    </ul>
  </section>
)}
```

- [ ] **Step 2: Update `site/actions.ts`**

Read the file first. Add a `case "suppliers"` to `buildSectionContent`, right before the `default:` case:
```typescript
case "suppliers":
  return { heading: (formData.get("heading") as string) || "Suppliers" };
```

Add a `suppliers` entry to `createSite`'s `defaultSections` array, after the `details` entry:
```typescript
{
  section_type: "suppliers",
  sort_order: 6,
  content: { heading: "Suppliers" },
},
```

Change `updateSiteSection` from a pure update to an upsert, so a section type that didn't exist yet on an already-created site (every site created before this change) gets inserted instead of silently no-op'ing. Add this constant above the function:
```typescript
const SECTION_SORT_ORDER: Record<string, number> = {
  hero: 0,
  story: 1,
  the_day: 2,
  rsvp: 3,
  gallery: 4,
  details: 5,
  suppliers: 6,
};
```
Replace the function body:
```typescript
export async function updateSiteSection(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const sectionType = formData.get("section_type") as string;
  const isVisible =
    sectionType === "hero" ? true : formData.get("is_visible") === "on";
  const content = buildSectionContent(sectionType, formData);

  const supabase = await createClient();
  await supabase.from("site_sections").upsert(
    {
      site_id: siteId,
      section_type: sectionType,
      content,
      is_visible: isVisible,
      sort_order: SECTION_SORT_ORDER[sectionType] ?? 99,
    },
    { onConflict: "site_id,section_type" },
  );

  revalidatePath(`/engagements/${engagementId}`);
}
```
This is safe for every existing section type: the `sort_order` values in the map exactly match what `createSite` already assigns, so upserting an already-existing row with the same `sort_order` is a no-op for that column — the only new behavior is that a genuinely missing row (like `suppliers` on a site created before this task) gets inserted instead of silently ignored.

- [ ] **Step 3: Update `site-tab.tsx`**

Read the file first. Add `SuppliersContent` to the type import from `@/components/site-renderer`:
```typescript
import SiteRenderer, {
  type SiteSectionRow,
  type HeroContent,
  type StoryContent,
  type TheDayContent,
  type RsvpContent,
  type GalleryContent,
  type DetailsContent,
  type SuppliersContent,
} from "@/components/site-renderer";
```

Right before the `if (!isAccount) { ... }` block, fetch the credited suppliers (needed by the `SiteRenderer` call inside that block). Name it `creditedSuppliers`, not `suppliers` — `suppliers` is about to be used below for the section-row lookup, matching the `hero`/`story`/`theDay`/`rsvp`/`gallery`/`details` naming convention already established in this file, and reusing it for the array would shadow that:
```typescript
const { data: creditedSuppliers } = await supabase
  .from("engagement_vendors")
  .select("business_name, category, contact_phone, contact_email")
  .eq("engagement_id", engagementId)
  .eq("credit_on_site", true);
```

Inside the `if (!isAccount)` block, add the `suppliers` prop to the existing `<SiteRenderer ... />` call:
```tsx
<SiteRenderer
  sections={sections}
  fallbackHeadline={engagement?.display_name ?? ""}
  weddingDate={engagement?.wedding_date ?? null}
  suppliers={creditedSuppliers ?? []}
/>
```

After the `find(sections, "details")` line (in the Account-editor branch), add:
```typescript
const suppliers = find(sections, "suppliers");
const suppliersContent = (suppliers?.content ?? {}) as SuppliersContent;
```

Add a new editor block after the `{/* Details */}` form block, before the closing `</div>` of the root element:
```tsx
{/* Suppliers */}
<form
  action={updateSiteSection}
  className="rounded-lg border border-neutral-200 bg-white p-4"
>
  <input type="hidden" name="engagement_id" value={engagementId} />
  <input type="hidden" name="site_id" value={site.id} />
  <input type="hidden" name="section_type" value="suppliers" />
  <div className="mb-4 flex items-center justify-between">
    <h3 className="font-medium text-neutral-900">Suppliers</h3>
    <label className="flex items-center gap-2 text-xs text-neutral-500">
      <input
        type="checkbox"
        name="is_visible"
        defaultChecked={suppliers?.is_visible ?? true}
      />
      Visible
    </label>
  </div>
  <p className="mb-4 text-xs text-neutral-400">
    Credits suppliers marked &ldquo;credit on site&rdquo; in the Vendors tab. No
    ratings, no reviews — just a credit list.
  </p>
  <div>
    <label className={labelClass}>Heading</label>
    <input
      name="heading"
      type="text"
      defaultValue={suppliersContent.heading}
      className={inputClass}
    />
  </div>
  <button
    type="submit"
    className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
  >
    Save
  </button>
</form>
```

- [ ] **Step 4: Update `/s/[slug]/page.tsx`**

Read the file first. After the `sections` query (`const { data: sections } = await supabase.from("site_sections")...`), add:
```typescript
const { data: suppliers } = await supabase
  .from("engagement_vendors")
  .select("business_name, category, contact_phone, contact_email")
  .eq("engagement_id", site.engagement_id)
  .eq("credit_on_site", true);
```
This uses the plain `supabase` session client already in scope — it now works for anonymous visitors thanks to Task 1's `engagement_vendors_read` policy allowing `credit_on_site = true` reads with no session.

Add the prop to the existing `<SiteRenderer ... />` call:
```tsx
<SiteRenderer
  sections={sections ?? []}
  fallbackHeadline={engagement.display_name}
  weddingDate={engagement.wedding_date}
  suppliers={suppliers ?? []}
/>
```

- [ ] **Step 5: Verify — lint, build, and a full manual walkthrough**

```bash
export PATH="/opt/homebrew/bin:$PATH" && npm run lint && npm run build
```
Expected: no errors (this changes a shared component's props, so a missing `suppliers` prop on either caller would fail the TypeScript build — that's the main risk here).

Manual browser walkthrough (dev server running, signed in as Account):
1. Go to Maria & Jon's Website tab, confirm a new "Suppliers" editor block appears (this is the site created before this task — proves the upsert fix works), set the heading, save.
2. Go to the Vendors tab, add a supplier, toggle "Credited" on.
3. Reload the Website tab's read-only... actually Account sees the editor, not the preview — instead, visit `/s/mariaandjon` directly (or whatever Maria & Jon's slug is) and confirm the Suppliers section renders with that business name.
4. Toggle "Credited" off on the Vendors tab, reload `/s/mariaandjon`, confirm the section disappears (empty content renders nothing, per the existing convention).

- [ ] **Step 6: Commit**

```bash
git add src/components/site-renderer.tsx "src/app/(app)/engagements/[id]/site/actions.ts" "src/app/(app)/engagements/[id]/site/site-tab.tsx" src/app/s/\[slug\]/page.tsx
git commit -m "Suppliers site section: editor and public renderer"
```

---

## Task 9: Final verification pass

**Files:** none — verification only.

- [ ] **Step 1: Full automated suite**

```bash
export PATH="/opt/homebrew/bin:$PATH" && npm run lint && npm run build && npm run verify:rls
```
Expected: lint clean, build succeeds, all RLS checks pass (12 original + 15 guest-token-unrelated + the new vendor checks from Task 2).

- [ ] **Step 2: Cookie-free curl sweep of every new route**

```bash
echo "/directory (public, should 200):"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" "http://localhost:3000/directory"
echo "/directory/apply (public, should 200):"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" "http://localhost:3000/directory/apply"
echo "/vendors (authenticated, should redirect to /login):"
curl -s -o /dev/null -w "  HTTP %{http_code} -> %{redirect_url}\n" "http://localhost:3000/vendors"
```

- [ ] **Step 3: End-to-end manual walkthrough**

With the dev server running:
1. Submit a real application at `/directory/apply` with a business name, category, description, and one photo URL.
2. Confirm it does NOT appear at `/directory` (still pending).
3. Sign in as Account, go to `/vendors`, find it under Pending, click Approve.
4. Confirm it NOW appears at `/directory`, photo included.
5. On `/vendors`, edit the now-approved vendor's description and save — confirm its status badge flips back to `pending` and it disappears from `/directory` again.
6. Approve it again.
7. Go to Maria & Jon's Vendors tab, add it from the directory dropdown (not off-platform), confirm business name/category/contact pre-fill correctly, toggle Credited on.
8. Visit Maria & Jon's public site, confirm the Suppliers section shows it.
9. Clean up all test data created during this walkthrough via the admin client (delete the test vendor, its photo, and the engagement_vendors row), or leave it if it reads naturally as demo content — your call, matching how M7's verification left the "Arrival"/Ana Reyes data in place per the handoff.

- [ ] **Step 4: Update `HANDOFF.md`**

Follow the exact pattern used for Milestones 6 and 7 in this file's history: mark M8 done in the milestones table, add migration `0009` to the database section, note the new routes and the "signup-only, no vendor login" scope decision in the architecture-decisions section, and record any bugs found during this final pass in the security-posture section (§6) the same way the M7 `guest_scans` RLS gap was written up.

- [ ] **Step 5: Commit**

```bash
git add HANDOFF.md
git commit -m "Update handoff doc for Milestone 8"
```
