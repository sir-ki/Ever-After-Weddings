-- Ever After — security fix
-- handle_new_user() previously read global_role from raw_user_meta_data,
-- which any client can set via the public signUp() call (options.data)
-- with only the anon key. That let anyone self-assign global_role =
-- 'account' and get read/write access to every engagement. See
-- docs/ever-after-auth-and-access.md §2 and §7: Account has no public
-- signup path, by design.
--
-- Fix attempt #1 (superseded, never shipped past local testing): read
-- raw_app_meta_data instead, since only the service-role admin API can
-- set app_metadata. Verified against the live project that
-- auth.admin.createUser inserts the auth.users row first — firing this
-- trigger — and merges custom app_metadata fields in afterward, so the
-- trigger never actually observes them. app_metadata is no more
-- reliable than user_metadata for this trigger's purposes.
--
-- Actual fix: stop trusting any signup-time metadata for role
-- assignment. Every new user is created as 'couple', unconditionally.
-- Promoting to 'account' happens as a separate, explicit update after
-- the user exists — see scripts/create-account-user.mjs.
--
-- Paste this whole file into the Supabase SQL Editor and run it once.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, global_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'couple'
  );
  return new;
end;
$$;
