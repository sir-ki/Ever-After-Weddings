import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTable, deleteTable } from "./actions";
import { assignGuestTable } from "../guests/actions";

export default async function TablesTab({
  engagementId,
}: {
  engagementId: string;
}) {
  const supabase = await createClient();

  const [{ data: tables }, { data: guests }] = await Promise.all([
    supabase
      .from("tables")
      .select("id, label, capacity")
      .eq("engagement_id", engagementId)
      .order("sort_order"),
    supabase
      .from("guests")
      .select("id, full_name, guest_group, table_id")
      .eq("engagement_id", engagementId)
      .is("archived_at", null)
      .order("full_name"),
  ]);

  const guestsByTable = new Map<string, typeof guests>();
  const unassigned = [];
  for (const guest of guests ?? []) {
    if (guest.table_id) {
      const list = guestsByTable.get(guest.table_id) ?? [];
      list.push(guest);
      guestsByTable.set(guest.table_id, list);
    } else {
      unassigned.push(guest);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {tables?.length ?? 0} table{tables?.length === 1 ? "" : "s"} ·{" "}
          {unassigned.length} guest{unassigned.length === 1 ? "" : "s"} unassigned
        </p>
        <Link
          href={`/engagements/${engagementId}/tables/assign`}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Bulk assign by group
        </Link>
      </div>

      <form
        action={createTable}
        className="mb-6 flex items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            New table label
          </label>
          <input
            name="label"
            type="text"
            required
            placeholder="Table 1, Head table…"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div className="w-32">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Capacity
          </label>
          <input
            name="capacity"
            type="number"
            min={1}
            defaultValue={10}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Add table
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4">
        {tables?.map((table) => {
          const seated = guestsByTable.get(table.id) ?? [];
          const overCapacity = seated.length > table.capacity;

          return (
            <div
              key={table.id}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-neutral-900">{table.label}</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      overCapacity
                        ? "bg-red-100 text-red-700"
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {seated.length}/{table.capacity}
                  </span>
                  <form action={deleteTable}>
                    <input type="hidden" name="engagement_id" value={engagementId} />
                    <input type="hidden" name="table_id" value={table.id} />
                    <button
                      type="submit"
                      className="text-sm text-neutral-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              {seated.length ? (
                <ul className="space-y-2">
                  {seated.map((guest) => (
                    <li
                      key={guest.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-neutral-700">{guest.full_name}</span>
                      <form action={assignGuestTable} className="flex items-center gap-1">
                        <input type="hidden" name="engagement_id" value={engagementId} />
                        <input type="hidden" name="guest_id" value={guest.id} />
                        <select
                          name="table_id"
                          defaultValue={table.id}
                          className="rounded-md border border-neutral-300 px-1.5 py-1 text-xs focus:border-neutral-500 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {tables.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                        >
                          Move
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400">No one seated yet.</p>
              )}
            </div>
          );
        })}
      </div>

      {!tables?.length && (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          No tables yet. Add one above.
        </p>
      )}

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-neutral-900">
          Unassigned guests ({unassigned.length})
        </h3>
        {unassigned.length ? (
          <ul className="space-y-2">
            {unassigned.map((guest) => (
              <li key={guest.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">
                  {guest.full_name}
                  {guest.guest_group ? (
                    <span className="ml-2 text-neutral-400">{guest.guest_group}</span>
                  ) : null}
                </span>
                <form action={assignGuestTable} className="flex items-center gap-1">
                  <input type="hidden" name="engagement_id" value={engagementId} />
                  <input type="hidden" name="guest_id" value={guest.id} />
                  <select
                    name="table_id"
                    defaultValue=""
                    className="rounded-md border border-neutral-300 px-1.5 py-1 text-xs focus:border-neutral-500 focus:outline-none"
                  >
                    <option value="">Choose a table…</option>
                    {tables?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                  >
                    Seat
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">Everyone has a table.</p>
        )}
      </div>
    </div>
  );
}
