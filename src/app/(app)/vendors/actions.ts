"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    redirect("/");
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

  const rateFromRaw = formData.get("rate_from") as string;
  const rateToRaw = formData.get("rate_to") as string;

  await supabase
    .from("vendors")
    .update({
      business_name: formData.get("business_name") as string,
      category: formData.get("category") as string,
      description: (formData.get("description") as string) || null,
      rate_from: rateFromRaw ? Number(rateFromRaw) : null,
      rate_to: rateToRaw ? Number(rateToRaw) : null,
      rate_note: (formData.get("rate_note") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      ...(wasApproved ? { status: "pending" } : {}),
    })
    .eq("id", vendorId);

  revalidatePath("/vendors");
}
