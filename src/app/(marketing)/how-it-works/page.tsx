import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { HowItWorksTimeline } from "@/components/marketing/how-it-works-timeline";

export const metadata: Metadata = {
  title: "How it works — Ever After",
  description: "The couple's journey with Ever After, from intake to the last dance.",
};

const STEPS = [
  ["Intake", "Tell us the date, the guest list, and the vibe. We take it from there."],
  ["We build your site", "Your wedding website, designed and built by our team, live in days."],
  ["Invitations sent", "In-site invitations go out with QR cards, over Messenger or printed."],
  ["RSVPs land automatically", "Every response flows straight into your guest list. No spreadsheet."],
  ["Seating", "Guests are grouped and assigned tables automatically, adjustable anytime."],
  ["Wedding day", "Coordinators on site, QR check-in at every entrance, live arrival counts."],
  ["Photos after", "We hand off a hub for photos and messages after the big day."],
].map(([title, desc], i) => ({ n: String(i + 1).padStart(2, "0"), title, desc }));

const GUEST_STEPS = [
  ["One link", "Every guest gets a single personal link."],
  ["Their invitation", "The link opens as their invitation, on their phone."],
  ["Their confirmation", "They RSVP right there. It lands in your guest list instantly."],
  ["Their day-of hub", "On the day, the same link becomes announcements and their table."],
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-[var(--ea-blush)] px-5 pb-20 pt-[150px] text-center md:px-10">
        <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
          how it works
        </div>
        <h1 className="mkt-font-serif mb-5 text-[clamp(34px,5vw,56px)] text-[var(--ea-ink)]">
          From intake to the last dance
        </h1>
        <p className="mx-auto max-w-[560px] text-lg text-[var(--ea-ink-secondary)]">
          Seven steps. We run every one of them — you just tell us what you need.
        </p>
      </section>

      <HowItWorksTimeline steps={STEPS} />

      <section className="bg-[var(--ea-champagne)] px-5 pb-[140px] pt-[100px] md:px-10">
        <div className="mx-auto mb-14 max-w-[600px] text-center">
          <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
            the guest&apos;s side
          </div>
          <h2 className="mkt-font-serif mb-3.5 text-[clamp(26px,3.6vw,36px)] text-[var(--ea-ink)]">
            One link, start to finish
          </h2>
          <p className="text-base text-[var(--ea-ink-secondary)]">
            Every guest gets a single link. It becomes their invitation, then their confirmation,
            then their hub for the day.
          </p>
        </div>
        <Reveal className="mx-auto flex max-w-[1000px] flex-wrap justify-center gap-0">
          {GUEST_STEPS.map(([title, desc], i) => (
            <div key={title} className="flex items-center">
              <div className="w-[200px] rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-canvas)] p-6 text-center">
                <div className="mkt-font-serif mb-2 text-[22px] text-[var(--ea-accent-ink)]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mb-1.5 text-sm font-semibold text-[var(--ea-ink)]">{title}</div>
                <div className="text-[13px] leading-[1.5] text-[var(--ea-ink-secondary)]">
                  {desc}
                </div>
              </div>
              {i < GUEST_STEPS.length - 1 && (
                <div className="h-px w-6 bg-[var(--ea-border)]" />
              )}
            </div>
          ))}
        </Reveal>
      </section>
    </>
  );
}
