"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORIES = ["photo", "venue", "catering", "florals", "hmua", "cake", "music", "other"];

// Public, unauthenticated signup — no Supabase Auth account is created
// here at all. status is hardcoded to 'pending' and never taken from the
// form, the same way guest-token writes never trust a client-supplied
// field for anything access-control-relevant (see AGENTS.md / the M7
// security review this session). Uses the admin client narrowly for this
// one insert: an anonymous visitor has no session to satisfy
// vendors_write_account's is_account() check, same established pattern
// as guest RSVP writes in src/app/api/g/[token]/rsvp/route.ts.
export async function submitVendorApplication(formData: FormData) {
  const business_name = (formData.get("business_name") as string)?.trim();
  const category = formData.get("category") as string;

  if (!business_name || !CATEGORIES.includes(category)) {
    redirect(
      `/directory/apply?error=${encodeURIComponent("Business name and a valid category are required.")}`,
    );
  }

  const photoUrls = ((formData.get("photo_urls") as string) || "")
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 12);

  const rateFromRaw = formData.get("rate_from") as string;
  const rateToRaw = formData.get("rate_to") as string;

  const admin = createAdminClient();

  const { data: vendor, error } = await admin
    .from("vendors")
    .insert({
      business_name,
      category,
      description: (formData.get("description") as string) || null,
      rate_from: rateFromRaw ? Number(rateFromRaw) : null,
      rate_to: rateToRaw ? Number(rateToRaw) : null,
      rate_note: (formData.get("rate_note") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !vendor) {
    redirect(
      `/directory/apply?error=${encodeURIComponent("Something went wrong. Please try again.")}`,
    );
  }

  if (photoUrls.length) {
    await admin.from("vendor_photos").insert(
      photoUrls.map((photo_url, i) => ({
        vendor_id: vendor.id,
        photo_url,
        sort_order: i,
      })),
    );
  }

  redirect("/directory/apply?submitted=1");
}
