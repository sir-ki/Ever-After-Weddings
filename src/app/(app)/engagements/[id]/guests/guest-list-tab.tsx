import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { archiveGuest, unarchiveGuest } from "./actions";
import CopyLinkButton from "./copy-link-button";
import { entourageRoleLabel } from "@/lib/entourage-roles";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const SIDE_LABELS: Record<string, string> = {
  bride: "Bride",
  groom: "Groom",
  both: "Both",
};

const RSVP_LABELS: Record<string, string> = {
  no_reply: "No reply",
  accepted: "Accepted",
  declined: "Declined",
};

const RSVP_STYLES: Record<string, string> = {
  no_reply: "bg-neutral-100 text-neutral-700",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 50;

export default async function GuestListTab({
  engagementId,
  searchParams,
  guestCap,
}: {
  engagementId: string;
  searchParams: { status?: string; group?: string; archived?: string; page?: string };
  guestCap: number;
}) {
  const supabase = await createClient();
  const showArchived = searchParams.archived === "1";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const { data: allGuests } = await supabase
    .from("guests")
    .select("id, rsvp_status, guest_group, archived_at")
    .eq("engagement_id", engagementId);

  const activeGuests = allGuests?.filter((g) => !g.archived_at) ?? [];
  const archivedCount = (allGuests?.length ?? 0) - activeGuests.length;

  const counts = {
    invited: activeGuests.length,
    accepted: activeGuests.filter((g) => g.rsvp_status === "accepted").length,
    declined: activeGuests.filter((g) => g.rsvp_status === "declined").length,
    no_reply: activeGuests.filter((g) => g.rsvp_status === "no_reply").length,
  };

  const groups = Array.from(
    new Set(activeGuests.map((g) => g.guest_group).filter(Boolean)),
  ).sort() as string[];

  let query = supabase
    .from("guests")
    .select(
      "id, full_name, side, guest_group, contact_phone, rsvp_status, archived_at, invite_token, entourage_role",
      { count: "exact" },
    )
    .eq("engagement_id", engagementId)
    .order("full_name", { ascending: true });

  query = showArchived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  if (searchParams.status) {
    query = query.eq("rsvp_status", searchParams.status);
  }
  if (searchParams.group) {
    query = query.eq("guest_group", searchParams.group);
  }

  const rangeStart = (page - 1) * PAGE_SIZE;
  query = query.range(rangeStart, rangeStart + PAGE_SIZE - 1);

  const { data: guests, error, count: filteredCount } = await query;

  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));

  const baseHref = `/engagements/${engagementId}?tab=guests`;
  const paramsHref = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    params.set("tab", "guests");
    if (searchParams.status) params.set("status", searchParams.status);
    if (searchParams.group) params.set("group", searchParams.group);
    if (searchParams.archived) params.set("archived", searchParams.archived);
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    return `/engagements/${engagementId}?${params.toString()}`;
  };

  const overCap = guestCap > 0 && activeGuests.length > guestCap;

  return (
    <div>
      {overCap && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {activeGuests.length} guests — {activeGuests.length - guestCap} over
          your guest cap of {guestCap}. This is advisory only; nothing is
          blocked. Raise the cap from the Overview tab if this is expected.
        </p>
      )}

      <div className="mb-4 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs uppercase text-neutral-500">Invited</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {counts.invited}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs uppercase text-neutral-500">Accepted</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">
            {counts.accepted}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs uppercase text-neutral-500">Declined</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">
            {counts.declined}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs uppercase text-neutral-500">No reply</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {counts.no_reply}
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <form className="flex gap-3" method="get">
          <input type="hidden" name="tab" value="guests" />
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">All RSVP statuses</option>
            <option value="no_reply">No reply</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
          <select
            name="group"
            defaultValue={searchParams.group ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Filter
          </button>
          {(searchParams.status || searchParams.group) && (
            <Link
              href={baseHref}
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="flex gap-2">
          <a
            href={`/engagements/${engagementId}/guests/invitations`}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Download all invitations
          </a>
          <Link
            href={`/engagements/${engagementId}/guests/rotate-all`}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Rotate all links
          </Link>
          <Link
            href={`/engagements/${engagementId}/guests/import`}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Bulk import
          </Link>
          <Link
            href={`/engagements/${engagementId}/guests/new`}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add guest
          </Link>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load guests: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Side</th>
              <th className="px-4 py-3 font-medium">Group</th>
              <th className="px-4 py-3 font-medium">Entourage</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">RSVP</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {guests?.length ? (
              guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {guest.full_name}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {SIDE_LABELS[guest.side] ?? guest.side}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {guest.guest_group || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {guest.entourage_role ? (
                      <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                        {entourageRoleLabel(guest.entourage_role)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {guest.contact_phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${RSVP_STYLES[guest.rsvp_status]}`}
                    >
                      {RSVP_LABELS[guest.rsvp_status] ?? guest.rsvp_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {!showArchived ? (
                        <>
                          <Link
                            href={`/r/${guest.invite_token}`}
                            target="_blank"
                            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
                          >
                            RSVP link ↗
                          </Link>
                          <Link
                            href={`/r/${guest.invite_token}/day`}
                            target="_blank"
                            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
                          >
                            Day hub ↗
                          </Link>
                          <a
                            href={`/engagements/${engagementId}/guests/${guest.id}/invitation`}
                            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
                          >
                            Download invitation
                          </a>
                          <CopyLinkButton url={`${SITE_URL}/r/${guest.invite_token}`} />
                          <Link
                            href={`/engagements/${engagementId}/guests/${guest.id}/edit`}
                            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/engagements/${engagementId}/guests/${guest.id}/rotate`}
                            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
                          >
                            Regenerate link
                          </Link>
                          <form action={archiveGuest}>
                            <input
                              type="hidden"
                              name="engagement_id"
                              value={engagementId}
                            />
                            <input type="hidden" name="guest_id" value={guest.id} />
                            <button
                              type="submit"
                              className="text-sm text-neutral-500 hover:text-red-600 hover:underline"
                            >
                              Archive
                            </button>
                          </form>
                        </>
                      ) : (
                        <form action={unarchiveGuest}>
                          <input
                            type="hidden"
                            name="engagement_id"
                            value={engagementId}
                          />
                          <input type="hidden" name="guest_id" value={guest.id} />
                          <button
                            type="submit"
                            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
                          >
                            Unarchive
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  {showArchived ? "No archived guests." : "No guests found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              href={paramsHref({ page: String(page - 1) })}
              className="text-neutral-500 hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span className="text-neutral-300">← Previous</span>
          )}
          <span className="text-neutral-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={paramsHref({ page: String(page + 1) })}
              className="text-neutral-500 hover:underline"
            >
              Next →
            </Link>
          ) : (
            <span className="text-neutral-300">Next →</span>
          )}
        </div>
      )}

      <div className="mt-3 text-sm">
        {showArchived ? (
          <Link href={baseHref} className="text-neutral-500 hover:underline">
            ← Back to active guests
          </Link>
        ) : (
          <Link
            href={`${baseHref}&archived=1`}
            className="text-neutral-500 hover:underline"
          >
            View archived guests ({archivedCount})
          </Link>
        )}
      </div>
    </div>
  );
}
