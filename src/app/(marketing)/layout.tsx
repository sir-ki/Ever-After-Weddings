import type { Metadata } from "next";
import { newsreader, sora } from "@/lib/marketing-fonts";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Ever After — Everything you need for your wedding",
  description:
    "Ever After is a full-service wedding platform: your wedding website, invitations, RSVPs, seating, day-of coordination, and vendor directory, run for you.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // No overflow-x-hidden here: an ancestor with overflow != visible
    // becomes the scroll container position:sticky measures against,
    // which silently breaks the how-it-works sticky pane (its nearest
    // "scrolling" ancestor stops being the viewport). The one element
    // that actually overflows horizontally (the hero's decorative ring)
    // clips itself instead — see the home page hero section.
    <div className={`mkt-theme ${newsreader.variable} ${sora.variable} min-h-screen`}>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
