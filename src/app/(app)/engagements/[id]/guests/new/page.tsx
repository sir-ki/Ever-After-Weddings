import Link from "next/link";
import { createGuest } from "../actions";

export default async function NewGuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  return (
    <div className="max-w-lg">
      <Link
        href={`/engagements/${id}?tab=guests`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Guest list
      </Link>
      <h1 className="mb-6 mt-2 text-xl font-semibold text-neutral-900">
        Add guest
      </h1>

      <form action={createGuest} className="space-y-4">
        <input type="hidden" name="engagement_id" value={id} />

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
              defaultValue="both"
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
              placeholder="Family, Ninong, High school…"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>

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
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
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
            placeholder="Dietary needs, allergies, mobility, arriving late…"
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
          Add guest
        </button>
      </form>
    </div>
  );
}
