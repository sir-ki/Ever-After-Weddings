-- Livestream link (docs/ever-after-checklist-spec.md appendix). Plain
-- link-out fields on engagements, same table/RLS shape as the existing
-- ceremony_venue/ceremony_time columns from 0001_init.sql — no new
-- table, no embedding, nothing hosted. Writable Account-only via the
-- existing engagements_write_account policy (0001_init.sql); the spec's
-- own "Account and couple" framing isn't available here since
-- engagements has no couple-write RLS path at all today (every other
-- column on this table is Account-only too) — a documented deviation,
-- not an oversight.
alter table engagements
  add column if not exists livestream_url text,
  add column if not exists livestream_starts_at time,
  add column if not exists livestream_note text;
