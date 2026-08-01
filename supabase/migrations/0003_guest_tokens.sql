-- Ever After — Milestone 3 schema
-- invite_token (secure RNG, unique), meal/song fields, and a small
-- table backing IP rate-limiting on the guest token API.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create extension if not exists pgcrypto;

alter table guests add column if not exists invite_token text;
alter table guests add column if not exists meal_choice text;
alter table guests add column if not exists song_request text;

-- Backfill existing rows before the column is made NOT NULL.
update guests
set invite_token = rtrim(translate(encode(gen_random_bytes(16), 'base64'), '+/', '-_'), '=')
where invite_token is null;

alter table guests
  alter column invite_token set default
    rtrim(translate(encode(gen_random_bytes(16), 'base64'), '+/', '-_'), '=');

alter table guests alter column invite_token set not null;

create unique index if not exists guests_invite_token_key on guests (invite_token);

-- Rate limiting for the unauthenticated guest token endpoints
-- (/api/g/:token). Written and read only by the service role from
-- server-side route handlers — RLS stays on with no policies, so no
-- anon/authenticated request can read or write it.
create table if not exists guest_token_requests (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists guest_token_requests_ip_created_idx
  on guest_token_requests (ip, created_at);

alter table guest_token_requests enable row level security;
