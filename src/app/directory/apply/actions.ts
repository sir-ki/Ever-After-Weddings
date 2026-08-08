"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvalidRateError, parseOptionalRate } from "@/lib/parse-rate";

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

  let rateFrom: number | null;
  let rateTo: number | null;
  try {
    rateFrom = parseOptionalRate(formData.get("rate_from"), "Rate from");
    rateTo = parseOptionalRate(formData.get("rate_to"), "Rate to");
  } catch (e) {
    if (e instanceof InvalidRateError) {
      redirect(`/directory/apply?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  const contactEmail = (formData.get("contact_email") as string) || null;
  const password = (formData.get("password") as string) || "";

  const admin = createAdminClient();

  // Optional login, per docs/ever-after-auth-and-access.md §2's "Vendor
  // — self-registers". Creating the auth user BEFORE the vendors row, and
  // bailing out on failure before any vendors row exists, avoids a
  // listing that looks signed-up-with-a-password but has no working
  // login (e.g. a duplicate email). Promotion to global_role = 'vendor'
  // is a separate explicit update after the user exists — never trusted
  // signup metadata — the exact discipline migration 0007 established
  // and scripts/create-account-user.mjs already follows for 'account'.
  let ownerUserId: string | null = null;
  if (password) {
    if (!contactEmail) {
      redirect(
        `/directory/apply?error=${encodeURIComponent("Contact email is required to set a password.")}`,
      );
    }
    if (password.length < 6) {
      redirect(
        `/directory/apply?error=${encodeURIComponent("Password must be at least 6 characters.")}`,
      );
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: contactEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: business_name },
    });

    if (createError || !created?.user) {
      redirect(
        `/directory/apply?error=${encodeURIComponent(
          createError?.message ?? "Could not create your login. Please try again.",
        )}`,
      );
    }

    ownerUserId = created.user.id;
    await admin.from("users").update({ global_role: "vendor" }).eq("id", ownerUserId);
  }

  const { data: vendor, error } = await admin
    .from("vendors")
    .insert({
      business_name,
      category,
      description: (formData.get("description") as string) || null,
      rate_from: rateFrom,
      rate_to: rateTo,
      rate_note: (formData.get("rate_note") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: contactEmail,
      status: "pending",
      owner_user_id: ownerUserId,
    })
    .select("id")
    .single();

  if (error || !vendor) {
    if (ownerUserId) {
      await admin.auth.admin.deleteUser(ownerUserId);
    }
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

  redirect(`/directory/apply?submitted=1${ownerUserId ? "&withLogin=1" : ""}`);
}
