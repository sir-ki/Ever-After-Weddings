// Real per-couple theming: sites.theme (jsonb, default '{}') was an
// unwired stub through Parts 3/4/7 — every couple got the same
// hardcoded palette. This wires up the accent half of what
// docs/ever-after-template-spec.md §4 describes: "4-6 curated presets,
// no free colour picker." heading_font and corner_style (also named in
// §4) are deliberately not implemented yet — heading_font needs a
// second bundled TTF for print rendering (real sourcing risk not worth
// taking for this pass), corner_style would touch every rounded-corner
// class across five files for a cosmetic toggle. This type is shaped so
// both are additive later, not a rework.
//
// canvas/ink/ink-secondary/ink-muted/border stay identical across every
// preset — already AA-verified, and the spec's "muted accents" language
// implies the neutral base doesn't move. Only blush/champagne/accent/
// accent-ink vary. Every preset's accent-ink-on-canvas and
// white-on-accent ratios were computed with the real WCAG contrast
// formula (not eyeballed) and clear the default's own margin
// (accent-ink-on-canvas >= 6:1, white-on-accent >= 4.5:1).

export type AccentPreset = {
  key: string;
  label: string;
  tokens: {
    canvas: string;
    blush: string;
    champagne: string;
    border: string;
    ink: string;
    inkSecondary: string;
    inkMuted: string;
    accent: string;
    accentInk: string;
  };
};

const SHARED = {
  canvas: "#FDFAF7",
  border: "#E8DAD2",
  ink: "#3D2E2B",
  inkSecondary: "#6B5551",
  inkMuted: "#7E6663",
};

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    key: "blush",
    label: "Blush",
    tokens: { ...SHARED, blush: "#F9EFEA", champagne: "#F2E4DA", accent: "#A85D5B", accentInk: "#8E4A48" },
  },
  {
    key: "sage",
    label: "Sage",
    tokens: { ...SHARED, blush: "#EFF2EA", champagne: "#E6EBDD", accent: "#657758", accentInk: "#55654A" },
  },
  {
    key: "dusty_blue",
    label: "Dusty Blue",
    tokens: { ...SHARED, blush: "#EAF0F2", champagne: "#DDE7EA", accent: "#597686", accentInk: "#4A6270" },
  },
  {
    key: "amber",
    label: "Amber",
    tokens: { ...SHARED, blush: "#F7F0E4", champagne: "#F0E5D0", accent: "#8B6D3E", accentInk: "#775B2E" },
  },
];

const DEFAULT_PRESET = ACCENT_PRESETS[0];

export type SiteTheme = { accent?: string };

// Never throws on bad/missing jsonb — a site with no theme set (every
// site created before this feature) resolves to the same default
// preset it already rendered with, so this is a no-op for every
// existing engagement until a couple actually picks something.
export function resolveAccentPreset(theme: unknown): AccentPreset {
  const key = (theme as SiteTheme | null)?.accent;
  return ACCENT_PRESETS.find((p) => p.key === key) ?? DEFAULT_PRESET;
}
