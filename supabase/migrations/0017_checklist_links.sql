-- Checklist item deep links (docs/ever-after-checklist-spec.md §8's own
-- open question: "should a checklist item link to the thing it's
-- about?"). A nullable tab key — 'guests', 'website', 'printables' etc.
-- — resolved to /engagements/{id}?tab={link_target} at render time.
--
-- Free text, no check constraint, matching this schema's existing
-- convention for category/entourage_role. The values here are this
-- app's own tab keys rather than culturally-variable data, so a
-- constraint would be defensible — but it would also mean a migration
-- every time the workspace's tab list changes, and the app already
-- degrades safely: src/lib/checklist.ts resolves an unknown value to
-- null and renders no link at all, rather than a broken one.
alter table checklist_items
  add column if not exists link_target text;

alter table checklist_templates
  add column if not exists link_target text;
