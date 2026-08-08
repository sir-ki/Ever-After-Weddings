// Suggested budget categories, free text against this list rather than a
// check constraint — same reasoning as checklist categories and
// entourage roles. Deliberately broader than the vendor directory's own
// category list (which is constrained, and covers only suppliers a
// couple would browse for): a wedding budget also holds church and civil
// fees, transport, stationery and rings, none of which are vendors in
// the directory sense.
export const BUDGET_CATEGORIES = [
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "photo_video", label: "Photo & video" },
  { value: "attire", label: "Attire" },
  { value: "hmua", label: "Hair & makeup" },
  { value: "florals_styling", label: "Florals & styling" },
  { value: "cake", label: "Cake" },
  { value: "music", label: "Music & entertainment" },
  { value: "church_civil", label: "Church & civil fees" },
  { value: "stationery", label: "Stationery & printing" },
  { value: "transport", label: "Transport" },
  { value: "rings", label: "Rings" },
  { value: "coordination", label: "Coordination" },
  { value: "other", label: "Other" },
] as const;

export function budgetCategoryLabel(category: string): string {
  return BUDGET_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export type BudgetItem = {
  id: string;
  category: string;
  label: string;
  engagement_vendor_id: string | null;
  estimated_amount: number | null;
  actual_amount: number | null;
  paid_amount: number | null;
  next_payment_due: string | null;
  notes: string | null;
  sort_order: number;
};

// Postgres `numeric` can arrive as a string depending on the driver and
// the value's size — coerce defensively rather than trusting the shape.
function num(value: number | string | null): number {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// What a line item is actually expected to cost: the real figure once
// booked, falling back to the estimate while it's still a plan.
export function committedAmount(item: BudgetItem): number {
  return item.actual_amount != null ? num(item.actual_amount) : num(item.estimated_amount);
}

export function outstandingAmount(item: BudgetItem): number {
  return Math.max(0, committedAmount(item) - num(item.paid_amount));
}

export type BudgetTotals = {
  estimated: number;
  committed: number;
  paid: number;
  outstanding: number;
};

export function budgetTotals(items: BudgetItem[]): BudgetTotals {
  const estimated = items.reduce((sum, i) => sum + num(i.estimated_amount), 0);
  const committed = items.reduce((sum, i) => sum + committedAmount(i), 0);
  const paid = items.reduce((sum, i) => sum + num(i.paid_amount), 0);
  return { estimated, committed, paid, outstanding: Math.max(0, committed - paid) };
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

// Mirrors the checklist's own due-date states, minus "done" — a payment
// is either overdue, coming up, or far enough out not to shout about.
export type PaymentState = "overdue" | "soon" | "scheduled" | "settled" | "none";

export function paymentState(item: BudgetItem): PaymentState {
  if (outstandingAmount(item) === 0 && committedAmount(item) > 0) return "settled";
  if (!item.next_payment_due) return "none";

  const today = new Date().toISOString().slice(0, 10);
  if (item.next_payment_due < today) return "overdue";

  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  if (item.next_payment_due <= twoWeeksOut.toISOString().slice(0, 10)) return "soon";

  return "scheduled";
}
