-- Ever After — Milestone 4 schema
-- tables table, guests.table_id, RLS.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  label text not null,
  capacity int not null default 10,
  sort_order int not null default 0
);

create index if not exists tables_engagement_idx on tables (engagement_id);

alter table guests
  add column if not exists table_id uuid references tables (id) on delete set null;

create index if not exists guests_table_idx on guests (table_id);

alter table tables enable row level security;

drop policy if exists tables_all on tables;
create policy tables_all on tables for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));
