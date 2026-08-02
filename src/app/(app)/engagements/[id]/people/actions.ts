"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createInvite(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const email = (formData.get("email") as string)?.trim();
  const role = formData.get("role") as string;
  const supabase = await createClient();

  if (!email || !["partner", "coordinator"].includes(role)) {
    redirect(
      `/engagements/${engagementId}?tab=people&error=${encodeURIComponent("A valid email and role are required.")}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insert is Account-only per RLS (engagement_invites_write_account) —
  // this check just gives a clean error message instead of a raw RLS
  // failure; RLS is still the real authorization boundary.
  const { error } = await supabase.from("engagement_invites").insert({
    engagement_id: engagementId,
    email,
    role,
    invited_by: user?.id,
  });

  if (error) {
    redirect(
      `/engagements/${engagementId}?tab=people&error=${encodeURIComponent("Could not create the invite. Only Account can invite members.")}`,
    );
  }

  revalidatePath(`/engagements/${engagementId}`);
  redirect(`/engagements/${engagementId}?tab=people`);
}

export async function revokeInvite(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase
    .from("engagement_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function removeMember(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("engagement_members").delete().eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}
