// Suggested entourage roles, offered as a picker with a free-text
// fallback — docs/ever-after-launch-readiness-spec.md Part 6 deliberately
// keeps guests.entourage_role unconstrained (no check constraint) since
// Filipino weddings vary and some add roles this list hasn't anticipated.
export const ENTOURAGE_ROLES = [
  { value: "principal_sponsor", label: "Principal sponsor" },
  { value: "secondary_sponsor_candle", label: "Secondary sponsor — candle" },
  { value: "secondary_sponsor_veil", label: "Secondary sponsor — veil" },
  { value: "secondary_sponsor_cord", label: "Secondary sponsor — cord" },
  { value: "best_man", label: "Best man" },
  { value: "maid_of_honour", label: "Maid of honour" },
  { value: "matron_of_honour", label: "Matron of honour" },
  { value: "groomsman", label: "Groomsman" },
  { value: "bridesmaid", label: "Bridesmaid" },
  { value: "ring_bearer", label: "Ring bearer" },
  { value: "coin_bearer", label: "Coin bearer" },
  { value: "bible_bearer", label: "Bible bearer" },
  { value: "flower_girl", label: "Flower girl" },
  { value: "banner_bearer", label: "Banner bearer" },
  { value: "usher", label: "Usher" },
] as const;

export function entourageRoleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ENTOURAGE_ROLES.find((r) => r.value === role)?.label ?? role;
}
