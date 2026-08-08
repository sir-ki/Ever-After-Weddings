-- Ever After — Budget tracking
-- Named in the PRD's Phase 1 scope ("Planner, budget & entourage", and a
-- "Budget/Planner" workspace tab) and deliberately kept out of the
-- planning checklist (docs/ever-after-checklist-spec.md §1: "an item may
-- read 'pay photographer balance' but must not hold the figure. Budget
-- tracking is a different feature with different requirements, and it
-- will swallow this one if allowed in"). This is that different feature.

create table if not exists budget_items (
  id                   uuid primary key default gen_random_uuid(),
  engagement_id        uuid not null references engagements(id) on delete cascade,
  category             text not null,
  label                text not null,

  -- Optional link to a supplier already logged for this engagement, so a
  -- line item can carry the vendor's real name/contact without
  -- duplicating them. on delete set null: removing a supplier from the
  -- vendor log must never silently delete the money recorded against it.
  engagement_vendor_id uuid references engagement_vendors(id) on delete set null,

  -- estimated: what the couple planned. actual: what it really costs
  -- once booked (null until then). Both nullable — a line item can exist
  -- as a placeholder before any figure is known.
  estimated_amount     numeric,
  actual_amount        numeric,

  -- One running total rather than a payments table. Filipino weddings
  -- (and Ever After's own terms) are near-universally deposit-then-
  -- balance, so per-payment history earns less than it costs here; the
  -- date below covers "what's due next", which is the question that
  -- actually gets asked. A real payments table is additive later.
  paid_amount          numeric not null default 0,
  next_payment_due     date,

  notes                text,
  sort_order           int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists budget_items_engagement_idx
  on budget_items (engagement_id, sort_order);

-- Same single for-all policy shape as checklist_items / tables /
-- processional_entries: Account or the owning engagement's members,
-- nobody else. The couple genuinely reads and writes their own budget —
-- it's their money, and a budget they can't see is barely a feature.
-- Nothing here is ever guest-visible or public: no token path touches
-- this table, and it has no public-read carve-out by design.
alter table budget_items enable row level security;

drop policy if exists budget_items_all on budget_items;
create policy budget_items_all on budget_items for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));
