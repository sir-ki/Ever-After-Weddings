-- Ever After — Milestone 2 schema
-- guests table with RLS.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  full_name text not null,
  side text not null check (side in ('bride', 'groom', 'both')),
  guest_group text,
  contact_phone text,
  rsvp_status text not null default 'no_reply'
    check (rsvp_status in ('no_reply', 'accepted', 'declined')),
  rsvp_responded_at timestamptz,
  guest_notes text,
  internal_notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guests_engagement_rsvp_idx
  on guests (engagement_id, rsvp_status);

drop trigger if exists guests_set_updated_at on guests;
create trigger guests_set_updated_at
  before update on guests
  for each row execute procedure set_updated_at();

alter table guests enable row level security;

drop policy if exists guests_all on guests;
create policy guests_all on guests for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));
