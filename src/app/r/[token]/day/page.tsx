import { notFound } from "next/navigation";
import { getDayHubByToken } from "@/lib/guest-token";

function formatTime(time: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function DayHubPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const hub = await getDayHubByToken(token);

  if (!hub) {
    notFound();
  }

  if (!hub.unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50 px-6 text-center">
        <div>
          <p className="text-xl font-semibold text-neutral-900">
            Not quite yet, {hub.guestName.split(" ")[0]}.
          </p>
          <p className="mt-2 text-base text-neutral-600">
            This page opens up on the wedding day. Check back then.
          </p>
        </div>
      </div>
    );
  }

  const hasVenue =
    hub.venue.ceremony_venue || hub.venue.ceremony_address || hub.venue.reception_venue;

  return (
    <div className="min-h-screen bg-rose-50 pb-16">
      {hub.announcement && (
        <div className="bg-neutral-900 px-5 py-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Right now
          </p>
          <p className="mt-1 text-lg leading-snug">{hub.announcement}</p>
        </div>
      )}

      <div className="px-5 pt-6">
        <p className="text-base text-neutral-600">Hi {hub.guestName.split(" ")[0]}</p>

        {hub.rsvpStatus === "accepted" ? (
          <div className="mt-3 rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Your table
            </p>
            <p className="mt-2 text-6xl font-bold text-neutral-900">
              {hub.tableLabel ?? "—"}
            </p>
            {!hub.tableLabel && (
              <p className="mt-2 text-sm text-neutral-500">
                Your table will be shared closer to the day.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-white p-5 text-center shadow-sm">
            <p className="text-base text-neutral-700">
              So glad you&apos;re following along — hope to see you again soon.
            </p>
          </div>
        )}
      </div>

      {hub.schedule.length > 0 && (
        <div className="mt-6 px-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Today&apos;s schedule
          </h2>
          <div className="rounded-xl bg-white shadow-sm">
            {hub.schedule.map((item, i) => (
              <div
                key={i}
                className="flex items-baseline gap-4 border-b border-neutral-100 px-4 py-3 last:border-0"
              >
                <span className="w-20 shrink-0 text-sm font-medium text-neutral-500">
                  {formatTime(item.start_time) ?? ""}
                </span>
                <div>
                  <p className="text-base text-neutral-900">{item.title}</p>
                  {item.location && (
                    <p className="text-sm text-neutral-500">{item.location}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasVenue && (
        <div className="mt-6 px-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Getting around
          </h2>
          <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            {hub.venue.ceremony_venue && (
              <div>
                <p className="text-base font-medium text-neutral-900">
                  {hub.venue.ceremony_venue}
                </p>
                {hub.venue.ceremony_address && (
                  <p className="text-sm text-neutral-500">{hub.venue.ceremony_address}</p>
                )}
              </div>
            )}
            {hub.venue.reception_venue && (
              <div>
                <p className="text-base font-medium text-neutral-900">
                  {hub.venue.reception_venue}
                </p>
                {hub.venue.reception_address && (
                  <p className="text-sm text-neutral-500">{hub.venue.reception_address}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {hub.coordinator && (
        <div className="mt-6 px-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Who to ask
          </h2>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-base text-neutral-900">{hub.coordinator.name}</p>
            <p className="text-sm text-neutral-500">{hub.coordinator.phone}</p>
          </div>
        </div>
      )}
    </div>
  );
}
