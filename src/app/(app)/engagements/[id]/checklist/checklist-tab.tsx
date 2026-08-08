import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  CHECKLIST_CATEGORIES,
  CHECKLIST_OWNERS,
  CHECKLIST_LINK_TARGETS,
  checklistCategoryLabel,
  resolveDueDate,
  resolveLinkTarget,
  dueState,
  type ChecklistItem,
  type DueState,
} from "@/lib/checklist";
import {
  addChecklistItem,
  updateChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  moveChecklistItem,
  addChecklistItemsFromTemplate,
  updateWeddingDate,
} from "./actions";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-500";

const DUE_STYLES: Record<DueState, string> = {
  overdue: "bg-red-100 text-red-800",
  soon: "bg-amber-100 text-amber-800",
  open: "bg-neutral-100 text-neutral-600",
  done: "bg-green-100 text-green-800",
  unscheduled: "bg-neutral-100 text-neutral-400",
};

function formatDate(date: string | null) {
  if (!date) return "No date";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ChecklistTab({
  engagementId,
  searchParams,
}: {
  engagementId: string;
  searchParams: { owner?: string; status?: string; category?: string };
}) {
  const supabase = await createClient();

  const [{ data: engagement }, { data: itemsRaw }] = await Promise.all([
    supabase.from("engagements").select("wedding_date").eq("id", engagementId).single(),
    supabase
      .from("checklist_items")
      .select(
        "id, title, category, notes, owner, weeks_before, due_date, completed_at, completed_by, sort_order, link_target",
      )
      .eq("engagement_id", engagementId)
      .order("sort_order"),
  ]);

  const weddingDate = engagement?.wedding_date ?? null;
  const allItems = (itemsRaw ?? []) as ChecklistItem[];

  const withState = allItems.map((item) => {
    const resolved = resolveDueDate(item, weddingDate);
    return { item, resolved, state: dueState(resolved, !!item.completed_at) };
  });

  const completedCount = allItems.filter((i) => i.completed_at).length;
  const overdueCount = withState.filter((w) => w.state === "overdue").length;

  const { owner: ownerFilter, status: statusFilter, category: categoryFilter } = searchParams;

  const filtered = withState.filter(({ item, state }) => {
    if (ownerFilter && item.owner !== ownerFilter) return false;
    if (statusFilter === "open" && item.completed_at) return false;
    if (statusFilter === "complete" && !item.completed_at) return false;
    if (statusFilter === "overdue" && state !== "overdue") return false;
    if (categoryFilter && item.category !== categoryFilter) return false;
    return true;
  });

  const byCategory = new Map<string, typeof filtered>();
  for (const entry of filtered) {
    const list = byCategory.get(entry.item.category) ?? [];
    list.push(entry);
    byCategory.set(entry.item.category, list);
  }

  const categoriesToShow = CHECKLIST_CATEGORIES.filter(
    (c) => !categoryFilter || categoryFilter === c.value,
  );

  const filterLink = (next: Partial<{ owner: string; status: string; category: string }>) => {
    const params = new URLSearchParams();
    params.set("tab", "checklist");
    const merged = { owner: ownerFilter, status: statusFilter, category: categoryFilter, ...next };
    if (merged.owner) params.set("owner", merged.owner);
    if (merged.status) params.set("status", merged.status);
    if (merged.category) params.set("category", merged.category);
    return `/engagements/${engagementId}?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium text-neutral-900">
            {completedCount} / {allItems.length} complete
          </span>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <form action={updateWeddingDate} className="flex items-center gap-2 text-sm">
          <input type="hidden" name="engagement_id" value={engagementId} />
          <label className="text-neutral-500">Wedding date</label>
          <input
            name="wedding_date"
            type="date"
            defaultValue={weddingDate ?? ""}
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Save
          </button>
        </form>
        <form action={addChecklistItemsFromTemplate}>
          <input type="hidden" name="engagement_id" value={engagementId} />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Add items from template
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <span>Owner:</span>
          <a href={filterLink({ owner: undefined })} className={!ownerFilter ? "font-medium text-neutral-900" : ""}>
            All
          </a>
          {CHECKLIST_OWNERS.map((o) => (
            <a
              key={o.value}
              href={filterLink({ owner: o.value })}
              className={ownerFilter === o.value ? "font-medium text-neutral-900" : ""}
            >
              {o.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span>Status:</span>
          <a href={filterLink({ status: undefined })} className={!statusFilter ? "font-medium text-neutral-900" : ""}>
            All
          </a>
          {["open", "complete", "overdue"].map((s) => (
            <a
              key={s}
              href={filterLink({ status: s })}
              className={statusFilter === s ? "font-medium text-neutral-900" : ""}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span>Category:</span>
          <a
            href={filterLink({ category: undefined })}
            className={!categoryFilter ? "font-medium text-neutral-900" : ""}
          >
            All
          </a>
          {CHECKLIST_CATEGORIES.map((c) => (
            <a
              key={c.value}
              href={filterLink({ category: c.value })}
              className={categoryFilter === c.value ? "font-medium text-neutral-900" : ""}
            >
              {c.label}
            </a>
          ))}
        </div>
      </div>

      {categoriesToShow.map((category) => {
        const entries = (byCategory.get(category.value) ?? []).sort(
          (a, b) => a.item.sort_order - b.item.sort_order,
        );
        if (categoryFilter && entries.length === 0) return null;

        return (
          <div key={category.value}>
            <h3 className="mb-3 font-medium text-neutral-900">
              {category.label}
              {entries.length > 0 && (
                <span className="ml-2 text-xs font-normal text-neutral-400">
                  {entries.filter((e) => e.item.completed_at).length}/{entries.length}
                </span>
              )}
            </h3>

            <div className="space-y-2">
              {entries.map(({ item, resolved, state }, i) => (
                <div key={item.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <form action={toggleChecklistItem}>
                      <input type="hidden" name="engagement_id" value={engagementId} />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="completed" value={(!item.completed_at).toString()} />
                      <button
                        type="submit"
                        aria-label={item.completed_at ? "Mark incomplete" : "Mark complete"}
                        className={`mt-1 h-4 w-4 shrink-0 rounded border ${
                          item.completed_at
                            ? "border-green-600 bg-green-600"
                            : "border-neutral-300 bg-white"
                        }`}
                      />
                    </form>

                    <form action={updateChecklistItem} className="grid flex-1 grid-cols-4 gap-3">
                      <input type="hidden" name="engagement_id" value={engagementId} />
                      <input type="hidden" name="id" value={item.id} />
                      <div className="col-span-2">
                        <label className={labelClass}>Title</label>
                        <input name="title" type="text" defaultValue={item.title} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Owner</label>
                        <select name="owner" defaultValue={item.owner} className={inputClass}>
                          {CHECKLIST_OWNERS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Weeks before</label>
                        <input
                          name="weeks_before"
                          type="number"
                          min={0}
                          defaultValue={item.weeks_before ?? ""}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Due date override</label>
                        <input
                          name="due_date"
                          type="date"
                          defaultValue={item.due_date ?? ""}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Links to</label>
                        <select
                          name="link_target"
                          defaultValue={item.link_target ?? ""}
                          className={inputClass}
                        >
                          <option value="">—</option>
                          {CHECKLIST_LINK_TARGETS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
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
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DUE_STYLES[state]}`}>
                        {formatDate(resolved)}
                      </span>
                      {(() => {
                        const link = resolveLinkTarget(item.link_target);
                        return link ? (
                          <Link
                            href={link.href(engagementId)}
                            className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                          >
                            {link.label} →
                          </Link>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center gap-3 text-neutral-500">
                      <form action={moveChecklistItem}>
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
                      <form action={moveChecklistItem}>
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
                      <form action={deleteChecklistItem}>
                        <input type="hidden" name="engagement_id" value={engagementId} />
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="hover:text-red-600 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form
              action={addChecklistItem}
              className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 p-3"
            >
              <input type="hidden" name="engagement_id" value={engagementId} />
              <input type="hidden" name="category" value={category.value} />
              <div className="flex-1">
                <input
                  name="title"
                  type="text"
                  required
                  placeholder={`Add to ${checklistCategoryLabel(category.value)}…`}
                  className={inputClass}
                />
              </div>
              <select name="owner" defaultValue="couple" className={inputClass} style={{ width: 130 }}>
                {CHECKLIST_OWNERS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                name="weeks_before"
                type="number"
                min={0}
                placeholder="Weeks before"
                className={inputClass}
                style={{ width: 120 }}
              />
              <select name="link_target" defaultValue="" className={inputClass} style={{ width: 150 }}>
                <option value="">Links to…</option>
                {CHECKLIST_LINK_TARGETS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Add
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
