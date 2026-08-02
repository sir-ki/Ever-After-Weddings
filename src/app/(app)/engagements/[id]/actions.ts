"use server";

import { revalidatePath } from "next/cache";
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
