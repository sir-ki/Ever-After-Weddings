// Launch-readiness spec Part 5: confirms the guest-token rate limiter is
// genuinely per-IP, not a global counter — so ~300 guests on distinct real
// IPs opening their links the same evening won't trip each other's
// limiter, while a single IP hammering still does.
//
// This app's route/lib files are TS/TSX and can't be imported directly
// from a plain Node script (relative imports have no extension, which
// Node's ESM loader requires) — same reason earlier verification scripts
// duplicate small pieces of logic (e.g. extractToken) rather than import
// them. This duplicates src/lib/rate-limit.ts's checkRateLimit exactly
// (same table, same WINDOW_MS/MAX_REQUESTS_PER_WINDOW), run directly
// against the live Supabase project via the admin client.
//
// Usage: node --env-file=.env.local scripts/verify-rate-limit-scale.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const CLEANUP_AGE_MS = 60 * 60_000;

async function checkRateLimit(ip) {
  const now = Date.now();

  await admin
    .from("guest_token_requests")
    .delete()
    .lt("created_at", new Date(now - CLEANUP_AGE_MS).toISOString());

  const { count } = await admin
    .from("guest_token_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", new Date(now - WINDOW_MS).toISOString());

  await admin.from("guest_token_requests").insert({ ip });

  return (count ?? 0) < MAX_REQUESTS_PER_WINDOW;
}

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (!condition) failed = true;
}

const testRunTag = `scale-test-${Date.now()}`;

// Simulate ~300 distinct guests, each making one request — nobody should
// ever see a false trip since each IP has its own budget.
let anyDistinctIpBlocked = false;
for (let i = 0; i < 300; i++) {
  const ip = `${testRunTag}-${i}`; // synthetic, distinct per guest
  const allowed = await checkRateLimit(ip);
  if (!allowed) anyDistinctIpBlocked = true;
}
check(
  "300 distinct simulated guest IPs making one request each are never rate-limited",
  !anyDistinctIpBlocked,
);

// One IP hammering well past the 30/60s budget should still trip.
const hammerIp = `${testRunTag}-hammer`;
let sawBlocked = false;
for (let i = 0; i < 40; i++) {
  const allowed = await checkRateLimit(hammerIp);
  if (!allowed) {
    sawBlocked = true;
    break;
  }
}
check("a single IP making 40 rapid requests eventually gets rate-limited", sawBlocked);

// Clean up this run's fixture rows.
await admin.from("guest_token_requests").delete().like("ip", `${testRunTag}%`);

if (failed) {
  console.error("\nRate-limit scale verification FAILED.");
  process.exit(1);
}
console.log("\nAll rate-limit scale checks passed.");
