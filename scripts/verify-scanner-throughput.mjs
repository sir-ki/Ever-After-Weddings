// Launch-readiness spec Part 5: "300 arrivals through one or two
// checkpoints is a queue... worth revisiting whether a local queue is now
// warranted." This runs logScan's exact query sequence (checkpoint/guest
// lookup, existing-scan check, insert) against the real seeded ~300-guest
// engagement, timing 300 sequential arrivals — the closest available
// proxy to a physical scan session in an environment with no camera.
//
// Usage: node --env-file=.env.local scripts/verify-scanner-throughput.mjs
import { createClient } from "@supabase/supabase-js";

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

const { data: engagement } = await admin
  .from("engagements")
  .select("id")
  .eq("display_name", "Carlos & Diana")
  .maybeSingle();

if (!engagement) {
  console.error('Seed engagement "Carlos & Diana" not found. Run `npm run seed` first.');
  process.exit(1);
}

const { data: guests } = await admin
  .from("guests")
  .select("id")
  .eq("engagement_id", engagement.id)
  .is("archived_at", null);

if (!guests || guests.length < 100) {
  console.error("Expected the ~300-guest scale engagement to have guests seeded.");
  process.exit(1);
}

const { data: checkpoint, error: checkpointError } = await admin
  .from("checkpoints")
  .insert({ engagement_id: engagement.id, name: "Throughput Test Checkpoint" })
  .select("id")
  .single();

if (checkpointError) {
  console.error("Failed to create test checkpoint:", checkpointError.message);
  process.exit(1);
}

// Mirrors checkpoints/actions.ts's logScan: check for an existing scan
// first (pre-check), then insert, treating a 23505 race as "already
// scanned" rather than a hard failure.
async function simulateScan(guestId) {
  const { data: existing } = await admin
    .from("guest_scans")
    .select("scanned_at")
    .eq("checkpoint_id", checkpoint.id)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (existing) return "already_scanned";

  const { error } = await admin
    .from("guest_scans")
    .insert({ guest_id: guestId, checkpoint_id: checkpoint.id, method: "manual" });

  if (error && error.code !== "23505") throw error;
  return "success";
}

const sampleSize = Math.min(300, guests.length);
const start = Date.now();
let errors = 0;

for (let i = 0; i < sampleSize; i++) {
  try {
    await simulateScan(guests[i].id);
  } catch (e) {
    errors++;
    console.error(`Scan ${i} failed:`, e.message);
  }
}

const elapsedMs = Date.now() - start;
const perScanMs = elapsedMs / sampleSize;

console.log(
  `\n${sampleSize} sequential arrivals in ${(elapsedMs / 1000).toFixed(1)}s (${perScanMs.toFixed(0)}ms/scan average).`,
);

check(`all ${sampleSize} simulated scans completed with no errors`, errors === 0);
check(
  "average per-scan time stays well under 1s (no meaningful degradation at this scale)",
  perScanMs < 1000,
);

await admin.from("checkpoints").delete().eq("id", checkpoint.id);

if (failed) {
  console.error("\nScanner throughput verification FAILED.");
  process.exit(1);
}
console.log("\nAll scanner throughput checks passed.");
