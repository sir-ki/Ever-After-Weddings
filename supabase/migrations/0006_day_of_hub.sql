-- Ever After — Milestone 6 schema
-- schedule_items and announcements, with the same operational-exception
-- RLS as guests/tables: couples fully own their day-of data.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists schedule_items (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  start_time time,
  title text not null,
  location text,
  owner text,
  notes text,
  is_guest_visible boolean not null default true,
  sort_order int not null default 0
);

create index if not exists schedule_items_engagement_idx on schedule_items (engagement_id);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  body text not null,
  posted_at timestamptz not null default now(),
  posted_by uuid references users (id),
  is_active boolean not null default true
);

create index if not exists announcements_engagement_active_idx
  on announcements (engagement_id, is_active);

alter table schedule_items enable row level security;

drop policy if exists schedule_items_all on schedule_items;
create policy schedule_items_all on schedule_items for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));

alter table announcements enable row level security;

drop policy if exists announcements_all on announcements;
create policy announcements_all on announcements for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));
