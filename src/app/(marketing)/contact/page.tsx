import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Ever After",
  description: "Reach Ever After directly — no form, just a phone number and Facebook.",
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-[var(--ea-blush)] px-5 pb-[100px] pt-[150px] text-center md:px-10">
        <div className="mb-[18px] text-[13px] tracking-[1.5px] text-[var(--ea-accent-ink)] lowercase">
          get in touch
        </div>
        <h1 className="mkt-font-serif text-[clamp(34px,5vw,56px)] text-[var(--ea-ink)]">
          Let&apos;s talk about your wedding
        </h1>
      </section>

      <section className="flex justify-center bg-[var(--ea-canvas)] px-5 pb-[150px] md:px-10">
        <div className="-mt-14 w-full max-w-[520px] rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-canvas)] px-11 py-12">
          <div className="mkt-font-serif mb-1.5 text-2xl text-[var(--ea-ink)]">Kean James Brul</div>
          <div className="mb-7 text-sm text-[var(--ea-ink-muted)]">Ever After</div>

          <div className="mb-8 flex flex-col gap-4">
            <a
              href="tel:+639953024349"
              className="flex items-center gap-3.5 rounded-[10px] border border-[var(--ea-border)] px-4 py-3.5 text-[var(--ea-ink)]"
            >
              <span className="h-9 w-9 flex-shrink-0 rounded-full bg-[var(--ea-champagne)]" />
              <span className="text-base">0995 302 4349</span>
            </a>
            <a
              href="https://www.facebook.com/search/top?q=Kean%20James%20Brul"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 rounded-[10px] border border-[var(--ea-border)] px-4 py-3.5 text-[var(--ea-ink)]"
            >
              <span className="h-9 w-9 flex-shrink-0 rounded-full bg-[var(--ea-champagne)]" />
              <span className="text-base">Message on Facebook</span>
            </a>
          </div>

          <div className="border-t border-[var(--ea-border)] pt-6">
            <div className="mb-3 text-[13px] tracking-wide text-[var(--ea-accent-ink)]">
              when you reach out, send us
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-[var(--ea-ink-secondary)]">— your wedding date</div>
              <div className="text-sm text-[var(--ea-ink-secondary)]">— rough guest count</div>
              <div className="text-sm text-[var(--ea-ink-secondary)]">— your venue, if booked</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
