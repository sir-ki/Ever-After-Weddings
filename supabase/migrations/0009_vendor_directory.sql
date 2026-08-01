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
