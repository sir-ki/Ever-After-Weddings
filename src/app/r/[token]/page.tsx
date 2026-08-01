import { notFound } from "next/navigation";
import { getGuestByToken, isPastDeadline } from "@/lib/guest-token";
import RsvpForm from "./rsvp-form";

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function GuestRsvpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getGuestByToken(token);

  if (!result) {
    notFound();
  }

  const { guest, engagement } = result;
  const deadlinePassed = isPastDeadline(engagement.rsvp_deadline);

  return (
    <div className="min-h-screen bg-rose-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg border border-rose-100 bg-white p-8 shadow-sm">
        <p className="text-sm text-neutral-500">You&apos;re invited to</p>
        <h1 className="text-2xl font-semibold text-neutral-900">
          {engagement.display_name}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {formatDate(engagement.wedding_date) ?? "Date to be announced"}
          {engagement.ceremony_venue ? ` · ${engagement.ceremony_venue}` : ""}
        </p>

        {!deadlinePassed && engagement.rsvp_deadline && (
          <p className="mt-2 text-sm font-medium text-neutral-700">
            Please reply by {formatDate(engagement.rsvp_deadline)}.
          </p>
        )}

        <div className="my-6 h-px bg-neutral-100" />

        <p className="text-sm text-neutral-500">Hi</p>
        <p className="text-lg font-medium text-neutral-900">{guest.full_name}</p>

        <RsvpForm token={token} guest={guest} deadlinePassed={deadlinePassed} />
      </div>
    </div>
  );
}
