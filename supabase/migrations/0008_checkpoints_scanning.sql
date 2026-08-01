-- Ever After — Milestone 7 schema
-- checkpoints and guest_scans, with the same operational-exception RLS as
-- guests/tables/schedule_items: couples fully own their day-of data.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists checkpoints (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create index if not exists checkpoints_engagement_idx on checkpoints (engagement_id);

-- Append-only log: one row per scan event, never updated. The unique index
-- below (not just an index, per the data model's literal spec) means a
-- double-tap or a retried request under a flaky venue connection can never
-- produce two rows for the same guest at the same checkpoint, even under a
-- race — the app still does a friendly pre-check first so the UI can show
-- "already scanned at 3:14pm" instead of a raw constraint-violation error.
create table if not exists guest_scans (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests (id) on delete cascade,
  checkpoint_id uuid not null references checkpoints (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  scanned_by uuid references users (id),
  method text not null check (method in ('qr', 'manual'))
);

create unique index if not exists guest_scans_checkpoint_guest_key
  on guest_scans (checkpoint_id, guest_id);

-- guest_scans has no engagement_id column of its own — resolve it via the
-- guest row and via the checkpoint row, same security-definer pattern as
-- site_engagement_id() so RLS on guest_scans doesn't get tangled evaluating
-- RLS on guests/checkpoints.
create or replace function guest_engagement_id(gid uuid) returns uuid
language sql stable security definer as $$
  select engagement_id from guests where id = gid;
$$;

create or replace function checkpoint_engagement_id(cid uuid) returns uuid
language sql stable security definer as $$
  select engagement_id from checkpoints where id = cid;
$$;

alter table checkpoints enable row level security;

drop policy if exists checkpoints_all on checkpoints;
create policy checkpoints_all on checkpoints for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));

alter table guest_scans enable row level security;

-- Both the guest and the checkpoint must belong to the same engagement the
-- caller has access to. Checking only guest_engagement_id() here would let
-- a coordinator with access to their own guest log a scan against a
-- checkpoint belonging to a completely different engagement — RLS would
-- have let that insert through since the guest side alone was in scope.
-- That doesn't leak the other engagement's data, but it pollutes their
-- live arrival counts, which is exactly the failure mode this milestone
-- can't afford on the one day it has to work.
drop policy if exists guest_scans_all on guest_scans;
create policy guest_scans_all on guest_scans for all
  using (
    is_account()
    or (
      has_engagement(guest_engagement_id(guest_id))
      and guest_engagement_id(guest_id) = checkpoint_engagement_id(checkpoint_id)
    )
  )
  with check (
    is_account()
    or (
      has_engagement(guest_engagement_id(guest_id))
      and guest_engagement_id(guest_id) = checkpoint_engagement_id(checkpoint_id)
    )
  );
