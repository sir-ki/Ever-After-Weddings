import type { Metadata } from "next";
import { CountUp } from "@/components/marketing/count-up";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Pricing — Ever After",
  description: "Three bands by guest count. Everything included at every band, stated plainly.",
};

const BANDS: [string, string, number][] = [
  ["Intimate", "up to 60", 20000],
  ["Standard", "61–150", 40000],
  ["Grand", "151–300", 65000],
];

const INCLUDED = [
  "Wedding website built by the team",
  "In-site invitations with QR cards",
  "RSVPs flowing into the guest list",
  "Table assignment and seating",
  "Day-of hub",
  "QR check-in at multiple checkpoints",
  "Day-of coordination on site",
  "Vendor directory access and printables",
];

const EXCLUDED = [
  "Suppliers' own fees (catering, photography, venue, florals)",
  "Full wedding planning, vendor sourcing and negotiation",
  "Styling and design",
  "Anything outside the wedding day itself",
];

export default function PricingPage() {
  return (
    <>
      <section className="bg-[var(--ea-blush)] px-5 pb-20 pt-[150px] text-center md:px-10">
        <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
          pricing
        </div>
        <h1 className="mkt-font-serif mb-5 text-[clamp(34px,5vw,56px)] text-[var(--ea-ink)]">
          Three bands, by guest count
        </h1>
        <p className="mx-auto max-w-[560px] text-lg text-[var(--ea-ink-secondary)]">
          Everything is included at every band. No add-ons, no surprise line items.
        </p>
      </section>

      <section className="bg-[var(--ea-canvas)] px-5 py-[100px] md:px-10">
        <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-6 sm:grid-cols-3">
          {BANDS.map(([name, guests, price], i) => (
            <Reveal
              key={name}
              delay={i * 70}
              className="rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-blush)] px-8 py-10 text-center"
            >
              <div className="mkt-font-serif mb-2 text-2xl text-[var(--ea-ink)]">{name}</div>
              <div className="mb-6 text-sm text-[var(--ea-ink-muted)]">{guests} guests</div>
              <div className="mkt-font-serif text-[40px] text-[var(--ea-ink)]">
                <CountUp target={price} prefix="₱" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1080px] grid-cols-1 gap-[60px] bg-[var(--ea-canvas)] px-5 pb-[120px] pt-20 md:grid-cols-2 md:px-10">
        <div>
          <h3 className="mkt-font-serif mb-[22px] text-[26px] text-[var(--ea-ink)]">
            Included in every band
          </h3>
          <div className="flex flex-col gap-3.5">
            {INCLUDED.map((item) => (
              <div key={item} className="flex items-baseline gap-3">
                <span className="text-sm text-[var(--ea-accent-ink)]">—</span>
                <span className="text-[15px] leading-[1.6] text-[var(--ea-ink-secondary)]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mkt-font-serif mb-[22px] text-[26px] text-[var(--ea-ink)]">
            Not included
          </h3>
          <div className="mb-10 flex flex-col gap-3.5">
            {EXCLUDED.map((item) => (
              <div key={item} className="flex items-baseline gap-3">
                <span className="text-sm text-[var(--ea-ink-muted)]">—</span>
                <span className="text-[15px] leading-[1.6] text-[var(--ea-ink-secondary)]">
                  {item}
                </span>
              </div>
            ))}
          </div>
          <h3 className="mkt-font-serif mb-4 text-[26px] text-[var(--ea-ink)]">Payment terms</h3>
          <p className="mb-2.5 text-[15px] leading-[1.7] text-[var(--ea-ink-secondary)]">
            50% on signing, 50% two weeks before the wedding.
          </p>
          <p className="text-[15px] leading-[1.7] text-[var(--ea-ink-secondary)]">
            Bank transfer or GCash, invoiced directly. No online payment on the site.
          </p>
        </div>
      </section>
    </>
  );
}
