import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { Parallax } from "@/components/marketing/parallax";
import { CountUp } from "@/components/marketing/count-up";
import { PlaceholderImage } from "@/components/marketing/placeholder-image";

const PILLARS = [
  ["Wedding website", "A site for your wedding, built and maintained by our team."],
  [
    "Invitations & RSVPs",
    "In-site invitations with QR cards, sent over Messenger or printed. RSVPs flow straight into your guest list.",
  ],
  [
    "Guest list & seating",
    "Every RSVP organized automatically. Table assignments by group, done for you.",
  ],
  ["Day-of hub", "Live announcements and each guest's table, right on their phone."],
  ["QR check-in", "Check guests in at multiple entry points with live arrival counts."],
  [
    "Vendor directory & printables",
    "Browse trusted suppliers, and get place cards, table numbers, and the call sheet, printed and ready.",
  ],
];

const BRIEF_STEPS = [
  "Intake",
  "We build your site",
  "Invitations sent",
  "RSVPs land",
  "Seating",
  "Wedding day",
  "Photos after",
];

const BANDS: [string, string, number][] = [
  ["Intimate", "up to 60", 20000],
  ["Standard", "61–150", 40000],
  ["Grand", "151–300", 65000],
];

export default function MarketingHomePage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative flex min-h-[96vh] items-center overflow-hidden px-5 pb-16 pt-[120px] md:px-10"
        style={{ background: "linear-gradient(180deg, var(--ea-canvas) 0%, var(--ea-blush) 100%)" }}
      >
        <Parallax
          factor={0.07}
          className="absolute -right-[120px] -top-[120px] hidden rounded-full border border-[var(--ea-border)] md:block"
          style={{ width: "min(520px, 60vw)", height: "min(520px, 60vw)" }}
        >
          <div />
        </Parallax>
        <Parallax
          factor={0.16}
          className="absolute right-5 top-[14%] hidden md:block"
          style={{ width: "min(280px, 42vw)" }}
        >
          <PlaceholderImage caption="couple photo portrait 4:5" aspectRatio="4 / 5" />
        </Parallax>

        <div className="relative z-10 max-w-[600px]">
          <Reveal className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
            a full-service wedding platform
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mkt-font-serif mb-6 text-[clamp(38px,5.5vw,64px)] leading-[1.08] text-[var(--ea-ink)]">
              Everything you need for your wedding. Nothing you don&apos;t.
            </h1>
          </Reveal>
          <Reveal delay={160} className="mb-9 max-w-[480px] text-lg leading-[1.6] text-[var(--ea-ink-secondary)]">
            We build your wedding website, send the invitations, collect the RSVPs, seat the room,
            and run the day itself — so planning feels like one platform, not five.
          </Reveal>
          <Reveal delay={240} className="flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="rounded-[10px] bg-[var(--ea-accent)] px-7 py-[15px] text-[15px] font-semibold text-white"
            >
              Book a demo
            </Link>
            <Link
              href="/how-it-works"
              className="border-b border-[var(--ea-ink)] px-1 py-[15px] text-[15px] font-semibold text-[var(--ea-ink)]"
            >
              See how it works
            </Link>
          </Reveal>
        </div>
      </section>

      {/* The problem */}
      <section className="flex justify-center bg-[var(--ea-canvas)] px-5 py-[130px] md:px-10">
        <Reveal className="max-w-[680px] text-center">
          <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
            the problem
          </div>
          <h2 className="mkt-font-serif mb-[22px] text-[clamp(28px,4vw,42px)] leading-[1.25] text-balance text-[var(--ea-ink)]">
            Right now, planning a wedding means five apps, three spreadsheets, and a group chat
            that never sleeps.
          </h2>
          <p className="text-lg leading-[1.7] text-[var(--ea-ink-secondary)]">
            Guest lists live in one file, RSVPs in another, seating in a third. Someone has to
            chase every reply, build the invitations, and hold it all together on the day. That
            someone is usually the couple.
          </p>
        </Reveal>
      </section>

      {/* Six product pillars */}
      <section className="bg-[var(--ea-blush)] px-5 pb-[130px] pt-[100px] md:px-10">
        <div className="mx-auto mb-16 max-w-[640px] text-center">
          <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
            what we build
          </div>
          <h2 className="mkt-font-serif text-[clamp(28px,4vw,40px)] text-[var(--ea-ink)]">
            One platform, everything handled
          </h2>
        </div>
        <div className="mx-auto grid max-w-[1160px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(([title, desc], i) => (
            <Reveal
              key={title}
              delay={i * 70}
              className="rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-canvas)] p-8"
            >
              <div className="mkt-font-serif mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ea-border)] text-base text-[var(--ea-accent-ink)]">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mkt-font-serif mb-2.5 text-xl text-[var(--ea-ink)]">{title}</h3>
              <p className="text-[15px] leading-[1.6] text-[var(--ea-ink-secondary)]">{desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works in brief */}
      <section className="bg-[var(--ea-canvas)] px-5 py-[120px] md:px-10">
        <div className="mx-auto mb-14 max-w-[600px] text-center">
          <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
            how it works
          </div>
          <h2 className="mkt-font-serif mb-4 text-[clamp(26px,3.6vw,38px)] text-[var(--ea-ink)]">
            From intake to &ldquo;I do&rdquo;
          </h2>
          <p className="text-base text-[var(--ea-ink-secondary)]">
            Seven steps, start to finish. We run all of them.
          </p>
        </div>
        <Reveal className="mx-auto flex max-w-[1100px] flex-wrap justify-center gap-0">
          {BRIEF_STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex w-[130px] flex-col items-center gap-2.5 text-center">
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--ea-accent)] text-[13px] font-semibold text-white">
                  {i + 1}
                </div>
                <span className="text-[13px] leading-[1.35] text-[var(--ea-ink)]">{label}</span>
              </div>
              {i < BRIEF_STEPS.length - 1 && (
                <div className="mb-11 h-px w-7 bg-[var(--ea-border)]" />
              )}
            </div>
          ))}
        </Reveal>
        <div className="mt-12 text-center">
          <Link href="/how-it-works" className="text-[15px] font-semibold text-[var(--ea-accent-ink)]">
            See the full walkthrough →
          </Link>
        </div>
      </section>

      {/* Full-service promise */}
      <section className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-[60px] bg-[var(--ea-champagne)] px-5 py-[130px] md:grid-cols-2 md:px-10">
        <Parallax factor={0.02} axis="x">
          <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
            the full-service promise
          </div>
          <h2 className="mkt-font-serif mb-5 text-[clamp(28px,3.6vw,38px)] text-[var(--ea-ink)]">
            We run it, so you don&apos;t have to.
          </h2>
          <p className="mb-4 text-base leading-[1.7] text-[var(--ea-ink-secondary)]">
            Your website, invitations, guest list, and seating chart are built and maintained by
            our team from day one. On the wedding day, our coordinators are on site running
            check-in and keeping the day on schedule.
          </p>
          <p className="text-base leading-[1.7] text-[var(--ea-ink-secondary)]">
            You approve the details. We handle the admin.
          </p>
        </Parallax>
        <Parallax factor={-0.02} axis="x">
          <PlaceholderImage caption="coordinator on-site — wide, 4:3" aspectRatio="4 / 3" />
        </Parallax>
      </section>

      {/* Testimonial placeholder */}
      <section className="flex justify-center bg-[var(--ea-canvas)] px-5 py-[130px] md:px-10">
        <Reveal className="max-w-[640px] rounded-[10px] border border-dashed border-[var(--ea-border)] px-10 py-14 text-center">
          <div className="mkt-font-serif mb-2 text-[52px] leading-none text-[var(--ea-border)]">
            &ldquo;
          </div>
          <p className="mkt-font-serif mb-5 text-xl italic leading-[1.5] text-[var(--ea-ink-secondary)]">
            Testimonial placeholder — a quote from a couple will go here after the first wedding.
          </p>
          <div className="mx-auto mb-2.5 h-11 w-11 rounded-full bg-[var(--ea-champagne)]" />
          <div className="font-mono text-[13px] text-[var(--ea-ink-muted)]">
            couple&apos;s name — wedding date
          </div>
        </Reveal>
      </section>

      {/* Pricing teaser */}
      <section className="bg-[var(--ea-blush)] px-5 pb-[140px] pt-[120px] md:px-10">
        <div className="mx-auto mb-14 max-w-[600px] text-center">
          <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
            pricing
          </div>
          <h2 className="mkt-font-serif text-[clamp(26px,3.6vw,38px)] text-[var(--ea-ink)]">
            Simple, transparent, by guest count
          </h2>
        </div>
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-5 sm:grid-cols-3">
          {BANDS.map(([name, guests, price], i) => (
            <Reveal
              key={name}
              delay={i * 70}
              className="rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-canvas)] px-7 py-9 text-center"
            >
              <div className="mb-2.5 text-[13px] tracking-wide text-[var(--ea-accent-ink)]">
                {name}
              </div>
              <div className="mb-[18px] text-sm text-[var(--ea-ink-muted)]">{guests} guests</div>
              <div className="mkt-font-serif text-4xl text-[var(--ea-ink)]">
                <CountUp target={price} prefix="₱" />
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-11 text-center">
          <Link href="/pricing" className="text-[15px] font-semibold text-[var(--ea-accent-ink)]">
            See full pricing &amp; what&apos;s included →
          </Link>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative flex h-[70vh] min-h-[480px] items-center justify-center overflow-hidden">
        <Parallax mode="scale" factor={0} className="absolute inset-0">
          <PlaceholderImage caption="full-bleed photo — wide" aspectRatio="auto" className="h-full w-full" />
        </Parallax>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--ea-canvas) 10%, transparent) 0%, color-mix(in srgb, var(--ea-canvas) 70%, transparent) 100%)",
          }}
        />
        <div className="relative z-10 max-w-[560px] rounded-[10px] px-8 py-14 text-center">
          <h2 className="mkt-font-serif mb-7 text-[clamp(28px,3.8vw,42px)] text-[var(--ea-ink)]">
            Let&apos;s build your wedding, together.
          </h2>
          <Link
            href="/contact"
            className="inline-block rounded-[10px] bg-[var(--ea-accent)] px-[30px] py-[15px] text-[15px] font-semibold text-white"
          >
            Book a demo
          </Link>
        </div>
      </section>
    </>
  );
}
