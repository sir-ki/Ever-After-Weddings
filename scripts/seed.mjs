// Seeds fake engagements for local/dev testing, per the build plan's
// "two fake engagements from day one" rule — plus a third, ~300-guest
// engagement (launch-readiness spec Part 5) specifically to exercise the
// guest list, seating, and bulk QR export at a real mid-tier-wedding
// scale. The original two stay exactly as they were: this only adds.
// Usage: node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

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
  {
    display_name: "Carlos & Diana",
    partner_a_name: "Carlos Mendoza",
    partner_b_name: "Diana Torres",
    wedding_date: "2027-05-22",
    stage: "building",
    ceremony_venue: "Manila Cathedral",
    ceremony_address: "Cabildo St, Intramuros, Manila",
    ceremony_time: "14:00",
    reception_venue: "Shangri-La at the Fort Grand Ballroom",
    reception_address: "5th Ave, Bonifacio Global City, Taguig",
    reception_time: "18:00",
    expected_guest_count: 300,
    guest_cap: 280,
    notes:
      "Fake seed engagement for dev/testing — launch-readiness spec Part 5, deliberately seeded at ~300 guests (over its own 280 cap) to exercise the guest list, seating, and bulk QR export at real mid-tier-wedding scale.",
  },
];

const SCALE_ENGAGEMENT_NAME = "Carlos & Diana";
const GUEST_COUNT = 300;
const GROUP_COUNT = 15;
const TABLE_COUNT = 30;
const TABLE_CAPACITY = 10;

const FIRST_NAMES = [
  "Juan", "Maria", "Jose", "Ana", "Pedro", "Carmen", "Antonio", "Rosa",
  "Manuel", "Teresa", "Francisco", "Isabel", "Ramon", "Luz", "Roberto",
  "Cristina", "Eduardo", "Patricia", "Miguel", "Elena", "Rafael", "Grace",
  "Ricardo", "Josefina", "Fernando", "Corazon", "Alfredo", "Remedios",
  "Danilo", "Leonora",
];
const LAST_NAMES = [
  "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza",
  "Torres", "Villanueva", "Ramos", "Aquino", "Del Rosario", "Flores",
  "Rivera", "Gonzales", "Fernandez", "Castro", "Domingo", "Pascual",
  "Salazar",
];
const GROUP_NAMES = [
  "Groom's family", "Bride's family", "College friends", "Work — Manila office",
  "Work — Cebu office", "Church community", "Principal sponsors", "Neighbors",
  "Childhood friends", "Cousins (paternal)", "Cousins (maternal)",
  "Basketball league", "Book club", "Wedding entourage", "Family friends",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function generateGuest(i) {
  const fullName = `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i * 7 + 3)}`;
  const side = i % 3 === 0 ? "both" : i % 2 === 0 ? "bride" : "groom";
  const guestGroup = pick(GROUP_NAMES, Math.floor(i / (GUEST_COUNT / GROUP_COUNT)));
  // Realistic RSVP mix: ~45% accepted, ~10% declined, ~45% no reply.
  const roll = i % 20;
  const rsvpStatus = roll < 9 ? "accepted" : roll < 11 ? "declined" : "no_reply";
  return {
    full_name: fullName,
    side,
    guest_group: guestGroup,
    contact_phone: `0917 ${String(500 + i).padStart(3, "0")} ${String(1000 + i).slice(-4)}`,
    rsvp_status: rsvpStatus,
    rsvp_responded_at: rsvpStatus === "no_reply" ? null : new Date().toISOString(),
    invite_token: randomBytes(16).toString("base64url"),
  };
}

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

  if (data.display_name === SCALE_ENGAGEMENT_NAME) {
    const tables = Array.from({ length: TABLE_COUNT }, (_, i) => ({
      engagement_id: data.id,
      label: `Table ${i + 1}`,
      capacity: TABLE_CAPACITY,
      sort_order: i,
    }));
    const { error: tablesError } = await supabase.from("tables").insert(tables);
    if (tablesError) {
      console.error("Failed to seed tables for scale engagement:", tablesError.message);
      process.exit(1);
    }
    console.log(`  Seeded ${tables.length} tables.`);

    const guests = Array.from({ length: GUEST_COUNT }, (_, i) => ({
      engagement_id: data.id,
      ...generateGuest(i),
    }));
    const BATCH_SIZE = 100;
    for (let start = 0; start < guests.length; start += BATCH_SIZE) {
      const batch = guests.slice(start, start + BATCH_SIZE);
      const { error: guestsError } = await supabase.from("guests").insert(batch);
      if (guestsError) {
        console.error("Failed to seed guests for scale engagement:", guestsError.message);
        process.exit(1);
      }
    }
    console.log(`  Seeded ${guests.length} guests across ${GROUP_COUNT} groups.`);
  }
}
