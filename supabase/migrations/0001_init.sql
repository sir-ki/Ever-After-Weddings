-- Ever After — Milestone 0 schema
-- users (with global_role), engagements, engagement_members, RLS.
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- ============================================================
-- users
-- ============================================================

create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  phone text,
  global_role text not null default 'couple'
    check (global_role in ('account', 'couple', 'vendor')),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- ============================================================
-- engagements
-- ============================================================

create table if not exists engagements (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  partner_a_name text,
  partner_b_name text,
  wedding_date date,
  stage text not null default 'onboarding'
    check (stage in ('onboarding', 'building', 'live', 'post_wedding', 'archived')),
  assigned_to uuid references users (id),
  rsvp_deadline date,
  ceremony_venue text,
  ceremony_address text,
  ceremony_time time,
  reception_venue text,
  reception_address text,
  reception_time time,
  expected_guest_count int,
  guest_cap int not null default 50,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists engagements_wedding_date_idx on engagements (wedding_date);
create index if not exists engagements_stage_idx on engagements (stage);
create index if not exists engagements_assigned_to_idx on engagements (assigned_to);

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists engagements_set_updated_at on engagements;
create trigger engagements_set_updated_at
  before update on engagements
  for each row execute procedure set_updated_at();

-- ============================================================
-- engagement_members
-- ============================================================

create table if not exists engagement_members (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in ('partner', 'coordinator')),
  created_at timestamptz not null default now(),
  unique (engagement_id, user_id)
);

-- ============================================================
-- auto-create a users row when someone signs up in auth.users
-- ============================================================

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, global_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'global_role', 'couple')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- RLS helper functions
-- ============================================================

create or replace function is_account() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from users
    where id = auth.uid() and global_role = 'account' and archived_at is null
  );
$$;

create or replace function has_engagement(eid uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from engagement_members
    where user_id = auth.uid() and engagement_id = eid
  );
$$;

-- ============================================================
-- RLS policies
-- ============================================================

alter table users enable row level security;

drop policy if exists users_select on users;
create policy users_select on users for select
  using (is_account() or id = auth.uid());

drop policy if exists users_update_account on users;
create policy users_update_account on users for update
  using (is_account()) with check (is_account());

alter table engagements enable row level security;

drop policy if exists engagements_read on engagements;
create policy engagements_read on engagements for select
  using (is_account() or has_engagement(id));

drop policy if exists engagements_write_account on engagements;
create policy engagements_write_account on engagements for all
  using (is_account()) with check (is_account());

alter table engagement_members enable row level security;

drop policy if exists engagement_members_select on engagement_members;
create policy engagement_members_select on engagement_members for select
  using (is_account() or user_id = auth.uid());

drop policy if exists engagement_members_write_account on engagement_members;
create policy engagement_members_write_account on engagement_members for all
  using (is_account()) with check (is_account());
