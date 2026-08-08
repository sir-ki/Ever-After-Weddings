import { notFound } from "next/navigation";
import { getDayHubByToken } from "@/lib/guest-token";

function formatTime(time: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

  const firstName = hub.guestName.split(" ")[0];
  const weddingDate = formatDate(hub.weddingDate);

  if (!hub.unlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="ea-font-serif ea-fade-in text-[26px] leading-tight text-[var(--ea-ink)]">
          Not quite yet, {firstName}
        </p>
        <p className="ea-fade-in mt-3 max-w-xs text-[15px] leading-relaxed text-[var(--ea-ink-secondary)]">
          The hub opens the morning of the wedding
          {weddingDate ? ` — ${weddingDate}` : ""}. Check back then.
        </p>
      </div>
    );
  }

  const hasVenue =
    hub.venue.ceremony_venue || hub.venue.ceremony_address || hub.venue.reception_venue;

  return (
    <div className="min-h-screen pb-16">
      <div className="ea-hero-banner" style={{ height: 140 }}>
        <div className="ea-hero-banner__art" />
        <div className="ea-hero-banner__arch" />
        <div className="ea-hero-banner__scrim" />
        <div className="ea-hero-banner__content flex h-full flex-col items-center justify-end pb-4">
          <p className="text-xs tracking-wide text-[var(--ea-ink-secondary)] lowercase">
            hi {firstName} · today
          </p>
        </div>
      </div>

      <div className="ea-fade-in flex flex-col gap-5 px-5 pt-5">
        {hub.rsvpStatus === "accepted" ? (
          <div className="rounded-[10px] bg-[var(--ea-blush)] p-6 text-center">
            <p className="text-xs font-medium tracking-wide text-[var(--ea-ink-secondary)] lowercase">
              your table
            </p>
            <p className="mt-1 font-sans text-[56px] font-bold leading-none text-[var(--ea-accent-ink)] [font-variant-numeric:tabular-nums]">
              {hub.tableLabel ?? "—"}
            </p>
            {!hub.tableLabel && (
              <p className="mt-3 text-sm text-[var(--ea-ink-secondary)]">
                Your table will be shared closer to the day.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-[10px] bg-[var(--ea-blush)] p-5 text-center">
            <p className="ea-font-serif text-xl text-[var(--ea-ink)]">
              We hope you can join us soon
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ea-ink-secondary)]">
              If your plans change, reach out to the couple directly — here&apos;s
              what&apos;s happening today, in case you&apos;d like to send your love
              from afar.
            </p>
          </div>
        )}

        {hub.livestream && (
          <a
            href={hub.livestream.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-[10px] border border-[var(--ea-accent)] bg-[var(--ea-blush)] px-4 py-4"
          >
            <p className="text-[11px] tracking-wide text-[var(--ea-accent-ink)] lowercase">
              watch the livestream
            </p>
            <p className="mt-1 text-[15px] text-[var(--ea-ink)]">
              {hub.livestream.startsAt
                ? `Starts ${formatTime(hub.livestream.startsAt)}`
                : "Tap to open the stream"}
            </p>
            {hub.livestream.note && (
              <p className="mt-1 text-xs text-[var(--ea-ink-muted)]">{hub.livestream.note}</p>
            )}
          </a>
        )}

        {hub.announcement && (
          <div className="rounded-[10px] bg-[var(--ea-accent)] px-4 py-4 text-[#FFF8F5]">
            <p className="text-[11px] tracking-wide opacity-85 lowercase">right now</p>
            <p className="mt-1 text-[15px] leading-snug">{hub.announcement}</p>
          </div>
        )}

        {hub.schedule.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs tracking-wide text-[var(--ea-ink-muted)] lowercase">
              today&apos;s schedule
            </h2>
            <div className="rounded-[10px] border border-[var(--ea-border)]">
              {hub.schedule.map((item, i) => (
                <div
                  key={i}
                  className="flex items-baseline gap-4 border-t border-[var(--ea-border)] px-4 py-3 first:border-t-0"
                >
                  <span className="w-16 shrink-0 text-sm text-[var(--ea-ink-secondary)] [font-variant-numeric:tabular-nums]">
                    {formatTime(item.start_time) ?? ""}
                  </span>
                  <div>
                    <p className="text-[15px] text-[var(--ea-ink)]">{item.title}</p>
                    {item.location && (
                      <p className="text-xs text-[var(--ea-ink-muted)]">{item.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasVenue && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs tracking-wide text-[var(--ea-ink-muted)] lowercase">
              getting around
            </h2>
            <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--ea-border)] p-4">
              {hub.venue.ceremony_venue && (
                <div>
                  <p className="text-[15px] text-[var(--ea-ink)]">{hub.venue.ceremony_venue}</p>
                  {hub.venue.ceremony_address && (
                    <p className="text-xs text-[var(--ea-ink-muted)]">
                      {hub.venue.ceremony_address}
                    </p>
                  )}
                </div>
              )}
              {hub.venue.reception_venue && (
                <div>
                  <p className="text-[15px] text-[var(--ea-ink)]">{hub.venue.reception_venue}</p>
                  {hub.venue.reception_address && (
                    <p className="text-xs text-[var(--ea-ink-muted)]">
                      {hub.venue.reception_address}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {hub.coordinator && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs tracking-wide text-[var(--ea-ink-muted)] lowercase">
              who to ask
            </h2>
            <div className="rounded-[10px] border border-[var(--ea-border)] p-4">
              <p className="text-[15px] text-[var(--ea-ink)]">{hub.coordinator.name}</p>
              <p className="text-xs text-[var(--ea-ink-muted)]">{hub.coordinator.phone}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
