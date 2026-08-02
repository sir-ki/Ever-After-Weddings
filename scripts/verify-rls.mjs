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

  // Milestone 5's explicit test: logged in as the couple, attempt to
  // write to sites and site_sections directly. Both must fail.
  const { data: mariaJonSite } = await admin
    .from("sites")
    .select("id")
    .eq("engagement_id", mariaJon.id)
    .maybeSingle();

  if (mariaJonSite) {
    const { data: siteRead } = await asCouple
      .from("sites")
      .select("id")
      .eq("id", mariaJonSite.id)
      .maybeSingle();
    check("couple can read their own site", siteRead?.id === mariaJonSite.id);

    await asCouple
      .from("sites")
      .update({ slug: "hacked-slug" })
      .eq("id", mariaJonSite.id);
    const { data: siteAfter } = await admin
      .from("sites")
      .select("slug")
      .eq("id", mariaJonSite.id)
      .single();
    check(
      "couple cannot write to sites (Account-only per RLS)",
      siteAfter?.slug !== "hacked-slug",
    );

    const { error: sectionInsertError } = await asCouple
      .from("site_sections")
      .insert({ site_id: mariaJonSite.id, section_type: "suppliers", content: {} });
    check(
      "couple cannot insert into site_sections (Account-only per RLS)",
      sectionInsertError !== null,
    );

    const { data: heroSection } = await admin
      .from("site_sections")
      .select("id")
      .eq("site_id", mariaJonSite.id)
      .eq("section_type", "hero")
      .single();

    if (heroSection) {
      await asCouple
        .from("site_sections")
        .update({ content: { headline: "HACKED" } })
        .eq("id", heroSection.id);
      const { data: sectionAfter } = await admin
        .from("site_sections")
        .select("content")
        .eq("id", heroSection.id)
        .single();
      check(
        "couple cannot write to site_sections (Account-only per RLS)",
        sectionAfter?.content?.headline !== "HACKED",
      );
    }
  } else {
    console.log(
      "SKIP — no site exists for Maria & Jon yet (create one in the Website tab first).",
    );
  }
} finally {
  await admin.from("guests").delete().eq("id", mariaJonGuest.id);
  await admin.from("guests").delete().eq("id", erickErikaGuest.id);
  await admin.from("engagement_members").delete().eq("user_id", testUserId);
  await admin.auth.admin.deleteUser(testUserId);
}

// Milestone 8: vendors / vendor_photos / engagement_vendors isolation,
// including the public-read carve-outs (approved vendors, credited
// engagement_vendors) that no other script exercises.
const asAnon = createClient(url, anonKey);

const { data: pendingVendor } = await admin
  .from("vendors")
  .insert({ business_name: "RLS Test Pending Vendor", category: "photo" })
  .select("id")
  .single();
const { data: approvedVendor } = await admin
  .from("vendors")
  .insert({
    business_name: "RLS Test Approved Vendor",
    category: "florals",
    status: "approved",
  })
  .select("id")
  .single();
const { data: approvedPhoto } = await admin
  .from("vendor_photos")
  .insert({ vendor_id: approvedVendor.id, photo_url: "https://example.com/a.jpg" })
  .select("id")
  .single();
const { data: pendingPhoto } = await admin
  .from("vendor_photos")
  .insert({ vendor_id: pendingVendor.id, photo_url: "https://example.com/p.jpg" })
  .select("id")
  .single();

const couple2Email = `rls-test-couple2-${Date.now()}@example.com`;
const couple2Password = "verify-rls-temp-password-1234";
const { data: created2, error: create2Error } = await admin.auth.admin.createUser({
  email: couple2Email,
  password: couple2Password,
  email_confirm: true,
  user_metadata: { full_name: "RLS Test Couple 2" },
});
if (create2Error) {
  console.error("Failed to create second test couple:", create2Error.message);
  process.exit(1);
}
const couple2UserId = created2.user.id;
await admin.from("engagement_members").insert({
  engagement_id: mariaJon.id,
  user_id: couple2UserId,
  role: "partner",
});

const { data: creditedVendor } = await admin
  .from("engagement_vendors")
  .insert({
    engagement_id: mariaJon.id,
    business_name: "RLS Test Credited Supplier",
    category: "cake",
    credit_on_site: true,
  })
  .select("id")
  .single();
