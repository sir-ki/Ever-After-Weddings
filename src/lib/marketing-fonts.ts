import { Newsreader, Sora } from "next/font/google";

// Marketing site only (src/app/(marketing)/*) — deliberately different
// pair from the guest-facing PT Serif/PT Sans (src/lib/guest-fonts.ts).
// Newsreader/Sora are what the design reference
// (design_handoff_ever_after/Ever After.dc.html) specifies for the public
// marketing pages; the two identities aren't meant to match exactly since
// this is the "front door" before a visitor ever reaches the product.
export const newsreader = Newsreader({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-mkt-serif",
});

export const sora = Sora({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mkt-sans",
});
