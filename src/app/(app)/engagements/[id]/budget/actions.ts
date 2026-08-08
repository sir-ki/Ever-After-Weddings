"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvalidRateError, parseOptionalRate } from "@/lib/parse-rate";

// Amounts go through parseOptionalRate (the helper the vendor forms
// already use) rather than a bare Number(): a typo'd figure has to be a
// visible error, never a silent null. Money is the one place in this app
// where quietly dropping a value is worst.
function parseAmounts(formData: FormData) {
  return {
    estimated_amount: parseOptionalRate(formData.get("estimated_amount"), "Estimated amount"),
    actual_amount: parseOptionalRate(formData.get("actual_amount"), "Actual amount"),
    paid_amount: parseOptionalRate(formData.get("paid_amount"), "Paid amount") ?? 0,
  };
}

export async function addBudgetItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const category = formData.get("category") as string;
  const label = (formData.get("label") as string).trim();
  if (!label) return;

  let amounts;
  try {
    amounts = parseAmounts(formData);
  } catch (e) {
    if (e instanceof InvalidRateError) {
      redirect(`/engagements/${engagementId}?tab=budget&error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("budget_items")
    .select("id", { count: "exact", head: true })
    .eq("engagement_id", engagementId)
    .eq("category", category);

  await supabase.from("budget_items").insert({
    engagement_id: engagementId,
    category,
    label,
    engagement_vendor_id: (formData.get("engagement_vendor_id") as string) || null,
    next_payment_due: (formData.get("next_payment_due") as string) || null,
    notes: (formData.get("notes") as string) || null,
    sort_order: count ?? 0,
    ...amounts,
  });

  revalidatePath(`/engagements/${engagementId}`);
  redirect(`/engagements/${engagementId}?tab=budget`);
}

export async function updateBudgetItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;

  let amounts;
  try {
    amounts = parseAmounts(formData);
  } catch (e) {
    if (e instanceof InvalidRateError) {
      redirect(`/engagements/${engagementId}?tab=budget&error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  const supabase = await createClient();

  await supabase
    .from("budget_items")
    .update({
      label: (formData.get("label") as string).trim(),
      engagement_vendor_id: (formData.get("engagement_vendor_id") as string) || null,
      next_payment_due: (formData.get("next_payment_due") as string) || null,
      notes: (formData.get("notes") as string) || null,
      updated_at: new Date().toISOString(),
      ...amounts,
    })
    .eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
  redirect(`/engagements/${engagementId}?tab=budget`);
}

export async function deleteBudgetItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("budget_items").delete().eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

// Marks a line item fully settled — paid_amount catches up to whatever
// it actually costs, and the next-payment date clears since there isn't
// one. Saves retyping a figure that's already on the row.
export async function settleBudgetItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("budget_items")
    .select("estimated_amount, actual_amount")
    .eq("id", id)
    .single();

  if (!item) return;

  const committed = item.actual_amount ?? item.estimated_amount;
  if (committed == null) return;

  await supabase
    .from("budget_items")
    .update({
      paid_amount: committed,
      next_payment_due: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

// Same swap-with-neighbour idiom as checklist_items / processional_entries.
export async function moveBudgetItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const category = formData.get("category") as string;
  const direction = formData.get("direction") as "up" | "down";
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("budget_items")
    .select("id, sort_order")
    .eq("engagement_id", engagementId)
    .eq("category", category)
    .order("sort_order", { ascending: true });

  if (!items) return;

  const index = items.findIndex((i) => i.id === id);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= items.length) return;

  const current = items[index];
  const neighbor = items[neighborIndex];

  await supabase.from("budget_items").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
  await supabase.from("budget_items").update({ sort_order: current.sort_order }).eq("id", neighbor.id);

  revalidatePath(`/engagements/${engagementId}`);
}