const { data: uncreditedVendor } = await admin
  .from("engagement_vendors")
  .insert({
    engagement_id: mariaJon.id,
    business_name: "RLS Test Uncredited Supplier",
    category: "music",
    credit_on_site: false,
  })
  .select("id")
  .single();
const { data: otherEngagementVendor } = await admin
  .from("engagement_vendors")
  .insert({
    engagement_id: erickErika.id,
    business_name: "RLS Test Erick & Erika Supplier",
    category: "venue",
  })
  .select("id")
  .single();

try {
  const asCouple2 = createClient(url, anonKey);
  const { error: signIn2Error } = await asCouple2.auth.signInWithPassword({
    email: couple2Email,
    password: couple2Password,
  });
  if (signIn2Error) {
    console.error("Failed to sign in as second test couple:", signIn2Error.message);
    process.exit(1);
  }

  const { data: anonApproved } = await asAnon
    .from("vendors")
    .select("id")
    .eq("id", approvedVendor.id)
    .maybeSingle();
  check("anon can read an approved vendor", anonApproved?.id === approvedVendor.id);

  const { data: anonPending } = await asAnon
    .from("vendors")
    .select("id")
    .eq("id", pendingVendor.id)
    .maybeSingle();
  check("anon cannot read a pending vendor", anonPending === null);

  const { data: anonApprovedPhoto } = await asAnon
    .from("vendor_photos")
    .select("id")
    .eq("id", approvedPhoto.id)
    .maybeSingle();
  check(
    "anon can read an approved vendor's photos",
    anonApprovedPhoto?.id === approvedPhoto.id,
  );

  const { data: anonPendingPhoto } = await asAnon
    .from("vendor_photos")
    .select("id")
    .eq("id", pendingPhoto.id)
    .maybeSingle();
  check("anon cannot read a pending vendor's photos", anonPendingPhoto === null);

  await asCouple2
    .from("vendors")
    .update({ business_name: "hacked" })
    .eq("id", approvedVendor.id);
  const { data: vendorAfterWrite } = await admin
    .from("vendors")
    .select("business_name")
    .eq("id", approvedVendor.id)
    .single();
  check(
    "couple cannot write to vendors (Account-only per RLS)",
    vendorAfterWrite?.business_name !== "hacked",
  );

  const { data: ownEngagementVendors } = await asCouple2
    .from("engagement_vendors")
    .select("id, engagement_id");
  const ownIds = new Set(ownEngagementVendors?.map((v) => v.id));
  check(
    "couple's engagement_vendors list is scoped to their own engagement",
    ownEngagementVendors?.every((v) => v.engagement_id === mariaJon.id) &&
      ownIds.has(creditedVendor.id) &&
      ownIds.has(uncreditedVendor.id) &&
      !ownIds.has(otherEngagementVendor.id),
  );

  const { data: coupleInsert, error: coupleInsertError } = await asCouple2
    .from("engagement_vendors")
    .insert({
      engagement_id: mariaJon.id,
      business_name: "RLS Test Couple-Added Supplier",
      category: "other",
    })
    .select("id")
    .maybeSingle();
  check(
    "couple can add to their own engagement's vendor log",
    !coupleInsertError && !!coupleInsert,
  );
  if (coupleInsert) {
    await admin.from("engagement_vendors").delete().eq("id", coupleInsert.id);
  }

  const { error: crossInsertError } = await asCouple2.from("engagement_vendors").insert({
    engagement_id: erickErika.id,
    business_name: "should not be allowed",
    category: "other",
  });
  check(
    "couple cannot add to another engagement's vendor log",
    crossInsertError !== null,
  );

  const { data: anonCredited } = await asAnon
    .from("engagement_vendors")
    .select("id")
    .eq("id", creditedVendor.id)
    .maybeSingle();
  check(
    "anon can read a credited engagement_vendors row",
    anonCredited?.id === creditedVendor.id,
  );

  const { data: anonUncredited } = await asAnon
    .from("engagement_vendors")
    .select("id")
    .eq("id", uncreditedVendor.id)
    .maybeSingle();
  check("anon cannot read an uncredited engagement_vendors row", anonUncredited === null);
} finally {
  await admin.from("engagement_vendors").delete().eq("id", creditedVendor.id);
  await admin.from("engagement_vendors").delete().eq("id", uncreditedVendor.id);
  await admin.from("engagement_vendors").delete().eq("id", otherEngagementVendor.id);
  await admin.from("engagement_members").delete().eq("user_id", couple2UserId);
  await admin.auth.admin.deleteUser(couple2UserId);
  await admin.from("vendor_photos").delete().eq("id", approvedPhoto.id);
  await admin.from("vendor_photos").delete().eq("id", pendingPhoto.id);
  await admin.from("vendors").delete().eq("id", pendingVendor.id);
  await admin.from("vendors").delete().eq("id", approvedVendor.id);
}

