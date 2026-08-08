// Seeds checklist_templates from docs/ever-after-checklist-spec.md §5 —
// the starting checklist content, drawn from the phase-0 playbook and
// this platform's own Filipino-wedding requirements. Idempotent: skips
// any row that already exists by (title, category), same discipline
// seed.mjs already follows for engagements — only ever adds, safe to
// re-run after adding a new template row to this file.
// Usage: node --env-file=.env.local scripts/seed-checklist-template.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function items(category, rows) {
  return rows.map(([weeks_before, title, owner], i) => ({
    category,
    title,
    owner,
    weeks_before,
    sort_order: i,
    is_active: true,
  }));
}

const template = [
  ...items("church_civil", [
    [24, "Book church and confirm available dates", "couple"],
    [20, "Request CENOMAR from PSA", "couple"],
    [20, "Request PSA birth certificates, both partners", "couple"],
    [18, "Request baptismal and confirmation certificates", "couple"],
    [16, "Apply for marriage licence at LGU", "couple"],
    [14, "Schedule canonical interview", "couple"],
    [12, "Attend pre-marriage seminar / counselling", "couple"],
    [10, "Confirm marriage banns published", "couple"],
    [8, "Submit complete requirements to the parish", "couple"],
    [4, "Confirm officiant and church coordinator details", "shared"],
  ]),
  ...items("suppliers", [
    [32, "Book venue and confirm deposit", "couple"],
    [28, "Book caterer, confirm menu tasting", "couple"],
    [26, "Book photographer and videographer", "couple"],
    [24, "Book HMUA", "couple"],
    [20, "Book florist and stylist", "couple"],
    [20, "Book emcee, music or band", "couple"],
    [12, "Confirm all supplier contact details in the platform", "coordinator"],
    [6, "Confirm supplier call times against the run of show", "coordinator"],
    [4, "Settle remaining supplier balances", "couple"],
    [1, "Send call sheet to every supplier", "coordinator"],
  ]),
  ...items("attire", [
    [24, "Order or commission gown", "couple"],
    [20, "Order barong or suit", "couple"],
    [16, "Confirm entourage attire and colours", "couple"],
    [12, "First fitting", "couple"],
    [6, "Final fitting", "couple"],
    [2, "Collect all attire", "couple"],
    [1, "Prepare rings, coins, veil, cord, candles", "couple"],
  ]),
  ...items("couple_tasks", [
    [20, "Finalise entourage and ask principal sponsors", "couple"],
    [16, "Send story, photos and details for the website", "couple"],
    [12, "Write vows", "couple"],
    [10, "Choose ceremony and reception music", "couple"],
    [8, "Decide first-dance song", "couple"],
    [4, "Prepare speeches and acknowledgements", "couple"],
  ]),
  ...items("ever_after", [
    [22, "Intake call and written summary", "coordinator"],
    [18, "Build wedding site draft", "coordinator"],
    [16, "Site walkthrough with the couple", "coordinator"],
    [14, "Publish site, open RSVPs", "coordinator"],
    [8, "Configure day-of checkpoints", "coordinator"],
    [4, "Assign tables from final RSVPs", "shared"],
    [2, "Generate and send invitation cards", "coordinator"],
    [1, "Print attendee sheets, place cards, table numbers", "coordinator"],
    [1, "Brief checkpoint marshals", "coordinator"],
    [0, "Unlock day-of hub", "coordinator"],
  ]),
  ...items("guests", [
    [18, "Build guest list, both families", "couple"],
    [16, "Import guest list to the platform", "shared"],
    [14, "Set RSVP deadline", "couple"],
    [12, "Send invitations", "shared"],
    [6, "First RSVP reminder", "coordinator"],
    [5, "Final RSVP reminder", "coordinator"],
    [4, "Close guest list, confirm final headcount", "shared"],
    [4, "Send final headcount and dietary notes to caterer", "coordinator"],
  ]),
  ...items("final_week", [
    [1, "Ceremony rehearsal", "shared"],
    [1, "Test day-of hub on a phone at the venue", "coordinator"],
    [1, "Confirm transport and call times", "shared"],
    [0, "Final walkthrough with venue", "coordinator"],
  ]),
];

const { data: existing } = await supabase.from("checklist_templates").select("title, category");
const existingKeys = new Set((existing ?? []).map((r) => `${r.category}::${r.title}`));

const toInsert = template.filter((t) => !existingKeys.has(`${t.category}::${t.title}`));

if (!toInsert.length) {
  console.log("Nothing to add — template already seeded.");
} else {
  const { error } = await supabase.from("checklist_templates").insert(toInsert);
  if (error) {
    console.error("Insert failed:", error);
    process.exit(1);
  }
  console.log(`Added ${toInsert.length} template row(s).`);
}
