"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCheckpoint(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const name = formData.get("name") as string;
  const supabase = await createClient();

  const { count } = await supabase
    .from("checkpoints")
    .select("id", { count: "exact", head: true })
    .eq("engagement_id", engagementId);

  await supabase.from("checkpoints").insert({
    engagement_id: engagementId,
    name,
    sort_order: count ?? 0,
  });

  revalidatePath(`/engagements/${engagementId}`);
}

export async function updateCheckpoint(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const checkpointId = formData.get("checkpoint_id") as string;
  const name = formData.get("name") as string;
  const isActive = formData.get("is_active") === "on";
  const supabase = await createClient();

  await supabase
    .from("checkpoints")
    .update({ name, is_active: isActive })
    .eq("id", checkpointId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function deleteCheckpoint(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const checkpointId = formData.get("checkpoint_id") as string;
  const supabase = await createClient();

  // guest_scans.checkpoint_id references checkpoints ON DELETE CASCADE —
  // deleting a checkpoint deletes its scan history too. Acceptable here:
  // checkpoints get configured before the event, not reshuffled mid-scan.
  await supabase.from("checkpoints").delete().eq("id", checkpointId);

  revalidatePath(`/engagements/${engagementId}`);
}

type LogScanInput =
  | { engagementId: string; checkpointId: string; method: "qr"; scannedText: string }
  | { engagementId: string; checkpointId: string; method: "manual"; guestId: string };

export type LogScanResult =
  | { status: "success"; guestName: string; scannedAt: string }
  | { status: "already_scanned"; guestName: string; scannedAt: string }
  | { status: "error"; message: string };

// The QR encodes the guest's /r/[token] URL (auth doc §6), so it's the same
// credential as the guest hub link. Accept a full URL or a bare token.
function extractToken(scannedText: string): string | null {
  const trimmed = scannedText.trim();
  const match = trimmed.match(/\/r\/([^/?#]+)/);
  if (match) return match[1];
  return trimmed.length >= 16 ? trimmed : null;
}

// The highest-risk action in this milestone: scanning writes a real
// operational record (a guest is marked arrived / collected). Per
// docs/ever-after-auth-and-access.md §6, this must require an authenticated
// marshal session — the token identifies which guest, never who is
// scanning — and a token alone must never be able to log its own scan.
// This function is a server action reachable only from the authenticated
// (app) route group (gated by src/proxy.ts) and checks for a session itself
// as well, so there is no path to it without a logged-in staff account.
export async function logScan(input: LogScanInput): Promise<LogScanResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be signed in to log a scan." };
  }

  let guestId: string;
  if (input.method === "qr") {
    const token = extractToken(input.scannedText);
    if (!token) {
      return { status: "error", message: "That code isn't a guest QR code." };
    }
    // RLS-scoped lookup (not the admin client): a marshal without access to
    // the scanned guest's engagement gets nothing back here, same as any
    // other cross-engagement read in this app — no separate check needed.
    const { data: guest } = await supabase
      .from("guests")
      .select("id")
      .eq("invite_token", token)
      .maybeSingle();
    if (!guest) {
      return { status: "error", message: "Guest not found." };
    }
    guestId = guest.id;
  } else {
    guestId = input.guestId;
  }

  const { data: guestRow } = await supabase
    .from("guests")
    .select("full_name")
    .eq("id", guestId)
    .maybeSingle();

  if (!guestRow) {
    return { status: "error", message: "Guest not found." };
  }

  const { data: existing } = await supabase
    .from("guest_scans")
    .select("scanned_at")
    .eq("checkpoint_id", input.checkpointId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (existing) {
    return {
      status: "already_scanned",
      guestName: guestRow.full_name,
      scannedAt: existing.scanned_at,
    };
  }

  const { data: inserted, error } = await supabase
    .from("guest_scans")
    .insert({
      guest_id: guestId,
      checkpoint_id: input.checkpointId,
      scanned_by: user.id,
      method: input.method,
    })
    .select("scanned_at")
    .single();

  if (error) {
    // Unique index on (checkpoint_id, guest_id) can catch a genuinely
    // simultaneous duplicate that raced past the pre-check above — treat
    // that the same as "already scanned", not a hard failure.
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("guest_scans")
        .select("scanned_at")
        .eq("checkpoint_id", input.checkpointId)
        .eq("guest_id", guestId)
        .maybeSingle();
      return {
        status: "already_scanned",
        guestName: guestRow.full_name,
        scannedAt: raced?.scanned_at ?? new Date().toISOString(),
      };
    }
    return { status: "error", message: "Failed to log the scan. Please try again." };
  }

  revalidatePath(`/engagements/${input.engagementId}`);

  return {
    status: "success",
    guestName: guestRow.full_name,
    scannedAt: inserted.scanned_at,
  };
}
