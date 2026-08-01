-- Ever After — Milestone 5 schema
-- sites and site_sections, with the asymmetric read/write RLS from
-- docs/ever-after-auth-and-access.md: Account reads/writes everything,
-- couples read their own site but cannot write it, the public can read
-- only published sites.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references engagements (id) on delete cascade,
  slug text not null unique,
  template_key text not null default 'classic',
  theme jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  day_hub_unlocked_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists sites_set_updated_at on sites;
create trigger sites_set_updated_at
  before update on sites
  for each row execute procedure set_updated_at();

create table if not exists site_sections (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  section_type text not null
    check (section_type in ('hero', 'story', 'the_day', 'rsvp', 'gallery', 'details', 'suppliers')),
  content jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  unique (site_id, section_type)
);

create index if not exists site_sections_site_idx on site_sections (site_id);

-- Helpers: a site's own RLS mustn't be evaluated against itself when
-- site_sections checks it, so these run as security definer, same
-- pattern as is_account()/has_engagement().
create or replace function site_engagement_id(sid uuid) returns uuid
language sql stable security definer as $$
  select engagement_id from sites where id = sid;
$$;

create or replace function is_site_published(sid uuid) returns boolean
language sql stable security definer as $$
  select coalesce((select status = 'published' from sites where id = sid), false);
$$;

alter table sites enable row level security;

drop policy if exists sites_read on sites;
create policy sites_read on sites for select
  using (is_account() or has_engagement(engagement_id) or status = 'published');

drop policy if exists sites_insert on sites;
create policy sites_insert on sites for insert with check (is_account());

drop policy if exists sites_update on sites;
create policy sites_update on sites for update
  using (is_account()) with check (is_account());

drop policy if exists sites_delete on sites;
create policy sites_delete on sites for delete using (is_account());

alter table site_sections enable row level security;

drop policy if exists site_sections_read on site_sections;
create policy site_sections_read on site_sections for select
  using (
    is_account()
    or has_engagement(site_engagement_id(site_id))
    or is_site_published(site_id)
  );

drop policy if exists site_sections_insert on site_sections;
create policy site_sections_insert on site_sections for insert with check (is_account());

drop policy if exists site_sections_update on site_sections;
create policy site_sections_update on site_sections for update
  using (is_account()) with check (is_account());

drop policy if exists site_sections_delete on site_sections;
create policy site_sections_delete on site_sections for delete using (is_account());
