import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { confirmBulkAssign } from "../actions";

type Guest = { id: string; full_name: string; table_id: string | null };
type Table = { id: string; label: string; capacity: number };

function computePlacements(
  groupGuests: Guest[],
  primaryTable: Table,
  otherTables: Table[],
  allGuests: Guest[],
) {
  const groupIds = new Set(groupGuests.map((g) => g.id));

  function availableAt(table: Table) {
    const occupantsNotInGroup = allGuests.filter(
      (g) => g.table_id === table.id && !groupIds.has(g.id),
    ).length;
    return Math.max(0, table.capacity - occupantsNotInGroup);
  }

  const placements: { table: Table; guests: Guest[] }[] = [];
  let remaining = [...groupGuests];

  const primaryAvailable = availableAt(primaryTable);
  const atPrimary = remaining.slice(0, primaryAvailable);
  remaining = remaining.slice(primaryAvailable);
  if (atPrimary.length > 0) {
    placements.push({ table: primaryTable, guests: atPrimary });
  }

  for (const table of otherTables) {
    if (remaining.length === 0) break;
    const available = availableAt(table);
    if (available === 0) continue;
    const atThisTable = remaining.slice(0, available);
    remaining = remaining.slice(available);
    placements.push({ table, guests: atThisTable });
  }

  return { placements, unseated: remaining };
}

export default async function BulkAssignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ group?: string; table?: string }>;
}) {
  const { id } = await params;
  const { group, table: tableId } = await searchParams;
  const supabase = await createClient();

  const [{ data: tables }, { data: allGuests }] = await Promise.all([
    supabase
      .from("tables")
      .select("id, label, capacity")
      .eq("engagement_id", id)
      .order("sort_order"),
    supabase
      .from("guests")
      .select("id, full_name, guest_group, table_id")
      .eq("engagement_id", id)
      .is("archived_at", null)
      .order("full_name"),
  ]);

  const groups = Array.from(
    new Set((allGuests ?? []).map((g) => g.guest_group).filter(Boolean)),
  ).sort() as string[];

  const backLink = `/engagements/${id}?tab=tables`;

  if (!group || !tableId) {
    return (
      <div className="max-w-md">
        <Link href={backLink} className="text-sm text-neutral-500 hover:underline">
          ← Tables & Seating
        </Link>
        <h1 className="mb-6 mt-2 text-xl font-semibold text-neutral-900">
          Bulk assign by group
        </h1>

        {!tables?.length ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            Add a table first.
          </p>
        ) : !groups.length ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            No guests have a group set yet.
          </p>
        ) : (
          <form className="space-y-4" method="get">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Group
              </label>
              <select
                name="group"
                defaultValue={group ?? ""}
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              >
                <option value="" disabled>
                  Choose a group…
                </option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Table
              </label>
              <select
                name="table"
                defaultValue={tableId ?? ""}
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              >
                <option value="" disabled>
                  Choose a table…
                </option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} (seats {t.capacity})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Preview assignment
            </button>
          </form>
        )}
      </div>
    );
  }

  const primaryTable = tables?.find((t) => t.id === tableId);
  const groupGuests = (allGuests ?? []).filter((g) => g.guest_group === group);

  if (!primaryTable || groupGuests.length === 0) {
    return (
      <div className="max-w-md">
        <Link href={backLink} className="text-sm text-neutral-500 hover:underline">
          ← Tables & Seating
        </Link>
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {!primaryTable
            ? "That table no longer exists."
            : `No active guests in "${group}".`}
        </p>
        <Link
          href={`/engagements/${id}/tables/assign`}
          className="mt-4 inline-block text-sm text-neutral-500 hover:underline"
        >
          Choose again
        </Link>
      </div>
    );
  }

  // Already ordered by sort_order from the query above.
  const otherTables = (tables ?? []).filter((t) => t.id !== primaryTable.id);

  const { placements, unseated } = computePlacements(
    groupGuests,
    primaryTable,
    otherTables,
    allGuests ?? [],
  );

  const overflowing = placements.length > 1 || unseated.length > 0;
  const assignmentsPayload = placements.flatMap(({ table, guests }) =>
    guests.map((g) => ({ guestId: g.id, tableId: table.id })),
  );

  return (
    <div className="max-w-lg">
      <Link href={backLink} className="text-sm text-neutral-500 hover:underline">
        ← Tables & Seating
      </Link>
      <h1 className="mb-2 mt-2 text-xl font-semibold text-neutral-900">
        Assign &ldquo;{group}&rdquo; to {primaryTable.label}
      </h1>

      {overflowing ? (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {groupGuests.length} guests in &ldquo;{group}&rdquo;. {primaryTable.label} seats{" "}
          {primaryTable.capacity}. The group doesn&apos;t fit at one table — here&apos;s
          exactly who goes where.
        </p>
      ) : (
        <p className="mb-4 text-sm text-neutral-600">
          {groupGuests.length} guest{groupGuests.length === 1 ? "" : "s"} will be seated
          at {primaryTable.label}.
        </p>
      )}

      <div className="space-y-4">
        {placements.map(({ table, guests }) => (
          <div key={table.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-neutral-900">
              {table.label} ({guests.length})
            </p>
            <ul className="space-y-1 text-sm text-neutral-600">
              {guests.map((g) => (
                <li key={g.id}>{g.full_name}</li>
              ))}
            </ul>
          </div>
        ))}

        {unseated.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="mb-2 text-sm font-medium text-red-800">
              No room anywhere — left unchanged ({unseated.length})
            </p>
            <ul className="space-y-1 text-sm text-red-700">
              {unseated.map((g) => (
                <li key={g.id}>{g.full_name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form action={confirmBulkAssign} className="mt-6 space-y-3">
        <input type="hidden" name="engagement_id" value={id} />
        <input
          type="hidden"
          name="assignments"
          value={JSON.stringify(assignmentsPayload)}
        />
        <button
          type="submit"
          disabled={assignmentsPayload.length === 0}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Confirm and assign
        </button>
        <Link
          href={`/engagements/${id}/tables/assign`}
          className="block text-center text-sm text-neutral-500 hover:underline"
        >
          Choose a different group or table
        </Link>
      </form>
    </div>
  );
}
