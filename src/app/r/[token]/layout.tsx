import { ptSerif, ptSans } from "@/lib/guest-fonts";
import { getThemeByToken } from "@/lib/guest-token";

export default async function GuestLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preset = await getThemeByToken(token);
  const t = preset.tokens;

  return (
    <div
      className={`ea-theme ${ptSerif.variable} ${ptSans.variable} min-h-screen`}
      style={
        {
          "--ea-canvas": t.canvas,
          "--ea-blush": t.blush,
          "--ea-champagne": t.champagne,
          "--ea-border": t.border,
          "--ea-ink": t.ink,
          "--ea-ink-secondary": t.inkSecondary,
          "--ea-ink-muted": t.inkMuted,
          "--ea-accent": t.accent,
          "--ea-accent-ink": t.accentInk,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
