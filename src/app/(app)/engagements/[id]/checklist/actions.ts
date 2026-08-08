"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addChecklistItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const category = formData.get("category") as string;
  const title = (formData.get("title") as string).trim();
  if (!title) return;

  const supabase = await createClient();

  const { count } = await supabase
    .from("checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("engagement_id", engagementId)
    .eq("category", category);

  await supabase.from("checklist_items").insert({
    engagement_id: engagementId,
    title,
    category,
    owner: (formData.get("owner") as string) || "couple",
    weeks_before: formData.get("weeks_before") ? Number(formData.get("weeks_before")) : null,
    due_date: (formData.get("due_date") as string) || null,
    notes: (formData.get("notes") as string) || null,
    link_target: (formData.get("link_target") as string) || null,
    sort_order: count ?? 0,
  });

  revalidatePath(`/engagements/${engagementId}`);
}

export async function updateChecklistItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase
    .from("checklist_items")
    .update({
      title: (formData.get("title") as string).trim(),
      owner: (formData.get("owner") as string) || "couple",
      weeks_before: formData.get("weeks_before") ? Number(formData.get("weeks_before")) : null,
      due_date: (formData.get("due_date") as string) || null,
      notes: (formData.get("notes") as string) || null,
      link_target: (formData.get("link_target") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function toggleChecklistItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const completed = formData.get("completed") === "true";
  const supabase = await createClient();

  if (completed) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("checklist_items")
      .update({ completed_at: new Date().toISOString(), completed_by: user?.id ?? null })
      .eq("id", id);
  } else {
    await supabase
      .from("checklist_items")
      .update({ completed_at: null, completed_by: null })
      .eq("id", id);
  }

  revalidatePath(`/engagements/${engagementId}`);
}

export async function deleteChecklistItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("checklist_items").delete().eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

// Swaps sort_order with the adjacent item in the same category — same
// idiom as entourage's moveProcessionalEntry.
export async function moveChecklistItem(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const category = formData.get("category") as string;
  const direction = formData.get("direction") as "up" | "down";
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("checklist_items")
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

  await supabase.from("checklist_items").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
  await supabase.from("checklist_items").update({ sort_order: current.sort_order }).eq("id", neighbor.id);

  revalidatePath(`/engagements/${engagementId}`);
}

// Adds whatever active template rows the engagement doesn't already have
// (matched by title — a couple who deleted an item they don't want isn't
// forced to re-see it just because they used this on a different category).
export async function addChecklistItemsFromTemplate(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const supabase = await createClient();

  const [{ data: template }, { data: existing }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("title, category, notes, owner, weeks_before, sort_order, link_target")
      .eq("is_active", true),
    supabase.from("checklist_items").select("title").eq("engagement_id", engagementId),
  ]);

  const existingTitles = new Set((existing ?? []).map((i) => i.title));
  const toAdd = (template ?? []).filter((t) => !existingTitles.has(t.title));

  if (toAdd.length) {
    await supabase.from("checklist_items").insert(
      toAdd.map((t) => ({
        engagement_id: engagementId,
        title: t.title,
        category: t.category,
        notes: t.notes,
        owner: t.owner,
        weeks_before: t.weeks_before,
        link_target: t.link_target,
        sort_order: t.sort_order,
      })),
    );
  }

  revalidatePath(`/engagements/${engagementId}`);
}

// The spec calls for a "shift all dates" bulk action for when the
// wedding date moves. There's nothing to bulk-write: resolveDueDate()
// (src/lib/checklist.ts) computes every weeks_before-based item's due
// date live from engagements.wedding_date at render time, and items
// with an explicit due_date override are never touched by that
// computation — "moving the date shifts every computed date, overrides
// hold" falls out for free. The only real gap was that wedding_date had
// no edit UI anywhere in the app; this is that UI, surfaced here since
// it's what actually drives the checklist's dates.
export async function updateWeddingDate(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const weddingDate = (formData.get("wedding_date") as string) || null;
  const supabase = await createClient();

  await supabase.from("engagements").update({ wedding_date: weddingDate }).eq("id", engagementId);

  revalidatePath(`/engagements/${engagementId}`);
}
