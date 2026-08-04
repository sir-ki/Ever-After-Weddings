import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "For vendors — Ever After",
  description: "Free listing in the Ever After vendor directory. No commission, no exclusivity.",
};

const BENEFITS = [
  ["Free listing", "No fee to join the directory couples browse for every wedding on the platform."],
  ["No commission", "Whatever you agree with a couple is between you and them, in full."],
  ["No exclusivity", "List with us and everywhere else. Couples contact you directly, no middleman."],
];

export default function VendorsPage() {
  return (
    <>
      <section className="bg-[var(--ea-blush)] px-5 pb-20 pt-[150px] text-center md:px-10">
        <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
          for suppliers
        </div>
        <h1 className="mkt-font-serif mb-5 text-[clamp(34px,5vw,56px)] text-[var(--ea-ink)]">
          List your business, free
        </h1>
        <p className="mx-auto max-w-[560px] text-lg text-[var(--ea-ink-secondary)]">
          We put couples in front of trusted suppliers. No commission, no exclusivity — couples
          contact you directly.
        </p>
      </section>

      <section className="bg-[var(--ea-canvas)] px-5 py-[100px] md:px-10">
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-5 sm:grid-cols-3">
          {BENEFITS.map(([title, desc], i) => (
            <Reveal
              key={title}
              delay={i * 70}
              className="rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-blush)] p-8 text-center"
            >
              <div className="mx-auto mb-5 h-11 w-11 rounded-full border border-[var(--ea-border)]" />
              <h3 className="mkt-font-serif mb-2.5 text-xl text-[var(--ea-ink)]">{title}</h3>
              <p className="text-[15px] leading-[1.6] text-[var(--ea-ink-secondary)]">{desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="flex justify-center bg-[var(--ea-canvas)] px-5 pb-[140px] pt-[60px] md:px-10">
        <div className="max-w-[560px] rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-champagne)] px-10 py-12 text-center">
          <h3 className="mkt-font-serif mb-3.5 text-[26px] text-[var(--ea-ink)]">Get listed</h3>
          <p className="mb-7 text-[15px] leading-[1.7] text-[var(--ea-ink-secondary)]">
            Apply directly and we&apos;ll add your business to the directory couples browse for
            every wedding on the platform.
          </p>
          <Link
            href="/directory/apply"
            className="inline-block rounded-[10px] bg-[var(--ea-accent)] px-[26px] py-3.5 text-[15px] font-semibold text-white"
          >
            Apply to be listed
          </Link>
          <div className="mt-4">
            <Link href="/directory" className="text-sm text-[var(--ea-accent-ink)]">
              Browse the current directory →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
