import { createClient } from "@/lib/supabase/server";
import { ENTOURAGE_ROLES, entourageRoleLabel } from "@/lib/entourage-roles";
import {
  assignEntourageRole,
  addProcessionalEntry,
  updateProcessionalEntry,
  deleteProcessionalEntry,
  moveProcessionalEntry,
} from "./actions";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-500";

export default async function EntourageTab({ engagementId }: { engagementId: string }) {
  const supabase = await createClient();

  const [{ data: guests }, { data: entries }] = await Promise.all([
    supabase
      .from("guests")
      .select("id, full_name, entourage_role")
      .eq("engagement_id", engagementId)
      .is("archived_at", null)
      .order("full_name"),
    supabase
      .from("processional_entries")
      .select("id, sort_order, label, left_guest_id, right_guest_id, free_text, notes")
      .eq("engagement_id", engagementId)
      .order("sort_order"),
  ]);

  const guestList = guests ?? [];
  const guestName = new Map(guestList.map((g) => [g.id, g.full_name]));

  const byRole = new Map<string, { id: string; full_name: string }[]>();
  for (const g of guestList) {
    if (!g.entourage_role) continue;
    const list = byRole.get(g.entourage_role) ?? [];
    list.push(g);
    byRole.set(g.entourage_role, list);
  }
  const rolesInUse = Array.from(byRole.keys()).sort((a, b) => {
    const ai = ENTOURAGE_ROLES.findIndex((r) => r.value === a);
    const bi = ENTOURAGE_ROLES.findIndex((r) => r.value === b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const unassignedGuests = guestList.filter((g) => !g.entourage_role);
  const orderedEntries = entries ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 font-medium text-neutral-900">Entourage roles</h3>

        <form
          action={assignEntourageRole}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <input type="hidden" name="engagement_id" value={engagementId} />
          <div className="flex-1">
            <label className={labelClass}>Guest</label>
            <select name="guest_id" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Choose a guest…
              </option>
              {(unassignedGuests.length ? unassignedGuests : guestList).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                  {g.entourage_role ? ` (${entourageRoleLabel(g.entourage_role)})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className={labelClass}>Role</label>
            <input
              name="entourage_role"
              list="entourage-role-options"
              placeholder="e.g. principal_sponsor, or type your own"
              className={inputClass}
            />
            <datalist id="entourage-role-options">
              {ENTOURAGE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Assign
          </button>
        </form>

        {rolesInUse.length ? (
          <div className="space-y-3">
            {rolesInUse.map((role) => (
              <div key={role} className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-neutral-900">
                    {entourageRoleLabel(role)}
                  </h4>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {byRole.get(role)!.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {byRole.get(role)!.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between text-sm text-neutral-700"
                    >
                      {g.full_name}
                      <form action={assignEntourageRole}>
                        <input type="hidden" name="engagement_id" value={engagementId} />
                        <input type="hidden" name="guest_id" value={g.id} />
                        <input type="hidden" name="entourage_role" value="" />
                        <button
                          type="submit"
                          className="text-xs text-neutral-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            No entourage roles assigned yet.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-medium text-neutral-900">Processional</h3>

        <form
          action={addProcessionalEntry}
          className="mb-4 grid grid-cols-5 gap-3 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <input type="hidden" name="engagement_id" value={engagementId} />
          <div>
            <label className={labelClass}>Label</label>
            <input name="label" type="text" placeholder="Ring bearer" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Left</label>
            <select name="left_guest_id" defaultValue="" className={inputClass}>
              <option value="">—</option>
              {guestList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Right</label>
            <select name="right_guest_id" defaultValue="" className={inputClass}>
              <option value="">—</option>
              {guestList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Or non-guest</label>
            <input
              name="free_text"
              type="text"
              placeholder="Church coordinator"
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Add entry
            </button>
          </div>
        </form>

        {orderedEntries.length ? (
          <div className="space-y-2">
            {orderedEntries.map((entry, i) => (
              <div
                key={entry.id}
                className="rounded-lg border border-neutral-200 bg-white p-4"
              >
                <form
                  action={updateProcessionalEntry}
                  className="grid grid-cols-5 gap-3"
                >
                  <input type="hidden" name="engagement_id" value={engagementId} />
                  <input type="hidden" name="id" value={entry.id} />
                  <div>
                    <label className={labelClass}>Label</label>
                    <input
                      name="label"
                      type="text"
                      defaultValue={entry.label ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Left</label>
                    <select
                      name="left_guest_id"
                      defaultValue={entry.left_guest_id ?? ""}
                      className={inputClass}
                    >
                      <option value="">—</option>
                      {guestList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Right</label>
                    <select
                      name="right_guest_id"
                      defaultValue={entry.right_guest_id ?? ""}
                      className={inputClass}
                    >
                      <option value="">—</option>
                      {guestList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Or non-guest</label>
                    <input
                      name="free_text"
                      type="text"
                      defaultValue={entry.free_text ?? ""}
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
                  <div className="col-span-4">
                    <label className={labelClass}>Notes</label>
                    <input
                      name="notes"
                      type="text"
                      defaultValue={entry.notes ?? ""}
                      className={inputClass}
                    />
                  </div>
                </form>

                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm text-neutral-500">
                  <span>
                    {guestName.get(entry.left_guest_id ?? "") ?? entry.free_text ?? "—"}
                    {entry.right_guest_id
                      ? ` & ${guestName.get(entry.right_guest_id) ?? ""}`
                      : ""}
                  </span>
                  <div className="flex items-center gap-3">
                    <form action={moveProcessionalEntry}>
                      <input type="hidden" name="engagement_id" value={engagementId} />
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={i === 0}
                        className="hover:text-neutral-900 hover:underline disabled:text-neutral-300 disabled:no-underline"
                      >
                        ↑ Move up
                      </button>
                    </form>
                    <form action={moveProcessionalEntry}>
                      <input type="hidden" name="engagement_id" value={engagementId} />
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={i === orderedEntries.length - 1}
                        className="hover:text-neutral-900 hover:underline disabled:text-neutral-300 disabled:no-underline"
                      >
                        ↓ Move down
                      </button>
                    </form>
                    <form action={deleteProcessionalEntry}>
                      <input type="hidden" name="engagement_id" value={engagementId} />
                      <input type="hidden" name="id" value={entry.id} />
                      <button type="submit" className="hover:text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            No processional entries yet.
          </p>
        )}
      </div>
    </div>
  );
}
