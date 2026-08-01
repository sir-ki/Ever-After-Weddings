import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createCheckpoint, updateCheckpoint, deleteCheckpoint } from "./actions";

export default async function CheckpointsTab({
  engagementId,
}: {
  engagementId: string;
}) {
  const supabase = await createClient();

  const [{ data: checkpoints }, { count: acceptedCount }] = await Promise.all([
    supabase
      .from("checkpoints")
      .select("id, name, sort_order, is_active")
      .eq("engagement_id", engagementId)
      .order("sort_order"),
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("engagement_id", engagementId)
      .eq("rsvp_status", "accepted")
      .is("archived_at", null),
  ]);

  const checkpointIds = (checkpoints ?? []).map((c) => c.id);

  const { data: scans } = checkpointIds.length
    ? await supabase
        .from("guest_scans")
        .select("guest_id, checkpoint_id")
        .in("checkpoint_id", checkpointIds)
    : { data: [] as { guest_id: string; checkpoint_id: string }[] };

  // Live counts are derived on every render, never cached — staleness at a
  // live event is worse than a query (per the data model doc).
  const scannedByCheckpoint = new Map<string, Set<string>>();
  for (const scan of scans ?? []) {
    const set = scannedByCheckpoint.get(scan.checkpoint_id) ?? new Set<string>();
    set.add(scan.guest_id);
    scannedByCheckpoint.set(scan.checkpoint_id, set);
  }

  // "Arrived" = distinct guests scanned at checkpoint 1: the active
  // checkpoint with the lowest sort_order, per the data model doc.
  const arrivalCheckpoint = checkpoints?.find((c) => c.is_active) ?? null;
  const arrivedCount = arrivalCheckpoint
    ? (scannedByCheckpoint.get(arrivalCheckpoint.id)?.size ?? 0)
    : 0;
  const notYetArrived = Math.max((acceptedCount ?? 0) - arrivedCount, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {checkpoints?.length ?? 0} checkpoint{checkpoints?.length === 1 ? "" : "s"}
        </p>
        <Link
          href={`/engagements/${engagementId}/checkpoints/scan`}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Open scanner
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-neutral-500">Accepted</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {acceptedCount ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-neutral-500">Arrived</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{arrivedCount}</p>
          {!arrivalCheckpoint && (
            <p className="mt-1 text-xs text-neutral-400">No active checkpoint yet</p>
          )}
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Accepted, not arrived
          </p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{notYetArrived}</p>
        </div>
      </div>

      <form
        action={createCheckpoint}
        className="mb-6 flex items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            New checkpoint
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="Arrival, Gift table, Giveaways…"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Add checkpoint
        </button>
      </form>

      {checkpoints?.length ? (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Distinct guests scanned</th>
              <th className="py-2 pr-3 font-medium">Active</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {checkpoints.map((checkpoint) => (
              <tr key={checkpoint.id}>
                <td className="py-2 pr-3 text-neutral-900">
                  {checkpoint.name}
                  {arrivalCheckpoint?.id === checkpoint.id && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      Arrival
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-neutral-600">
                  {scannedByCheckpoint.get(checkpoint.id)?.size ?? 0}
                </td>
                <td className="py-2 pr-3">
                  <form action={updateCheckpoint} className="flex items-center gap-2">
                    <input type="hidden" name="engagement_id" value={engagementId} />
                    <input type="hidden" name="checkpoint_id" value={checkpoint.id} />
                    <input type="hidden" name="name" value={checkpoint.name} />
                    <input
                      type="hidden"
                      name="is_active"
                      value={checkpoint.is_active ? "" : "on"}
                    />
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        checkpoint.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {checkpoint.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      type="submit"
                      className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                    >
                      {checkpoint.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
                <td className="py-2">
                  <form action={deleteCheckpoint} className="text-right">
                    <input type="hidden" name="engagement_id" value={engagementId} />
                    <input type="hidden" name="checkpoint_id" value={checkpoint.id} />
                    <button
                      type="submit"
                      className="text-sm text-neutral-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          No checkpoints yet. Add one above — the first active checkpoint counts as
          arrival.
        </p>
      )}
    </div>
  );
}
