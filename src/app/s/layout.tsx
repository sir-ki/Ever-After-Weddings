import { ptSerif, ptSans } from "@/lib/guest-fonts";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ea-theme ${ptSerif.variable} ${ptSans.variable} min-h-screen`}>
      {children}
    </div>
  );
}
