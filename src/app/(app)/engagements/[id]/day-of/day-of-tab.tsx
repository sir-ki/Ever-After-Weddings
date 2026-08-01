import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  deleteScheduleItem,
  postAnnouncement,
  deactivateAnnouncement,
  unlockHub,
  lockHub,
} from "./actions";

function formatTime(time: string | null) {
  if (!time) return "—";
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function DayOfTab({ engagementId }: { engagementId: string }) {
  const supabase = await createClient();

  const [{ data: site }, { data: items }, { data: announcements }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, day_hub_unlocked_at")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
    supabase
      .from("schedule_items")
      .select("id, start_time, title, location, owner, notes, is_guest_visible")
      .eq("engagement_id", engagementId)
      .order("start_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("announcements")
      .select("id, body, posted_at, is_active")
      .eq("engagement_id", engagementId)
      .order("posted_at", { ascending: false })
      .limit(10),
  ]);

  const activeAnnouncement = announcements?.find((a) => a.is_active);
  const isUnlocked =
    !!site?.day_hub_unlocked_at && new Date(site.day_hub_unlocked_at) <= new Date();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 font-medium text-neutral-900">Hub visibility</h3>
        {!site ? (
          <p className="text-sm text-neutral-500">
            No site yet —{" "}
            <Link
              href={`/engagements/${engagementId}?tab=website`}
              className="underline hover:text-neutral-700"
            >
              create one first
            </Link>
            . The hub unlocks per-site.
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              {isUnlocked ? (
                <>
                  Unlocked since{" "}
                  {new Date(site.day_hub_unlocked_at!).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </>
              ) : (
                "Hidden from guests until unlocked."
              )}
            </p>
            <form action={isUnlocked ? lockHub : unlockHub}>
              <input type="hidden" name="engagement_id" value={engagementId} />
              <input type="hidden" name="site_id" value={site.id} />
              <button
                type="submit"
                className={
                  isUnlocked
                    ? "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                    : "rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                }
              >
                {isUnlocked ? "Lock hub" : "Unlock hub now"}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-neutral-900">Right now</h3>
        {activeAnnouncement ? (
          <div className="mb-4 flex items-start justify-between rounded-md bg-amber-50 p-3">
            <p className="text-sm text-amber-900">{activeAnnouncement.body}</p>
            <form action={deactivateAnnouncement}>
              <input type="hidden" name="engagement_id" value={engagementId} />
              <input type="hidden" name="announcement_id" value={activeAnnouncement.id} />
              <button
                type="submit"
                className="ml-3 whitespace-nowrap text-xs text-amber-700 hover:underline"
              >
                Clear
              </button>
            </form>
          </div>
        ) : (
          <p className="mb-4 text-sm text-neutral-400">No active announcement.</p>
        )}
        <form action={postAnnouncement} className="flex gap-2">
          <input type="hidden" name="engagement_id" value={engagementId} />
          <input
            name="body"
            type="text"
            placeholder="Ceremony starts in 15 minutes — please take your seats."
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Post
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">Run of show</h3>
          <Link
            href={`/engagements/${engagementId}/day-of/new`}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add item
          </Link>
        </div>
        {items?.length ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Time</th>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Location</th>
                <th className="py-2 pr-3 font-medium">Owner</th>
                <th className="py-2 pr-3 font-medium">Visible</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3 text-neutral-600">{formatTime(item.start_time)}</td>
                  <td className="py-2 pr-3 text-neutral-900">{item.title}</td>
                  <td className="py-2 pr-3 text-neutral-600">{item.location || "—"}</td>
                  <td className="py-2 pr-3 text-neutral-600">{item.owner || "—"}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.is_guest_visible
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {item.is_guest_visible ? "Guest" : "Internal"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/engagements/${engagementId}/day-of/${item.id}/edit`}
                        className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteScheduleItem}>
                        <input type="hidden" name="engagement_id" value={engagementId} />
                        <input type="hidden" name="item_id" value={item.id} />
                        <button
                          type="submit"
                          className="text-sm text-neutral-500 hover:text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-neutral-400">No schedule items yet.</p>
        )}
      </div>
    </div>
  );
}
