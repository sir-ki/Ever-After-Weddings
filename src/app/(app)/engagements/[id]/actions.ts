"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Launch-readiness spec Part 5: guest_cap becomes editable. RLS already
// makes `engagements` writes Account-only (confirmed by verify-rls.mjs's
// "couple cannot write to engagements" check) — no separate role check
// needed here, same reliance on RLS every other action in this app has.
// Advisory only: nothing reads this value to block anything, it's purely
// informational for the guest-list warning banner.
export async function updateGuestCap(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const guestCap = Number(formData.get("guest_cap"));
  const supabase = await createClient();

  if (Number.isFinite(guestCap) && guestCap > 0) {
    await supabase
      .from("engagements")
      .update({ guest_cap: Math.floor(guestCap) })
      .eq("id", engagementId);
  }

  revalidatePath(`/engagements/${engagementId}`);
}

// docs/ever-after-checklist-spec.md appendix. Same Account-only RLS
// reliance as updateGuestCap above. Empty fields clear to null rather
// than being skipped, so removing a stale link actually removes it.
export async function updateLivestream(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const url = (formData.get("livestream_url") as string).trim();
  const startsAt = formData.get("livestream_starts_at") as string;
  const note = (formData.get("livestream_note") as string).trim();
  const supabase = await createClient();

  if (url && !/^https:\/\//.test(url)) {
    redirect(
      `/engagements/${engagementId}?error=${encodeURIComponent(
        "Livestream link must start with https://",
      )}`,
    );
  }

  await supabase
    .from("engagements")
    .update({
      livestream_url: url || null,
      livestream_starts_at: startsAt || null,
      livestream_note: note || null,
    })
    .eq("id", engagementId);

  revalidatePath(`/engagements/${engagementId}`);
  redirect(`/engagements/${engagementId}`);
}
