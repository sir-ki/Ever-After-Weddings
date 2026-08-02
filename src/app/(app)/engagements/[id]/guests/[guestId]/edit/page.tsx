import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateGuest } from "../../actions";

export default async function EditGuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; guestId: string }>;
  searchParams: Promise<{ error?: string; rotated?: string }>;
}) {
  const { id, guestId } = await params;
  const { error, rotated } = await searchParams;
  const supabase = await createClient();

  const { data: guest } = await supabase
    .from("guests")
    .select(
      "id, full_name, side, guest_group, contact_phone, guest_notes, rsvp_status, table_id, invite_token",
    )
    .eq("id", guestId)
    .eq("engagement_id", id)
    .single();

  if (!guest) {
    notFound();
  }

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label")
    .eq("engagement_id", id)
    .order("sort_order");

  return (
    <div className="max-w-lg">
      <Link
        href={`/engagements/${id}?tab=guests`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Guest list
      </Link>
      <h1 className="mb-2 mt-2 text-xl font-semibold text-neutral-900">
        Edit guest
      </h1>

      {rotated && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Link regenerated. The old link no longer works.
        </p>
      )}

      <div className="mb-6 flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
        <span className="truncate text-neutral-600">
          /r/{guest.invite_token}
        </span>
        <Link
          href={`/engagements/${id}/guests/${guestId}/rotate`}
          className="ml-3 shrink-0 text-neutral-500 hover:text-neutral-900 hover:underline"
        >
          Regenerate link
        </Link>
      </div>

      <form action={updateGuest} className="space-y-4">
        <input type="hidden" name="engagement_id" value={id} />
        <input type="hidden" name="guest_id" value={guest.id} />

        <div>
          <label
            htmlFor="full_name"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            defaultValue={guest.full_name}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="side"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Side
            </label>
            <select
              id="side"
              name="side"
              defaultValue={guest.side}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            >
              <option value="bride">Bride</option>
              <option value="groom">Groom</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="guest_group"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Group
            </label>
            <input
              id="guest_group"
              name="guest_group"
              type="text"
              defaultValue={guest.guest_group ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="contact_phone"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Contact phone
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="text"
              defaultValue={guest.contact_phone ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="rsvp_status"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              RSVP status
            </label>
            <select
              id="rsvp_status"
              name="rsvp_status"
              defaultValue={guest.rsvp_status}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            >
              <option value="no_reply">No reply</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="table_id"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Table
          </label>
          <select
            id="table_id"
            name="table_id"
            defaultValue={guest.table_id ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Unassigned</option>
            {tables?.map((table) => (
              <option key={table.id} value={table.id}>
                {table.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="guest_notes"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Notes
          </label>
          <textarea
            id="guest_notes"
            name="guest_notes"
            rows={3}
            defaultValue={guest.guest_notes ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
