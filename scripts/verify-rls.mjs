// The one-question checklist from the build plan: "couple A cannot see
// couple B's data." Creates a throwaway couple user attached to one seed
// engagement, signs in as them, and confirms they see exactly that
// engagement (and its guests) and nothing else — including direct id
// lookups against the other engagement.
// Usage: node --env-file=.env.local scripts/verify-rls.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (!condition) failed = true;
}

const { data: mariaJon } = await admin
  .from("engagements")
  .select("id")
  .eq("display_name", "Maria & Jon")
  .single();
const { data: erickErika } = await admin
  .from("engagements")
  .select("id")
  .eq("display_name", "Erick & Erika")
  .single();

if (!mariaJon || !erickErika) {
  console.error("Seed engagements not found. Run `npm run seed` first.");
  process.exit(1);
}

const testEmail = `rls-test-${Date.now()}@example.com`;
const testPassword = "verify-rls-temp-password-1234";

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: testEmail,
  password: testPassword,
  email_confirm: true,
  user_metadata: { full_name: "RLS Test Couple", global_role: "couple" },
});

if (createError) {
  console.error("Failed to create test user:", createError.message);
  process.exit(1);
}

const testUserId = created.user.id;

await admin.from("engagement_members").insert({
  engagement_id: mariaJon.id,
  user_id: testUserId,
  role: "partner",
});

const { data: mariaJonGuest } = await admin
  .from("guests")
  .insert({
    engagement_id: mariaJon.id,
    full_name: "RLS Test Guest (Maria & Jon)",
    side: "both",
  })
  .select("id")
  .single();
const { data: erickErikaGuest } = await admin
  .from("guests")
  .insert({
    engagement_id: erickErika.id,
    full_name: "RLS Test Guest (Erick & Erika)",
    side: "both",
  })
  .select("id")
  .single();

try {
  const asCouple = createClient(url, anonKey);
  const { error: signInError } = await asCouple.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    console.error("Failed to sign in as test couple:", signInError.message);
    process.exit(1);
  }

  const { data: allVisible } = await asCouple.from("engagements").select("id");
  check(
    "couple sees exactly one engagement",
    allVisible?.length === 1 && allVisible[0].id === mariaJon.id,
  );

  const { data: ownFetch } = await asCouple
    .from("engagements")
    .select("id")
    .eq("id", mariaJon.id)
    .maybeSingle();
  check("couple can fetch their own engagement by id", ownFetch?.id === mariaJon.id);

  const { data: otherFetch } = await asCouple
    .from("engagements")
    .select("id")
    .eq("id", erickErika.id)
    .maybeSingle();
  check("couple cannot fetch the other engagement by id", otherFetch === null);

  await asCouple
    .from("engagements")
    .update({ notes: "should not be allowed" })
    .eq("id", mariaJon.id);
  const { data: afterWrite } = await admin
    .from("engagements")
    .select("notes")
    .eq("id", mariaJon.id)
    .single();
  check(
    "couple cannot write to engagements (Account-only per RLS)",
    afterWrite?.notes !== "should not be allowed",
  );

  const { data: visibleGuests } = await asCouple
    .from("guests")
    .select("id, engagement_id");
  const visibleGuestIds = new Set(visibleGuests?.map((g) => g.id));
  check(
    "couple's guest list contains only their own engagement's guests",
    visibleGuests?.every((g) => g.engagement_id === mariaJon.id) &&
      visibleGuestIds.has(mariaJonGuest.id) &&
      !visibleGuestIds.has(erickErikaGuest.id),
  );

  const { data: ownGuestFetch } = await asCouple
    .from("guests")
    .select("id")
    .eq("id", mariaJonGuest.id)
    .maybeSingle();
  check(
    "couple can fetch their own guest by id",
    ownGuestFetch?.id === mariaJonGuest.id,
  );

  const { data: otherGuestFetch } = await asCouple
    .from("guests")
    .select("id")
    .eq("id", erickErikaGuest.id)
    .maybeSingle();
  check(
    "couple cannot fetch the other engagement's guest by id",
    otherGuestFetch === null,
  );
} finally {
  await admin.from("guests").delete().eq("id", mariaJonGuest.id);
  await admin.from("guests").delete().eq("id", erickErikaGuest.id);
  await admin.from("engagement_members").delete().eq("user_id", testUserId);
  await admin.auth.admin.deleteUser(testUserId);
}

const secondAccountEmail = `rls-test-account-${Date.now()}@example.com`;
const secondAccountPassword = "verify-rls-temp-password-1234";

const { data: secondAccount, error: secondAccountError } =
  await admin.auth.admin.createUser({
    email: secondAccountEmail,
    password: secondAccountPassword,
    email_confirm: true,
    user_metadata: { full_name: "RLS Test Account", global_role: "account" },
  });

if (secondAccountError) {
  console.error("Failed to create second account user:", secondAccountError.message);
  process.exit(1);
}

try {
  const asSecondAccount = createClient(url, anonKey);
  const { error: signInError } = await asSecondAccount.auth.signInWithPassword({
    email: secondAccountEmail,
    password: secondAccountPassword,
  });

  if (signInError) {
    console.error("Failed to sign in as second account user:", signInError.message);
    process.exit(1);
  }

  const { data: allForAccount } = await asSecondAccount
    .from("engagements")
    .select("id");
  const ids = new Set(allForAccount?.map((e) => e.id));
  check(
    "a second Account user sees every engagement",
    ids.has(mariaJon.id) && ids.has(erickErika.id),
  );
} finally {
  await admin.auth.admin.deleteUser(secondAccount.user.id);
}

if (failed) {
  console.error("\nRLS verification FAILED.");
  process.exit(1);
}
console.log("\nAll RLS checks passed.");
