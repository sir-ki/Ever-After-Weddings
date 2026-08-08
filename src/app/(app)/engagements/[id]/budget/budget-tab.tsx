import { createClient } from "@/lib/supabase/server";
import {
  BUDGET_CATEGORIES,
  budgetCategoryLabel,
  budgetTotals,
  committedAmount,
  outstandingAmount,
  paymentState,
  formatPeso,
  type BudgetItem,
  type PaymentState,
} from "@/lib/budget";
import {
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  settleBudgetItem,
  moveBudgetItem,
} from "./actions";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-500";

const PAYMENT_STYLES: Record<PaymentState, string> = {
  overdue: "bg-red-100 text-red-800",
  soon: "bg-amber-100 text-amber-800",
  scheduled: "bg-neutral-100 text-neutral-600",
  settled: "bg-green-100 text-green-800",
  none: "bg-neutral-100 text-neutral-400",
};

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function paymentLabel(item: BudgetItem, state: PaymentState) {
  if (state === "settled") return "Settled";
  const outstanding = outstandingAmount(item);
  const due = formatDate(item.next_payment_due);
  if (!due) return outstanding > 0 ? `${formatPeso(outstanding)} outstanding` : "No amount yet";
  return `${formatPeso(outstanding)} due ${due}`;
}

export default async function BudgetTab({
  engagementId,
  error,
}: {
  engagementId: string;
  error?: string;
}) {
  const supabase = await createClient();

  const [{ data: itemsRaw }, { data: suppliers }] = await Promise.all([
    supabase
      .from("budget_items")
      .select(
        "id, category, label, engagement_vendor_id, estimated_amount, actual_amount, paid_amount, next_payment_due, notes, sort_order",
      )
      .eq("engagement_id", engagementId)
      .order("sort_order"),
    supabase
      .from("engagement_vendors")
      .select("id, business_name, category")
      .eq("engagement_id", engagementId)
      .order("business_name"),
  ]);

  const items = (itemsRaw ?? []) as BudgetItem[];
  const supplierList = suppliers ?? [];
  const supplierName = new Map(supplierList.map((s) => [s.id, s.business_name]));
  const totals = budgetTotals(items);

  const byCategory = new Map<string, BudgetItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const categoriesInUse = BUDGET_CATEGORIES.filter((c) => byCategory.has(c.value));

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-neutral-500">Estimated</div>
          <div className="mt-1 text-lg font-semibold text-neutral-900">
            {formatPeso(totals.estimated)}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Committed</div>
          <div className="mt-1 text-lg font-semibold text-neutral-900">
            {formatPeso(totals.committed)}
          </div>
          <div className="mt-0.5 text-xs text-neutral-400">Actual where known, else estimate</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Paid</div>
          <div className="mt-1 text-lg font-semibold text-green-700">
            {formatPeso(totals.paid)}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Outstanding</div>
          <div className="mt-1 text-lg font-semibold text-neutral-900">
            {formatPeso(totals.outstanding)}
          </div>
        </div>
      </div>

      <form
        action={addBudgetItem}
        className="grid grid-cols-4 gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <div className="col-span-4 text-sm font-medium text-neutral-900">Add a line item</div>
        <div>
          <label className={labelClass}>Category</label>
          <select name="category" defaultValue="venue" className={inputClass}>
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Label</label>
          <input
            name="label"
            type="text"
            required
            placeholder="e.g. Reception venue — The Peninsula"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Supplier (optional)</label>
          <select name="engagement_vendor_id" defaultValue="" className={inputClass}>
            <option value="">—</option>
            {supplierList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.business_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Estimated</label>
          <input name="estimated_amount" type="text" inputMode="decimal" placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Actual</label>
          <input name="actual_amount" type="text" inputMode="decimal" placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Paid</label>
          <input name="paid_amount" type="text" inputMode="decimal" placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Next payment due</label>
          <input name="next_payment_due" type="date" className={inputClass} />
        </div>
        <div className="col-span-3">
          <label className={labelClass}>Notes</label>
          <input name="notes" type="text" className={inputClass} />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add
          </button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          No budget line items yet.
        </p>
      ) : (
        categoriesInUse.map((category) => {
          const entries = (byCategory.get(category.value) ?? []).sort(
            (a, b) => a.sort_order - b.sort_order,
          );
          const subtotal = entries.reduce((sum, i) => sum + committedAmount(i), 0);

          return (
            <div key={category.value}>
              <h3 className="mb-3 flex items-baseline gap-2 font-medium text-neutral-900">
                {category.label}
                <span className="text-xs font-normal text-neutral-400">
                  {formatPeso(subtotal)}
                </span>
              </h3>

              <div className="space-y-2">
                {entries.map((item, i) => {
                  const state = paymentState(item);
                  return (
                    <div key={item.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                      <form action={updateBudgetItem} className="grid grid-cols-4 gap-3">
                        <input type="hidden" name="engagement_id" value={engagementId} />
                        <input type="hidden" name="id" value={item.id} />
                        <div className="col-span-2">
                          <label className={labelClass}>Label</label>
                          <input name="label" type="text" defaultValue={item.label} className={inputClass} />
                        </div>
                        <div className="col-span-2">
                          <label className={labelClass}>Supplier</label>
                          <select
                            name="engagement_vendor_id"
                            defaultValue={item.engagement_vendor_id ?? ""}
                            className={inputClass}
                          >
                            <option value="">—</option>
                            {supplierList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.business_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Estimated</label>
                          <input
                            name="estimated_amount"
                            type="text"
                            inputMode="decimal"
                            defaultValue={item.estimated_amount ?? ""}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Actual</label>
                          <input
                            name="actual_amount"
                            type="text"
                            inputMode="decimal"
                            defaultValue={item.actual_amount ?? ""}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Paid</label>
                          <input
                            name="paid_amount"
                            type="text"
                            inputMode="decimal"
                            defaultValue={item.paid_amount ?? 0}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Next payment due</label>
                          <input
                            name="next_payment_due"
                            type="date"
                            defaultValue={item.next_payment_due ?? ""}
                            className={inputClass}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className={labelClass}>Notes</label>
                          <input
                            name="notes"
                            type="text"
                            defaultValue={item.notes ?? ""}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                          >
                            Save
                          </button>
                        </div>
                      </form>

                      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STYLES[state]}`}
                          >
                            {paymentLabel(item, state)}
                          </span>
                          {item.engagement_vendor_id && (
                            <span className="text-xs text-neutral-400">
                              {supplierName.get(item.engagement_vendor_id) ?? "Supplier removed"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-neutral-500">
                          {state !== "settled" && committedAmount(item) > 0 && (
                            <form action={settleBudgetItem}>
                              <input type="hidden" name="engagement_id" value={engagementId} />
                              <input type="hidden" name="id" value={item.id} />
                              <button type="submit" className="hover:text-green-700 hover:underline">
                                Mark paid in full
                              </button>
                            </form>
                          )}
                          <form action={moveBudgetItem}>
                            <input type="hidden" name="engagement_id" value={engagementId} />
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="category" value={item.category} />
                            <input type="hidden" name="direction" value="up" />
                            <button
                              type="submit"
                              disabled={i === 0}
                              className="hover:text-neutral-900 hover:underline disabled:text-neutral-300 disabled:no-underline"
                            >
                              ↑
                            </button>
                          </form>
                          <form action={moveBudgetItem}>
                            <input type="hidden" name="engagement_id" value={engagementId} />
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="category" value={item.category} />
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              disabled={i === entries.length - 1}
                              className="hover:text-neutral-900 hover:underline disabled:text-neutral-300 disabled:no-underline"
                            >
                              ↓
                            </button>
                          </form>
                          <form action={deleteBudgetItem}>
                            <input type="hidden" name="engagement_id" value={engagementId} />
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="hover:text-red-600 hover:underline">
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <p className="text-xs text-neutral-400">
        {budgetCategoryLabel("coordination")} covers Ever After&apos;s own fee. Amounts are in
        pesos and visible to the couple and the Ever After team only — never to guests, and never
        on the public site.
      </p>
    </div>
  );
}