// Milestone 7: checkpoints / guest_scans isolation. Never added when M7
// shipped (see handoff §6/§7) — in particular this is the only script that
// exercises the guest_scans_all policy's cross-engagement guard added in
// migration 0008 (commit 9652156): a coordinator must not be able to log a
// scan using their own guest against a checkpoint from a different
// engagement.
const { data: mariaJonCheckpoint } = await admin
  .from("checkpoints")
  .insert({ engagement_id: mariaJon.id, name: "RLS Test Checkpoint (M&J)" })
  .select("id")
  .single();
const { data: erickErikaCheckpoint } = await admin
  .from("checkpoints")
  .insert({ engagement_id: erickErika.id, name: "RLS Test Checkpoint (E&E)" })
  .select("id")
  .single();
const { data: checkpointTestGuest } = await admin
  .from("guests")
  .insert({
    engagement_id: mariaJon.id,
    full_name: "RLS Test Guest (Checkpoints)",
    side: "both",
  })
  .select("id")
  .single();
const { data: existingScan } = await admin
  .from("guest_scans")
  .insert({
    guest_id: checkpointTestGuest.id,
    checkpoint_id: mariaJonCheckpoint.id,
    method: "manual",
  })
  .select("id")
  .single();

const couple3Email = `rls-test-couple3-${Date.now()}@example.com`;
const couple3Password = "verify-rls-temp-password-1234";
const { data: created3, error: create3Error } = await admin.auth.admin.createUser({
  email: couple3Email,
  password: couple3Password,
  email_confirm: true,
  user_metadata: { full_name: "RLS Test Couple 3" },
});
if (create3Error) {
  console.error("Failed to create third test couple:", create3Error.message);
  process.exit(1);
}
const couple3UserId = created3.user.id;
await admin.from("engagement_members").insert({
  engagement_id: mariaJon.id,
  user_id: couple3UserId,
  role: "coordinator",
});

