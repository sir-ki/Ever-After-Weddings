"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function scheduleFields(formData: FormData) {
  return {
    start_time: (formData.get("start_time") as string) || null,
    title: formData.get("title") as string,
    location: (formData.get("location") as string) || null,
    owner: (formData.get("owner") as string) || null,
    notes: (formData.get("notes") as string) || null,
    is_guest_visible: formData.get("is_guest_visible") === "on",
  };
}

export async function createScheduleItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const supabase = await createClient();

  const { count } = await supabase
    .from("schedule_items")
    .select("id", { count: "exact", head: true })
    .eq("engagement_id", engagementId);

  await supabase.from("schedule_items").insert({
    engagement_id: engagementId,
    sort_order: count ?? 0,
    ...scheduleFields(formData),
  });

  redirect(`/engagements/${engagementId}?tab=day-of`);
}

export async function updateScheduleItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const itemId = formData.get("item_id") as string;
  const supabase = await createClient();

  await supabase
    .from("schedule_items")
    .update(scheduleFields(formData))
    .eq("id", itemId);

  redirect(`/engagements/${engagementId}?tab=day-of`);
}

export async function deleteScheduleItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const itemId = formData.get("item_id") as string;
  const supabase = await createClient();

  await supabase.from("schedule_items").delete().eq("id", itemId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function postAnnouncement(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const body = formData.get("body") as string;
  if (!body?.trim()) {
    revalidatePath(`/engagements/${engagementId}`);
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only one announcement is "the current one" at a time.
  await supabase
    .from("announcements")
    .update({ is_active: false })
    .eq("engagement_id", engagementId)
    .eq("is_active", true);

  await supabase.from("announcements").insert({
    engagement_id: engagementId,
    body,
    posted_by: user?.id ?? null,
    is_active: true,
  });

  revalidatePath(`/engagements/${engagementId}`);
}

export async function deactivateAnnouncement(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const announcementId = formData.get("announcement_id") as string;
  const supabase = await createClient();

  await supabase
    .from("announcements")
    .update({ is_active: false })
    .eq("id", announcementId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function unlockHub(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const supabase = await createClient();

  await supabase
    .from("sites")
    .update({ day_hub_unlocked_at: new Date().toISOString() })
    .eq("id", siteId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function lockHub(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const supabase = await createClient();

  await supabase.from("sites").update({ day_hub_unlocked_at: null }).eq("id", siteId);

  revalidatePath(`/engagements/${engagementId}`);
}
