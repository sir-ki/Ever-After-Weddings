"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTable(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const label = formData.get("label") as string;
  const capacity = Number(formData.get("capacity")) || 10;
  const supabase = await createClient();

  const { count } = await supabase
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("engagement_id", engagementId);

  await supabase.from("tables").insert({
    engagement_id: engagementId,
    label,
    capacity,
    sort_order: count ?? 0,
  });

  revalidatePath(`/engagements/${engagementId}`);
}

export async function updateTable(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const tableId = formData.get("table_id") as string;
  const label = formData.get("label") as string;
  const capacity = Number(formData.get("capacity")) || 1;
  const supabase = await createClient();

  await supabase.from("tables").update({ label, capacity }).eq("id", tableId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function confirmBulkAssign(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const assignmentsRaw = formData.get("assignments") as string;
  const assignments = JSON.parse(assignmentsRaw) as {
    guestId: string;
    tableId: string;
  }[];

  const supabase = await createClient();

  const byTable = new Map<string, string[]>();
  for (const { guestId, tableId } of assignments) {
    const list = byTable.get(tableId) ?? [];
    list.push(guestId);
    byTable.set(tableId, list);
  }

  for (const [tableId, guestIds] of byTable) {
    await supabase.from("guests").update({ table_id: tableId }).in("id", guestIds);
  }

  revalidatePath(`/engagements/${engagementId}`);
  redirect(`/engagements/${engagementId}?tab=tables`);
}

export async function deleteTable(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const tableId = formData.get("table_id") as string;
  const supabase = await createClient();

  // Guests seated here fall back to unassigned (guests.table_id
  // references tables ON DELETE SET NULL) rather than being deleted.
  await supabase.from("tables").delete().eq("id", tableId);

  revalidatePath(`/engagements/${engagementId}`);
}
