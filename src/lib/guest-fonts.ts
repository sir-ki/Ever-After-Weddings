import { PT_Serif, PT_Sans } from "next/font/google";

// The same pair already bundled as TTFs for the Part 3 invitation card
// (src/assets/fonts/) — loaded here as webfonts too, so the printed/sent
// card and the live guest-facing site share one typographic identity.
// Scoped to guest routes only via each route tree's own layout.tsx;
// never applied to src/app/(app)/* or the root layout.
export const ptSerif = PT_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-ea-serif",
});

// PT Sans only ships 400/700 on Google Fonts (no 500 cut) — the spec's
// "weight 500" for the table number is approximated with 700 (this
// font's only other weight) rather than a font-weight the browser can't
// actually render.
export const ptSans = PT_Sans({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-ea-sans",
});
