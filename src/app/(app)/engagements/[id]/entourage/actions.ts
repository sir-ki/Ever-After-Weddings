"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function assignEntourageRole(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const guestId = formData.get("guest_id") as string;
  const entourageRole = ((formData.get("entourage_role") as string) || "").trim() || null;
  const supabase = await createClient();

  await supabase.from("guests").update({ entourage_role: entourageRole }).eq("id", guestId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function addProcessionalEntry(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const supabase = await createClient();

  const { count } = await supabase
    .from("processional_entries")
    .select("id", { count: "exact", head: true })
    .eq("engagement_id", engagementId);

  await supabase.from("processional_entries").insert({
    engagement_id: engagementId,
    sort_order: count ?? 0,
    label: (formData.get("label") as string) || null,
    left_guest_id: (formData.get("left_guest_id") as string) || null,
    right_guest_id: (formData.get("right_guest_id") as string) || null,
    free_text: (formData.get("free_text") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath(`/engagements/${engagementId}`);
}

export async function updateProcessionalEntry(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase
    .from("processional_entries")
    .update({
      label: (formData.get("label") as string) || null,
      left_guest_id: (formData.get("left_guest_id") as string) || null,
      right_guest_id: (formData.get("right_guest_id") as string) || null,
      free_text: (formData.get("free_text") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function deleteProcessionalEntry(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("processional_entries").delete().eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function moveProcessionalEntry(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const direction = formData.get("direction") as "up" | "down";
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("processional_entries")
    .select("id, sort_order")
    .eq("engagement_id", engagementId)
    .order("sort_order", { ascending: true });

  if (!entries) return;

  const index = entries.findIndex((e) => e.id === id);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= entries.length) return;

  const current = entries[index];
  const neighbor = entries[neighborIndex];

  await supabase
    .from("processional_entries")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", current.id);
  await supabase
    .from("processional_entries")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id);

  revalidatePath(`/engagements/${engagementId}`);
}
