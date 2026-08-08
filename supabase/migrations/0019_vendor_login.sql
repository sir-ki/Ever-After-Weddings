-- Ever After — Vendor self-service login
-- docs/ever-after-auth-and-access.md §2/§4 sketched this from day one
-- ("Vendor — self-registers — can only read and write their own
-- vendors row and its photos") but M8 deliberately deferred it — see
-- HANDOFF.md §5's "signup-only, no vendor login" note. This wires up
-- the vendors_owner_write policy that was already sketched but never
-- implemented, plus the trigger that keeps a vendor's own edit from
-- ever being able to self-approve.

-- A pending vendor needs to read their own row after logging in — the
-- existing policy only allowed is_account() or an already-approved row.
drop policy if exists vendors_read on vendors;
create policy vendors_read on vendors for select
  using (is_account() or status = 'approved' or owner_user_id = auth.uid());

drop policy if exists vendors_owner_write on vendors;
create policy vendors_owner_write on vendors for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Same class of bug migration 0007 fixed (a client-writable privilege
-- column) and the same fix shape as 0010/0011's
-- lock_self_update_sensitive_columns trigger: RLS's `with check` can
-- constrain which ROW a vendor can touch (their own), but not which
-- COLUMNS within it — a plain vendors_owner_write policy would let a
-- vendor PATCH status='approved' directly via the API, bypassing
-- Account review entirely. This trigger unconditionally drops status
-- to 'pending' on any non-Account write, which also happens to be
-- exactly what the auth doc's own note asks for ("any edit to an
-- approved listing should arguably drop it back to pending") — one
-- mechanism does both jobs. Gated on auth.role() = 'authenticated'
-- (not "not is_account()"), per the exact lesson 0011 already
-- documents: that condition is also false for the service-role client,
-- which would otherwise silently break Account's own approve/reject
-- actions and this feature's own signup flow.
create or replace function lock_vendor_self_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' and not is_account() then
    new.status := 'pending';
    new.owner_user_id := old.owner_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_lock_self_approval on vendors;
create trigger vendors_lock_self_approval
  before update on vendors
  for each row execute function lock_vendor_self_approval();

-- Photos are "their own row and its photos" per the auth doc — a vendor
-- manages their own photo list the same way Account already can.
drop policy if exists vendor_photos_read on vendor_photos;
create policy vendor_photos_read on vendor_photos for select
  using (
    is_account()
    or vendor_is_approved(vendor_id)
    or exists (
      select 1 from vendors v where v.id = vendor_photos.vendor_id and v.owner_user_id = auth.uid()
    )
  );

drop policy if exists vendor_photos_owner_write on vendor_photos;
create policy vendor_photos_owner_write on vendor_photos for all
  using (
    exists (select 1 from vendors v where v.id = vendor_photos.vendor_id and v.owner_user_id = auth.uid())
  )
  with check (
    exists (select 1 from vendors v where v.id = vendor_photos.vendor_id and v.owner_user_id = auth.uid())
  );
