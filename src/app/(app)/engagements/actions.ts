"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEngagement(formData: FormData) {
  const display_name = formData.get("display_name") as string;
  const partner_a_name = (formData.get("partner_a_name") as string) || null;
  const partner_b_name = (formData.get("partner_b_name") as string) || null;
  const wedding_date = (formData.get("wedding_date") as string) || null;
  const stage = formData.get("stage") as string;
  const assigned_to = (formData.get("assigned_to") as string) || null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("engagements")
    .insert({
      display_name,
      partner_a_name,
      partner_b_name,
      wedding_date,
      stage,
      assigned_to,
    })
    .select("id")
    .single();

  if (error) {
    redirect(
      `/engagements/new?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Seed the checklist from the active template — a copy, not a link, so
  // editing the template later never mutates a live engagement's list
  // (docs/ever-after-checklist-spec.md §2). Best-effort: a template read
  // failure shouldn't block engagement creation.
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("title, category, notes, owner, weeks_before, sort_order, link_target")
    .eq("is_active", true);

  if (template?.length) {
    await supabase.from("checklist_items").insert(
      template.map((t) => ({
        engagement_id: data.id,
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

  redirect(`/engagements/${data.id}`);
}
