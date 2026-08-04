"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvalidRateError, parseOptionalRate } from "@/lib/parse-rate";

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
  return { supabase, userId: user!.id };
}

export async function approveVendor(formData: FormData) {
  const vendorId = formData.get("vendor_id") as string;
  const { supabase, userId } = await requireAccount();

  await supabase
    .from("vendors")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
}

export async function rejectVendor(formData: FormData) {
  const vendorId = formData.get("vendor_id") as string;
  const reviewNote = (formData.get("review_note") as string) || null;
  const { supabase, userId } = await requireAccount();

  await supabase
    .from("vendors")
    .update({
      status: "rejected",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
}

export async function sendBackVendor(formData: FormData) {
  const vendorId = formData.get("vendor_id") as string;
  const reviewNote = (formData.get("review_note") as string) || null;
  const { supabase, userId } = await requireAccount();

  await supabase
    .from("vendors")
    .update({
      status: "pending",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
}

// Editing any field on a vendor's row. Per the design spec, saving an
// edit to an already-approved vendor drops it back to 'pending' — an
// edit is never silently live on an approved listing.
export async function updateVendor(formData: FormData) {
  const vendorId = formData.get("vendor_id") as string;
  const wasApproved = formData.get("was_approved") === "on";
  const { supabase } = await requireAccount();

  let rateFrom: number | null;
  let rateTo: number | null;
  try {
    rateFrom = parseOptionalRate(formData.get("rate_from"), "Rate from");
    rateTo = parseOptionalRate(formData.get("rate_to"), "Rate to");
  } catch (e) {
    if (e instanceof InvalidRateError) {
      redirect(`/vendors?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  await supabase
    .from("vendors")
    .update({
      business_name: formData.get("business_name") as string,
      category: formData.get("category") as string,
      description: (formData.get("description") as string) || null,
      rate_from: rateFrom,
      rate_to: rateTo,
      rate_note: (formData.get("rate_note") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      ...(wasApproved ? { status: "pending" } : {}),
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
  redirect("/vendors");
}
