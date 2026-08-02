-- Ever After — self-service profile editing
-- Lets a signed-in user update their own full_name/phone (no profile-edit
-- UI existed before this; see HANDOFF.md §7). Deliberately not a plain
-- "allow self update" policy: users.global_role lives on this same row,
-- and migration 0007 already fixed one privilege-escalation bug caused by
-- trusting client-controlled data on this table. A trigger, not RLS column
-- scoping, is what actually enforces which columns a self-update can touch
-- — RLS policies can't be scoped per-column, only a trigger can silently
-- pin the sensitive ones back to their old values.
-- Paste this whole file into the Supabase SQL Editor and run it once.

drop policy if exists users_update_self on users;
create policy users_update_self on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function lock_self_update_sensitive_columns() returns trigger
language plpgsql security definer as $$
begin
  if not is_account() then
    new.global_role := old.global_role;
    new.email := old.email;
    new.archived_at := old.archived_at;
  end if;
  return new;
end;
$$;

drop trigger if exists lock_self_update_sensitive_columns on users;
create trigger lock_self_update_sensitive_columns
  before update on users
  for each row
  execute function lock_self_update_sensitive_columns();
