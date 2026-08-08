"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Same gate as vendor-approvals: Account-only, RLS already enforces this
// (checklist_templates_write_account, migration 0016_checklist.sql) —
// this check is belt-and-suspenders so a couple gets redirected instead
// of a silent no-op write.
async function requireAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user!.id)
    .single();
  if (profile?.global_role !== "account") {
    redirect("/dashboard");
  }
  return { supabase };
}

export async function addTemplateItem(formData: FormData) {
  const category = formData.get("category") as string;
  const title = (formData.get("title") as string).trim();
  if (!title) return;

  const { supabase } = await requireAccount();

  const { count } = await supabase
    .from("checklist_templates")
    .select("id", { count: "exact", head: true })
    .eq("category", category);

  await supabase.from("checklist_templates").insert({
    title,
    category,
    owner: (formData.get("owner") as string) || "couple",
    weeks_before: formData.get("weeks_before") ? Number(formData.get("weeks_before")) : null,
    notes: (formData.get("notes") as string) || null,
    link_target: (formData.get("link_target") as string) || null,
    sort_order: count ?? 0,
  });

  revalidatePath("/checklist-template");
}

export async function updateTemplateItem(formData: FormData) {
  const id = formData.get("id") as string;
  const { supabase } = await requireAccount();

  await supabase
    .from("checklist_templates")
    .update({
      title: (formData.get("title") as string).trim(),
      owner: (formData.get("owner") as string) || "couple",
      weeks_before: formData.get("weeks_before") ? Number(formData.get("weeks_before")) : null,
      notes: (formData.get("notes") as string) || null,
      link_target: (formData.get("link_target") as string) || null,
    })
    .eq("id", id);

  revalidatePath("/checklist-template");
}

// Soft delete via is_active, not a hard delete — an item removed from
// the template shouldn't retroactively look like it never existed if
// someone's later trying to work out why an old engagement has it and
// a new one doesn't. New engagements only ever copy is_active rows
// (see (app)/engagements/actions.ts's createEngagement), so this is
// functionally identical to deletion for anything going forward.
export async function deactivateTemplateItem(formData: FormData) {
  const id = formData.get("id") as string;
  const { supabase } = await requireAccount();

  await supabase.from("checklist_templates").update({ is_active: false }).eq("id", id);

  revalidatePath("/checklist-template");
}

export async function reactivateTemplateItem(formData: FormData) {
  const id = formData.get("id") as string;
  const { supabase } = await requireAccount();

  await supabase.from("checklist_templates").update({ is_active: true }).eq("id", id);

  revalidatePath("/checklist-template");
}

// Same swap-with-neighbor idiom as checklist_items/processional_entries.
export async function moveTemplateItem(formData: FormData) {
  const id = formData.get("id") as string;
  const category = formData.get("category") as string;
  const direction = formData.get("direction") as "up" | "down";
  const { supabase } = await requireAccount();

  const { data: items } = await supabase
    .from("checklist_templates")
    .select("id, sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: true });

  if (!items) return;

  const index = items.findIndex((i) => i.id === id);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= items.length) return;

  const current = items[index];
  const neighbor = items[neighborIndex];

  await supabase.from("checklist_templates").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
  await supabase.from("checklist_templates").update({ sort_order: current.sort_order }).eq("id", neighbor.id);

  revalidatePath("/checklist-template");
}
