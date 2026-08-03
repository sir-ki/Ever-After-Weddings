import { ptSerif, ptSans } from "@/lib/guest-fonts";
import { createClient } from "@/lib/supabase/server";
import { resolveAccentPreset } from "@/lib/site-themes";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: site } = await supabase
    .from("sites")
    .select("theme")
    .eq("slug", slug)
    .maybeSingle();

  const preset = resolveAccentPreset(site?.theme ?? null);
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
