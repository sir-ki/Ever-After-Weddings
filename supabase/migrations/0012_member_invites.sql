-- Ever After — Member invite flow (launch-readiness spec, Part 1)
-- engagement_invites: Account generates a copyable, single-use, expiring
-- link that attaches a couple/coordinator to an engagement. No email
-- sending — Account sends the link however they like. See
-- docs/ever-after-launch-readiness-spec.md Part 1 and
-- docs/ever-after-auth-and-access.md §7 for the full design intent.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists engagement_invites (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  email         text not null,
  role          text not null check (role in ('partner','coordinator')),
  token         text not null unique default encode(gen_random_bytes(24), 'base64'),
  invited_by    uuid not null references users(id),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  accepted_at   timestamptz,
  accepted_by   uuid references users(id),
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists engagement_invites_engagement_idx
  on engagement_invites (engagement_id);

-- Corrected below: plain base64 can contain '+' and '/', and a '/' in the
-- token breaks the /invite/[token] route (Next treats it as an extra path
-- segment) — caught live during Part 1's own verification walkthrough.
-- guests.invite_token (0003_guest_tokens.sql) already solved this with the
-- base64url translate/rtrim pattern; match it here instead of the plain
-- base64 default above. Safe to rerun: resets the default and fixes only
-- tokens that still contain the unsafe characters.
alter table engagement_invites alter column token set default
  rtrim(translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_'), '=');

update engagement_invites
set token = rtrim(translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_'), '=')
where token ~ '[+/=]';

-- The accept flow at /invite/[token] never queries through RLS — it uses
-- the admin client exclusively, same discipline as guest tokens
-- (src/lib/guest-token.ts) and the vendor public-signup path
-- (src/app/directory/apply/actions.ts). RLS here only governs the
-- authenticated People tab: Account manages invites, engagement members
-- can see who else has (or has been offered) access, nobody else.
alter table engagement_invites enable row level security;

drop policy if exists engagement_invites_select on engagement_invites;
create policy engagement_invites_select on engagement_invites for select
  using (is_account() or has_engagement(engagement_id));

drop policy if exists engagement_invites_write_account on engagement_invites;
create policy engagement_invites_write_account on engagement_invites for all
  using (is_account()) with check (is_account());
