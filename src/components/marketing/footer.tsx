import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--ea-border)] bg-[var(--ea-champagne)] px-5 pb-10 pt-14 md:px-10">
      <div className="mx-auto mb-8 flex max-w-[1240px] flex-wrap items-center justify-between gap-8">
        <div className="mkt-font-serif text-xl text-[var(--ea-ink)]">Ever After</div>
        <nav className="flex flex-wrap gap-7">
          <Link href="/how-it-works" className="text-sm text-[var(--ea-ink-secondary)]">
            How it works
          </Link>
          <Link href="/pricing" className="text-sm text-[var(--ea-ink-secondary)]">
            Pricing
          </Link>
          <Link href="/vendors" className="text-sm text-[var(--ea-ink-secondary)]">
            Vendors
          </Link>
          <Link href="/contact" className="text-sm text-[var(--ea-ink-secondary)]">
            Contact
          </Link>
        </nav>
        <a href="tel:+639953024349" className="text-sm text-[var(--ea-ink-secondary)]">
          0995 302 4349
        </a>
      </div>
      <div className="mx-auto max-w-[1240px] text-[13px] text-[var(--ea-ink-muted)]">
        © 2026 Ever After. Manila, Philippines.
      </div>
    </footer>
  );
}
