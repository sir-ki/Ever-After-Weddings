-- Ever After — Entourage & processional (launch-readiness spec, Part 6)
-- Roles on guests, an ordered processional, and a new `entourage` site
-- section — plus `footer`, folded in per the spec's own instruction since
-- it needs the same check-constraint change and was left as a known gap
-- in M5. See docs/ever-after-launch-readiness-spec.md Part 6.
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- Entourage members are existing guests (they RSVP, get seated, get
-- scanned) — this is an attribute on guests, not a separate table.
-- Free text against a suggested list rather than a check constraint:
-- Filipino weddings vary and a constraint here would generate a migration
-- every time a couple does something the list didn't anticipate.
alter table guests add column if not exists entourage_role text;
alter table guests add column if not exists entourage_sort int;

create table if not exists processional_entries (
  id             uuid primary key default gen_random_uuid(),
  engagement_id  uuid not null references engagements(id) on delete cascade,
  sort_order     int  not null default 0,
  label          text,
  left_guest_id  uuid references guests(id) on delete set null,
  right_guest_id uuid references guests(id) on delete set null,
  free_text      text,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists processional_entries_engagement_idx
  on processional_entries (engagement_id);

-- Same shape as tables_all / schedule_items_all (0004, 0006): a single
-- for-all policy, Account or the owning engagement's members, nobody else.
-- Not asymmetric — unlike site_sections, nothing here needs public read;
-- the entourage names that surface on the public site are pulled from
-- `guests` directly (via the admin client, same discipline as the public
-- site page's existing engagement lookup), not from this table.
alter table processional_entries enable row level security;

drop policy if exists processional_entries_all on processional_entries;
create policy processional_entries_all on processional_entries for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));

-- Adds 'entourage' and 'footer' section types. The check constraint has
-- no name in 0005_sites.sql, so it was created with an auto-generated
-- name — find and drop it before re-adding rather than assuming a name.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'site_sections'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%section_type%';

  if constraint_name is not null then
    execute format('alter table site_sections drop constraint %I', constraint_name);
  end if;
end $$;

alter table site_sections add constraint site_sections_section_type_check
  check (section_type in
    ('hero', 'story', 'the_day', 'rsvp', 'gallery', 'details', 'suppliers', 'entourage', 'footer'));
