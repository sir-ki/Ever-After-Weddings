// Milestone 3's explicit test: hit the guest token API directly over
// HTTP, not through the UI. Confirms guest A's token reveals nothing
// about guest B, no endpoint returns a full list, and writes are
// rejected once the RSVP deadline has passed.
//
// Requires the app running and reachable at BASE_URL (defaults to the
// local dev server — run `npm run dev` first).
// Usage: node --env-file=.env.local scripts/verify-guest-token-security.mjs
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (!condition) failed = true;
}

async function hit(path, init) {
  try {
    return await fetch(`${BASE_URL}${path}`, init);
  } catch (err) {
    console.error(
      `\nCould not reach ${BASE_URL}${path}. Is the app running there? (npm run dev)`,
    );
    console.error(err.message);
    process.exit(1);
  }
}

const { data: engagementA } = await admin
  .from("engagements")
  .insert({ display_name: "Token Test A", stage: "onboarding" })
  .select("id")
  .single();
const { data: engagementB } = await admin
  .from("engagements")
  .insert({
    display_name: "Token Test B (past deadline)",
    stage: "onboarding",
    rsvp_deadline: "2000-01-01",
  })
  .select("id")
  .single();

const { data: guestA } = await admin
  .from("guests")
  .insert({ engagement_id: engagementA.id, full_name: "Token Guest A", side: "both" })
  .select("id, invite_token")
  .single();
const { data: guestB } = await admin
  .from("guests")
  .insert({
    engagement_id: engagementA.id,
    full_name: "Token Guest B",
    side: "both",
    internal_notes: "SECRET internal note that must never leak",
  })
  .select("id, invite_token")
  .single();
const { data: guestC } = await admin
  .from("guests")
  .insert({ engagement_id: engagementB.id, full_name: "Token Guest C", side: "both" })
  .select("id, invite_token")
  .single();

try {
  const resA = await hit(`/api/g/${guestA.invite_token}`);
  const bodyA = await resA.json();
  check("guest A's token resolves with a 200", resA.status === 200);
  check(
    "guest A's token returns guest A's own name",
    bodyA.guest?.full_name === "Token Guest A",
  );
  check(
    "guest A's response contains no trace of guest B",
    !JSON.stringify(bodyA).includes("Token Guest B") &&
      !JSON.stringify(bodyA).includes(guestB.invite_token),
  );
  check(
    "response has no internal_notes field",
    !("internal_notes" in (bodyA.guest ?? {})),
  );
  check(
    "response is a single guest object, not a list",
    !Array.isArray(bodyA.guest) && !Array.isArray(bodyA),
  );

  const resTampered = await hit(`/api/g/${guestA.invite_token}-tampered`);
  check(
    "a tampered token is rejected (404), not silently accepted",
    resTampered.status === 404,
  );

  const resGarbage = await hit(`/api/g/not-a-real-token-at-all`);
  const bodyGarbage = await resGarbage.json();
  check("a garbage token returns 404", resGarbage.status === 404);
  check(
    "a garbage token's error response contains no guest data",
    !("guest" in bodyGarbage),
  );

  const resB = await hit(`/api/g/${guestB.invite_token}`);
  const bodyB = await resB.json();
  check(
    "guest B's own response also omits internal_notes",
    !("internal_notes" in (bodyB.guest ?? {})),
  );

  const resReadC = await hit(`/api/g/${guestC.invite_token}`);
  check("reads stay open after the deadline", resReadC.status === 200);

  const resWriteC = await hit(`/api/g/${guestC.invite_token}/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rsvp_status: "accepted" }),
  });
  check(
    "writes are rejected once the RSVP deadline has passed",
    resWriteC.status === 403,
  );

  const resWriteA = await hit(`/api/g/${guestA.invite_token}/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rsvp_status: "accepted",
      contact_phone: "0917 000 0000",
      guest_notes: "test note",
    }),
  });
  check("a normal RSVP write succeeds", resWriteA.status === 200);

  const { data: dbGuestA } = await admin
    .from("guests")
    .select("rsvp_status, contact_phone, guest_notes")
    .eq("id", guestA.id)
    .single();
  check(
    "the write lands directly on the guest row, no merge step",
    dbGuestA?.rsvp_status === "accepted" &&
      dbGuestA?.contact_phone === "0917 000 0000",
  );

  const resBadStatus = await hit(`/api/g/${guestA.invite_token}/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rsvp_status: "maybe" }),
  });
  check("an invalid rsvp_status is rejected", resBadStatus.status === 400);

  let sawRateLimited = false;
  for (let i = 0; i < 35; i++) {
    const res = await hit(`/api/g/${guestA.invite_token}`);
    if (res.status === 429) {
      sawRateLimited = true;
      break;
    }
  }
  check("a burst of requests eventually gets rate limited (429)", sawRateLimited);
} finally {
  await admin.from("guests").delete().in("id", [guestA.id, guestB.id, guestC.id]);
  await admin.from("engagements").delete().in("id", [engagementA.id, engagementB.id]);
}

if (failed) {
  console.error("\nGuest token security verification FAILED.");
  process.exit(1);
}
console.log("\nAll guest token security checks passed.");
