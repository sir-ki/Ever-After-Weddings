-- Ever After — Media library (post-launch-readiness)
-- The `media` table docs/ever-after-data-model.md planned from the
-- start but deferred past MVP ("media can come after — it has no
-- dependents"). Real per-couple photo uploads for the wedding site,
-- replacing pasted external image URLs. Scope: Account/couple uploads
-- only this pass — `source`/`is_approved` already anticipate a later
-- guest-upload moderation flow, not built here; guest uploads always
-- start unapproved when that fast-follow lands, but the two sources
-- this pass actually uses (couple, account) default straight to
-- approved since there's no moderation queue yet.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists media (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  storage_path  text not null unique,
  kind          text not null default 'photo' check (kind in ('photo', 'video')),
  uploaded_by   uuid references users(id),
  source        text not null check (source in ('couple', 'account', 'guest')),
  caption       text,
  is_approved   boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists media_engagement_idx on media (engagement_id);

-- Same single for-all policy shape as tables_all / schedule_items_all /
-- processional_entries_all: Account or the owning engagement's members,
-- nobody else.
alter table media enable row level security;

drop policy if exists media_all on media;
create policy media_all on media for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));

-- Public bucket: published-site images must load for anonymous visitors
-- without signed URLs, same as every other image on the site today.
-- Public buckets serve downloads directly — no select policy needed for
-- that path. Insert/delete are scoped by path: every object must live
-- at {engagement_id}/{filename}, and storage.foldername(name) is the
-- standard Supabase idiom for reading that first path segment back out
-- to check against the same has_engagement()/is_account() helpers every
-- other table's RLS already uses.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_objects_insert on storage.objects;
create policy media_objects_insert on storage.objects for insert
  with check (
    bucket_id = 'media'
    and (is_account() or has_engagement((storage.foldername(name))[1]::uuid))
  );

drop policy if exists media_objects_select on storage.objects;
create policy media_objects_select on storage.objects for select
  using (
    bucket_id = 'media'
    and (is_account() or has_engagement((storage.foldername(name))[1]::uuid))
  );

drop policy if exists media_objects_delete on storage.objects;
create policy media_objects_delete on storage.objects for delete
  using (
    bucket_id = 'media'
    and (is_account() or has_engagement((storage.foldername(name))[1]::uuid))
  );
