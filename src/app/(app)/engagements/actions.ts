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

  redirect(`/engagements/${data.id}`);
}
