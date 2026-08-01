"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function guestFields(formData: FormData) {
  return {
    full_name: formData.get("full_name") as string,
    side: formData.get("side") as string,
    guest_group: (formData.get("guest_group") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    guest_notes: (formData.get("guest_notes") as string) || null,
  };
}

export async function createGuest(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const supabase = await createClient();

  const { error } = await supabase.from("guests").insert({
    engagement_id: engagementId,
    ...guestFields(formData),
  });

  if (error) {
    redirect(
      `/engagements/${engagementId}/guests/new?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/engagements/${engagementId}?tab=guests`);
}

export async function updateGuest(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const guestId = formData.get("guest_id") as string;
  const rsvpStatus = formData.get("rsvp_status") as string;
  const tableId = (formData.get("table_id") as string) || null;
  const supabase = await createClient();

  const { error } = await supabase
    .from("guests")
    .update({
      ...guestFields(formData),
      rsvp_status: rsvpStatus,
      rsvp_responded_at:
        rsvpStatus === "no_reply" ? null : new Date().toISOString(),
      table_id: tableId,
    })
    .eq("id", guestId);

  if (error) {
    redirect(
      `/engagements/${engagementId}/guests/${guestId}/edit?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/engagements/${engagementId}?tab=guests`);
}

export async function assignGuestTable(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const guestId = formData.get("guest_id") as string;
  const tableId = (formData.get("table_id") as string) || null;
  const supabase = await createClient();

  await supabase.from("guests").update({ table_id: tableId }).eq("id", guestId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function archiveGuest(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const guestId = formData.get("guest_id") as string;
  const supabase = await createClient();

  await supabase
    .from("guests")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", guestId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function unarchiveGuest(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const guestId = formData.get("guest_id") as string;
  const supabase = await createClient();

  await supabase.from("guests").update({ archived_at: null }).eq("id", guestId);

  revalidatePath(`/engagements/${engagementId}`);
}

const VALID_SIDES = ["bride", "groom", "both"];

function parseGuestRows(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rows: {
    full_name: string;
    side: string;
    guest_group: string | null;
    contact_phone: string | null;
  }[] = [];
  const errors: string[] = [];

  let startIndex = 0;
  if (lines.length > 0) {
    const firstCell = lines[0]
      .split(/\t|,/)[0]
      .trim()
      .replace(/^"|"$/g, "")
      .toLowerCase();
    if (["name", "full_name", "guest name"].includes(firstCell)) {
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const delimiter = line.includes("\t") ? "\t" : ",";
    const cells = line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const [fullName, sideRaw, guestGroup, contactPhone] = cells;
    const lineNumber = i + 1;

    if (!fullName) {
      errors.push(`Line ${lineNumber}: missing name`);
      continue;
    }

    const side = (sideRaw || "").toLowerCase();
    if (!VALID_SIDES.includes(side)) {
      errors.push(
        `Line ${lineNumber}: side must be bride, groom, or both (got "${sideRaw || ""}")`,
      );
      continue;
    }

    rows.push({
      full_name: fullName,
      side,
      guest_group: guestGroup || null,
      contact_phone: contactPhone || null,
    });
  }

  return { rows, errors };
}

export async function bulkImportGuests(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const file = formData.get("file");
  const text =
    file instanceof File && file.size > 0
      ? await file.text()
      : (formData.get("paste") as string) || "";

  const { rows, errors } = parseGuestRows(text);

  if (errors.length > 0 || rows.length === 0) {
    const message =
      errors.length > 0
        ? errors.length > 10
          ? `${errors.slice(0, 10).join("; ")}; and ${errors.length - 10} more`
          : errors.join("; ")
        : "No guest rows found. Paste at least one line, or upload a CSV.";
    redirect(
      `/engagements/${engagementId}/guests/import?error=${encodeURIComponent(message)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("guests")
    .insert(rows.map((row) => ({ engagement_id: engagementId, ...row })));

  if (error) {
    redirect(
      `/engagements/${engagementId}/guests/import?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/engagements/${engagementId}?tab=guests`);
}