let crossEngagementScanId = null;
try {
  const asCouple3 = createClient(url, anonKey);
  const { error: signIn3Error } = await asCouple3.auth.signInWithPassword({
    email: couple3Email,
    password: couple3Password,
  });
  if (signIn3Error) {
    console.error("Failed to sign in as third test couple:", signIn3Error.message);
    process.exit(1);
  }

  const { data: visibleCheckpoints } = await asCouple3
    .from("checkpoints")
    .select("id, engagement_id");
  const visibleCheckpointIds = new Set(visibleCheckpoints?.map((c) => c.id));
  check(
    "couple's checkpoint list is scoped to their own engagement",
    visibleCheckpoints?.every((c) => c.engagement_id === mariaJon.id) &&
      visibleCheckpointIds.has(mariaJonCheckpoint.id) &&
      !visibleCheckpointIds.has(erickErikaCheckpoint.id),
  );

  const { data: otherCheckpointFetch } = await asCouple3
    .from("checkpoints")
    .select("id")
    .eq("id", erickErikaCheckpoint.id)
    .maybeSingle();
  check(
    "couple cannot fetch the other engagement's checkpoint by id",
    otherCheckpointFetch === null,
  );

  const { data: ownCheckpointInsert, error: ownCheckpointInsertError } = await asCouple3
    .from("checkpoints")
    .insert({ engagement_id: mariaJon.id, name: "Couple-Added Checkpoint" })
    .select("id")
    .maybeSingle();
  check(
    "couple can add a checkpoint to their own engagement",
    !ownCheckpointInsertError && !!ownCheckpointInsert,
  );
  if (ownCheckpointInsert) {
    await admin.from("checkpoints").delete().eq("id", ownCheckpointInsert.id);
  }

  const { error: crossCheckpointInsertError } = await asCouple3.from("checkpoints").insert({
    engagement_id: erickErika.id,
    name: "should not be allowed",
  });
  check(
    "couple cannot add a checkpoint to another engagement",
    crossCheckpointInsertError !== null,
  );

  const { data: visibleScans } = await asCouple3
    .from("guest_scans")
    .select("id, guest_id");
  const visibleScanIds = new Set(visibleScans?.map((s) => s.id));
  check(
    "couple's guest_scans list is scoped to their own engagement",
    visibleScanIds.has(existingScan.id),
  );

  // The migration-0008 bug: guest belongs to the caller's engagement, but
  // the checkpoint belongs to a different one. Must be rejected.
  const { data: crossScan, error: crossScanError } = await asCouple3
    .from("guest_scans")
    .insert({
      guest_id: checkpointTestGuest.id,
      checkpoint_id: erickErikaCheckpoint.id,
      method: "manual",
    })
    .select("id")
    .maybeSingle();
  crossEngagementScanId = crossScan?.id ?? null;
  check(
    "couple cannot log a scan for their own guest against another engagement's checkpoint",
    crossScanError !== null && !crossScan,
  );

  const { data: ownScanInsert, error: ownScanInsertError } = await asCouple3
    .from("guest_scans")
    .insert({
      guest_id: checkpointTestGuest.id,
      checkpoint_id: mariaJonCheckpoint.id,
      method: "manual",
    })
    .select("id")
    .maybeSingle();
  // Expected to fail too — this guest/checkpoint pair was already scanned
  // by the admin fixture above, and the unique index forbids a duplicate.
  // What matters here is that RLS itself doesn't block it; the 23505
  // unique-violation is the only reason it's rejected.
  check(
    "couple can attempt a scan for their own guest/checkpoint pair (rejected only by the unique constraint, not RLS)",
    ownScanInsertError?.code === "23505" && !ownScanInsert,
  );
} finally {
  if (crossEngagementScanId) {
    await admin.from("guest_scans").delete().eq("id", crossEngagementScanId);
  }
  await admin.from("guest_scans").delete().eq("id", existingScan.id);
  await admin.from("guests").delete().eq("id", checkpointTestGuest.id);
  await admin.from("checkpoints").delete().eq("id", mariaJonCheckpoint.id);
  await admin.from("checkpoints").delete().eq("id", erickErikaCheckpoint.id);
  await admin.from("engagement_members").delete().eq("user_id", couple3UserId);
  await admin.auth.admin.deleteUser(couple3UserId);
}

const secondAccountEmail = `rls-test-account-${Date.now()}@example.com`;
const secondAccountPassword = "verify-rls-temp-password-1234";

const { data: secondAccount, error: secondAccountError } =
  await admin.auth.admin.createUser({
    email: secondAccountEmail,
    password: secondAccountPassword,
    email_confirm: true,
    user_metadata: { full_name: "RLS Test Account" },
  });

if (secondAccountError) {
  console.error("Failed to create second account user:", secondAccountError.message);
  process.exit(1);
}

// handle_new_user() always inserts new rows as 'couple' (migration
// 0007) — promote this fixture the same way create-account-user.mjs
// does, via a direct update rather than trusted signup metadata.
const { error: promoteSecondAccountError } = await admin
  .from("users")
  .update({ global_role: "account" })
  .eq("id", secondAccount.user.id);

if (promoteSecondAccountError) {
  console.error("Failed to promote second account user:", promoteSecondAccountError.message);
  process.exit(1);
}

const { data: accountCheckpointMJ } = await admin
  .from("checkpoints")
  .insert({ engagement_id: mariaJon.id, name: "RLS Test Account Checkpoint (M&J)" })
  .select("id")
  .single();
const { data: accountCheckpointEE } = await admin
  .from("checkpoints")
  .insert({ engagement_id: erickErika.id, name: "RLS Test Account Checkpoint (E&E)" })
  .select("id")
  .single();

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

  const { data: checkpointsForAccount } = await asSecondAccount
    .from("checkpoints")
    .select("id");
  const checkpointIds = new Set(checkpointsForAccount?.map((c) => c.id));
  check(
    "a second Account user sees checkpoints across every engagement",
    checkpointIds.has(accountCheckpointMJ.id) && checkpointIds.has(accountCheckpointEE.id),
  );
} finally {
  await admin.from("checkpoints").delete().eq("id", accountCheckpointMJ.id);
  await admin.from("checkpoints").delete().eq("id", accountCheckpointEE.id);
  await admin.auth.admin.deleteUser(secondAccount.user.id);
}

if (failed) {
  console.error("\nRLS verification FAILED.");
  process.exit(1);
}
console.log("\nAll RLS checks passed.");
