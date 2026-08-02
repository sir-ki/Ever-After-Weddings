"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addEngagementVendor(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const vendorId = (formData.get("vendor_id") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const supabase = await createClient();

  if (vendorId) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("business_name, category, contact_phone, contact_email")
      .eq("id", vendorId)
      .single();

    await supabase.from("engagement_vendors").insert({
      engagement_id: engagementId,
      vendor_id: vendorId,
      business_name: vendor?.business_name ?? "",
      category: vendor?.category ?? "other",
      contact_phone: vendor?.contact_phone ?? null,
      contact_email: vendor?.contact_email ?? null,
      notes,
    });
  } else {
    const businessName = (formData.get("business_name") as string)?.trim();
    if (!businessName) {
      redirect(
        `/engagements/${engagementId}?tab=vendors&error=${encodeURIComponent("Business name is required for an off-platform supplier.")}`,
      );
    }

    await supabase.from("engagement_vendors").insert({
      engagement_id: engagementId,
      business_name: businessName,
      category: formData.get("category") as string,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      notes,
    });
  }

  revalidatePath(`/engagements/${engagementId}`);
  redirect(`/engagements/${engagementId}?tab=vendors`);
}

export async function toggleEngagementVendorCredit(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const creditOnSite = formData.get("credit_on_site") === "on";
  const supabase = await createClient();

  await supabase
    .from("engagement_vendors")
    .update({ credit_on_site: creditOnSite })
    .eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function deleteEngagementVendor(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("engagement_vendors").delete().eq("id", id);

  revalidatePath(`/engagements/${engagementId}`);
}
