-- Ever After — fix lock_self_update_sensitive_columns (migration 0010)
-- The trigger checked only is_account(), which is false for service-role
-- calls too (auth.uid() is null with no session) — so it silently pinned
-- global_role back to its old value even when the admin/service-role
-- client (scripts/create-account-user.mjs, verify-rls.mjs) did the
-- update. Caught by scripts/verify-rls.mjs's "second Account user"
-- checks failing right after 0010 was applied. Scope the lock to genuine
-- authenticated requests (auth.role() = 'authenticated') so service-role
-- writes are unaffected, same as every other table's RLS in this schema.
-- Paste this whole file into the Supabase SQL Editor and run it once.

create or replace function lock_self_update_sensitive_columns() returns trigger
language plpgsql security definer as $$
begin
  if auth.role() = 'authenticated' and not is_account() then
    new.global_role := old.global_role;
    new.email := old.email;
    new.archived_at := old.archived_at;
  end if;
  return new;
end;
$$;
