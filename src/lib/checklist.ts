// Suggested checklist categories, free text against this list rather
// than a check constraint — same reasoning as entourage-roles.ts.
// docs/ever-after-checklist-spec.md §2.
export const CHECKLIST_CATEGORIES = [
  { value: "church_civil", label: "Church & civil" },
  { value: "suppliers", label: "Suppliers" },
  { value: "attire", label: "Attire" },
  { value: "couple_tasks", label: "Couple's own tasks" },
  { value: "ever_after", label: "Ever After's tasks" },
  { value: "guests", label: "Guests" },
  { value: "final_week", label: "Final week" },
] as const;

export function checklistCategoryLabel(category: string): string {
  return CHECKLIST_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export const CHECKLIST_OWNERS = [
  { value: "couple", label: "Couple" },
  { value: "coordinator", label: "Coordinator" },
  { value: "shared", label: "Shared" },
] as const;

export type ChecklistItem = {
  id: string;
  title: string;
  category: string;
  notes: string | null;
  owner: string;
  weeks_before: number | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
};

// Explicit due_date always wins (a user overrode a specific item).
// Otherwise weeks_before is resolved against the wedding date. Deliberately
// application code, not a generated column — the wedding date can change,
// and a stored computed value would go stale (spec §2).
export function resolveDueDate(
  item: Pick<ChecklistItem, "due_date" | "weeks_before">,
  weddingDate: string | null,
): string | null {
  if (item.due_date) return item.due_date;
  if (item.weeks_before == null || !weddingDate) return null;

  const wedding = new Date(`${weddingDate}T00:00:00`);
  wedding.setDate(wedding.getDate() - item.weeks_before * 7);
  return wedding.toISOString().slice(0, 10);
}

export type DueState = "overdue" | "soon" | "open" | "done" | "unscheduled";

export function dueState(resolvedDate: string | null, completed: boolean): DueState {
  if (completed) return "done";
  if (!resolvedDate) return "unscheduled";

  const today = new Date().toISOString().slice(0, 10);
  if (resolvedDate < today) return "overdue";

  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  if (resolvedDate <= twoWeeksOut.toISOString().slice(0, 10)) return "soon";

  return "open";
}
