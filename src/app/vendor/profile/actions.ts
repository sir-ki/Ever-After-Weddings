"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvalidRateError, parseOptionalRate } from "@/lib/parse-rate";

async function requireVendor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user.id)
    .single();
  if (profile?.global_role !== "vendor") {
    redirect("/dashboard");
  }
  return { supabase, userId: user.id };
}

// status is deliberately never in this update — the vendors_lock_self_
// approval trigger (migration 0019_vendor_login.sql) drops it to
// 'pending' on any non-Account write regardless of what's sent, so
// there's nothing to compute here. Same discipline the guest-token path
// and the public vendor signup insert already follow: never trust a
// client-writable field for anything access-control-relevant.
export async function updateOwnVendorProfile(formData: FormData) {
  const { supabase, userId } = await requireVendor();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (!vendor) {
    redirect(`/vendor/profile?error=${encodeURIComponent("No listing is linked to your account.")}`);
  }

  const business_name = (formData.get("business_name") as string)?.trim();
  if (!business_name) {
    redirect(`/vendor/profile?error=${encodeURIComponent("Business name is required.")}`);
  }

  let rateFrom: number | null;
  let rateTo: number | null;
  try {
    rateFrom = parseOptionalRate(formData.get("rate_from"), "Rate from");
    rateTo = parseOptionalRate(formData.get("rate_to"), "Rate to");
  } catch (e) {
    if (e instanceof InvalidRateError) {
      redirect(`/vendor/profile?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  await supabase
    .from("vendors")
    .update({
      business_name,
      category: formData.get("category") as string,
      description: (formData.get("description") as string) || null,
      rate_from: rateFrom,
      rate_to: rateTo,
      rate_note: (formData.get("rate_note") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
    })
    .eq("id", vendor.id);

  const photoUrls = ((formData.get("photo_urls") as string) || "")
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 12);

  // Replace-all, same simplicity as the directory/apply form this
  // mirrors — no per-photo edit UI, just a newline list that overwrites
  // what's there.
  await supabase.from("vendor_photos").delete().eq("vendor_id", vendor.id);
  if (photoUrls.length) {
    await supabase.from("vendor_photos").insert(
      photoUrls.map((photo_url, i) => ({
        vendor_id: vendor.id,
        photo_url,
        sort_order: i,
      })),
    );
  }

  revalidatePath("/vendor/profile");
  redirect("/vendor/profile?saved=1");
}
