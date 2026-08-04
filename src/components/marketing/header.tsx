"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/vendors", label: "Vendors" },
  { href: "/contact", label: "Contact" },
];

// Transparent over the home hero, solid everywhere else / once scrolled.
// Sign in goes to the real /login (not a marketing dead-end) — the
// design reference wires it to Contact because that mockup has no real
// auth; the marketing plan (§7) is explicit that this should be the
// actual product login.
export function MarketingHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === "/";
  const solid = scrolled || !isHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 transition-[background-color,border-color] duration-300 md:px-10"
        style={{
          background: solid ? "var(--ea-canvas)" : "transparent",
          borderBottom: `1px solid ${solid ? "var(--ea-border)" : "transparent"}`,
        }}
      >
        <Link href="/" className="mkt-font-serif text-[23px] text-[var(--ea-ink)]">
          Ever After
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px]"
              style={{
                color: pathname === item.href ? "var(--ea-ink)" : "var(--ea-ink-secondary)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link href="/login" className="text-sm text-[var(--ea-ink-secondary)]">
            Sign in
          </Link>
          <Link
            href="/contact"
            className="hidden rounded-[10px] bg-[var(--ea-accent)] px-[22px] py-[11px] text-sm font-semibold text-white md:inline-block"
          >
            Book a demo
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="relative h-[18px] w-[26px] md:hidden"
          >
            <span
              className="absolute inset-x-0 h-0.5 bg-[var(--ea-ink)] transition-all duration-200"
              style={{ top: menuOpen ? 8 : 0, transform: menuOpen ? "rotate(45deg)" : "none" }}
            />
            <span
              className="absolute inset-x-0 top-2 h-0.5 bg-[var(--ea-ink)] transition-opacity duration-200"
              style={{ opacity: menuOpen ? 0 : 1 }}
            />
            <span
              className="absolute inset-x-0 h-0.5 bg-[var(--ea-ink)] transition-all duration-200"
              style={{ bottom: menuOpen ? 8 : 0, transform: menuOpen ? "rotate(-45deg)" : "none" }}
            />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 top-16 z-40 flex flex-col gap-5 border-b border-[var(--ea-border)] bg-[var(--ea-canvas)] px-6 py-6 md:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-[17px] text-[var(--ea-ink)]">
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="mt-2 rounded-[10px] bg-[var(--ea-accent)] px-5 py-3 text-center text-base font-semibold text-white"
          >
            Book a demo
          </Link>
        </div>
      )}
    </>
  );
}
