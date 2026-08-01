import Link from "next/link";
import { createScheduleItem } from "../actions";

export default async function NewScheduleItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-lg">
      <Link
        href={`/engagements/${id}?tab=day-of`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Day-of Hub
      </Link>
      <h1 className="mb-6 mt-2 text-xl font-semibold text-neutral-900">
        Add schedule item
      </h1>

      <form action={createScheduleItem} className="space-y-4">
        <input type="hidden" name="engagement_id" value={id} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Time
            </label>
            <input
              name="start_time"
              type="time"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Title
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="Ceremony begins"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Location
            </label>
            <input
              name="location"
              type="text"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Owner (internal)
            </label>
            <input
              name="owner"
              type="text"
              placeholder="Marshal A"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Notes (internal)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="is_guest_visible" defaultChecked />
          Show on the guest-facing hub
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Add item
        </button>
      </form>
    </div>
  );
}
