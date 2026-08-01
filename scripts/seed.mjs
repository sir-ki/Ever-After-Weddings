// Seeds two fake engagements for local/dev testing, per the build plan's
// "two fake engagements from day one" rule.
// Usage: node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const engagements = [
  {
    display_name: "Maria & Jon",
    partner_a_name: "Maria Santos",
    partner_b_name: "Jon Reyes",
    wedding_date: "2026-12-05",
    stage: "building",
    ceremony_venue: "San Agustin Church",
    ceremony_address: "General Luna St, Intramuros, Manila",
    ceremony_time: "15:00",
    reception_venue: "The Peninsula Manila",
    reception_address: "Ayala Ave, Makati",
    reception_time: "18:00",
    expected_guest_count: 120,
    guest_cap: 150,
    notes: "Fake seed engagement for dev/testing — Milestone 0.",
  },
  {
    display_name: "Erick & Erika",
    partner_a_name: "Erick Cruz",
    partner_b_name: "Erika Villanueva",
    wedding_date: "2027-02-14",
    stage: "onboarding",
    ceremony_venue: "Tagaytay Highlands Chapel",
    ceremony_address: "Tagaytay-Nasugbu Hwy, Tagaytay",
    ceremony_time: "14:00",
    reception_venue: "Leisure Farm Events Pavilion",
    reception_address: "Tagaytay",
    reception_time: "17:30",
    expected_guest_count: 80,
    guest_cap: 100,
    notes: "Fake seed engagement for dev/testing — Milestone 0.",
  },
];

for (const engagement of engagements) {
  const { data: existing } = await supabase
    .from("engagements")
    .select("id")
    .eq("display_name", engagement.display_name)
    .maybeSingle();

  if (existing) {
    console.log(`Skipping "${engagement.display_name}" — already exists.`);
    continue;
  }

  const { data, error } = await supabase
    .from("engagements")
    .insert(engagement)
    .select("id, display_name")
    .single();

  if (error) {
    console.error(`Failed to seed "${engagement.display_name}":`, error.message);
    process.exit(1);
  }

  console.log(`Seeded "${data.display_name}" (${data.id})`);
}
