import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CHECKLIST_CATEGORIES,
  CHECKLIST_OWNERS,
  CHECKLIST_LINK_TARGETS,
  checklistCategoryLabel,
} from "@/lib/checklist";
import {
  addTemplateItem,
  updateTemplateItem,
  deactivateTemplateItem,
  reactivateTemplateItem,
  moveTemplateItem,
} from "./actions";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-500";

type TemplateRow = {
  id: string;
  title: string;
  category: string;
  notes: string | null;
  owner: string;
  weeks_before: number | null;
  link_target: string | null;
  sort_order: number;
  is_active: boolean;
};

export default async function ChecklistTemplatePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user!.id)
    .single();

  if (profile?.global_role !== "account") {
    redirect("/dashboard");
  }

  const { data: rowsRaw } = await supabase
    .from("checklist_templates")
    .select("id, title, category, notes, owner, weeks_before, link_target, sort_order, is_active")
    .order("sort_order");

  const rows = (rowsRaw ?? []) as TemplateRow[];
  const byCategory = new Map<string, TemplateRow[]>();
  for (const row of rows) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Checklist template</h1>
        <p className="mt-1 text-sm text-neutral-500">
          The default checklist every new engagement is seeded from. Editing here never changes
          an engagement that&apos;s already been created — see docs/ever-after-checklist-spec.md
          §2.
        </p>
      </div>

      {CHECKLIST_CATEGORIES.map((category) => {
        const entries = (byCategory.get(category.value) ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const activeEntries = entries.filter((e) => e.is_active);

        return (
          <div key={category.value} className="mb-8">
            <h3 className="mb-3 font-medium text-neutral-900">
              {category.label}
              <span className="ml-2 text-xs font-normal text-neutral-400">
                {activeEntries.length} active
              </span>
            </h3>

            <div className="space-y-2">
              {entries.map((item, i) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 ${
                    item.is_active
                      ? "border-neutral-200 bg-white"
                      : "border-neutral-200 bg-neutral-50 opacity-60"
                  }`}
                >
                  <form action={updateTemplateItem} className="grid grid-cols-4 gap-3">
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
                    <div className="col-span-2">
                      <label className={labelClass}>Notes</label>
                      <input name="notes" type="text" defaultValue={item.notes ?? ""} className={inputClass} />
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

                  <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm text-neutral-500">
                    <span>{item.is_active ? "Active" : "Inactive — not used for new engagements"}</span>
                    <div className="flex items-center gap-3">
                      <form action={moveTemplateItem}>
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
                      <form action={moveTemplateItem}>
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
                      <form action={item.is_active ? deactivateTemplateItem : reactivateTemplateItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className={item.is_active ? "hover:text-red-600 hover:underline" : "hover:text-green-700 hover:underline"}
                        >
                          {item.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form
              action={addTemplateItem}
              className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 p-3"
            >
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
