import { notFound } from "next/navigation";
import { getGuestByToken, isPastDeadline } from "@/lib/guest-token";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const { data: site } = await createAdminClient()
    .from("sites")
    .select("day_hub_unlocked_at")
    .eq("engagement_id", result.engagementId)
    .maybeSingle();
  const hubUnlocked =
    !!site?.day_hub_unlocked_at && new Date(site.day_hub_unlocked_at) <= new Date();

  return (
    <div className="min-h-screen pb-16">
      <div className="ea-hero-banner" style={{ height: 260 }}>
        <div className="ea-hero-banner__art" />
        <div className="ea-hero-banner__arch" />
        <div className="ea-hero-banner__scrim" />
        <div className="ea-hero-banner__content flex h-full flex-col items-center justify-end gap-1 px-6 pb-6 text-center">
          <p className="text-xs tracking-wide text-[var(--ea-ink-secondary)] lowercase">
            you&apos;re invited to
          </p>
          <h1 className="ea-font-serif mt-1 text-[40px] leading-[1.15] text-[var(--ea-ink)] text-balance">
            {engagement.display_name}
          </h1>
          <p className="mt-2 text-sm text-[var(--ea-ink-secondary)]">
            {formatDate(engagement.wedding_date) ?? "Date to be announced"}
          </p>
          {engagement.ceremony_venue && (
            <p className="text-xs text-[var(--ea-ink-muted)]">{engagement.ceremony_venue}</p>
          )}
        </div>
      </div>

      <div className="ea-fade-in mx-auto max-w-md px-6 pt-6 text-center">
        <p className="text-sm text-[var(--ea-ink-secondary)]">hi</p>
        <p className="ea-font-serif mt-1 text-xl text-[var(--ea-accent-ink)]">
          {guest.full_name}
        </p>

        {!deadlinePassed && engagement.rsvp_deadline && (
          <p className="mt-3 text-xs text-[var(--ea-ink-muted)]">
            Please reply by {formatDate(engagement.rsvp_deadline)}
          </p>
        )}

        <RsvpForm
          token={token}
          guest={guest}
          deadlinePassed={deadlinePassed}
          hubUnlocked={hubUnlocked}
        />
      </div>
    </div>
  );
}
