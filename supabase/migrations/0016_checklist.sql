-- Ever After — Planning checklist (docs/ever-after-checklist-spec.md)
-- A shared pre-wedding task list, seeded from a global template on every
-- new engagement, then freely edited. Fills the "months before the
-- wedding" gap — the platform covers the day itself well and the long
-- stretch before it barely at all.

create table if not exists checklist_items (
  id             uuid primary key default gen_random_uuid(),
  engagement_id  uuid not null references engagements(id) on delete cascade,
  title          text not null,
  category       text not null,
  notes          text,
  owner          text not null default 'couple'
                   check (owner in ('couple','coordinator','shared')),
  weeks_before   int,                      -- null = no computed due date
  due_date       date,                     -- explicit override; wins over weeks_before
  completed_at   timestamptz,
  completed_by   uuid references users(id) on delete set null,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists checklist_items_engagement_idx
  on checklist_items (engagement_id, sort_order);

-- Same shape as tables_all / schedule_items_all / processional_entries_all:
-- one for-all policy, Account or the owning engagement's members, nobody
-- else. Unlike `engagements`, this is a brand-new table, so a real
-- couple-write path is just written correctly from the start.
alter table checklist_items enable row level security;

drop policy if exists checklist_items_all on checklist_items;
create policy checklist_items_all on checklist_items for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));

-- The template: Account-editable, global rather than per-engagement —
-- the accumulated expertise of every wedding this platform has run.
-- Seeding an engagement COPIES active rows into checklist_items; editing
-- the template later must never mutate a live engagement's list.
create table if not exists checklist_templates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text not null,
  notes        text,
  owner        text not null default 'couple'
                 check (owner in ('couple','coordinator','shared')),
  weeks_before int,
  sort_order   int not null default 0,
  is_active    boolean not null default true
);

alter table checklist_templates enable row level security;

-- Global, not engagement-scoped — any signed-in user (couple or Account)
-- can read the template, same as picking from a shared list.
drop policy if exists checklist_templates_read on checklist_templates;
create policy checklist_templates_read on checklist_templates for select
  using (auth.role() = 'authenticated');

drop policy if exists checklist_templates_write_account on checklist_templates;
create policy checklist_templates_write_account on checklist_templates for insert
  with check (is_account());

drop policy if exists checklist_templates_update_account on checklist_templates;
create policy checklist_templates_update_account on checklist_templates for update
  using (is_account()) with check (is_account());

drop policy if exists checklist_templates_delete_account on checklist_templates;
create policy checklist_templates_delete_account on checklist_templates for delete
  using (is_account());
