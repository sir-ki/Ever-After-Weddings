export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilenameSegment, contentDisposition } from "@/lib/print-theme";
import { toCsv } from "@/lib/csv";

const SIDE_LABELS: Record<string, string> = { bride: "Bride", groom: "Groom", both: "Both" };
const RSVP_LABELS: Record<string, string> = {
  no_reply: "No reply",
  accepted: "Accepted",
  declined: "Declined",
};

// Deliberately excludes internal_notes — that's Account's own private
// notes about a guest, never exposed outside Account context anywhere
// else in this codebase, and a couple-readable export is not the place
// to start.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: engagement } = await supabase
    .from("engagements")
    .select("display_name")
    .eq("id", id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: guests }, { data: tables }] = await Promise.all([
    supabase
      .from("guests")
      .select(
        "full_name, side, guest_group, contact_phone, rsvp_status, table_id, entourage_role, guest_notes",
      )
      .eq("engagement_id", id)
      .is("archived_at", null)
      .order("full_name"),
    supabase.from("tables").select("id, label").eq("engagement_id", id),
  ]);

  const tableLabel = new Map((tables ?? []).map((t) => [t.id, t.label]));

  const rows = (guests ?? []).map((g) => [
    g.full_name,
    SIDE_LABELS[g.side] ?? g.side,
    g.guest_group || "",
    g.contact_phone || "",
    RSVP_LABELS[g.rsvp_status] ?? g.rsvp_status,
    g.table_id ? tableLabel.get(g.table_id) || "" : "",
    g.entourage_role || "",
    g.guest_notes || "",
  ]);

  const csv = toCsv(
    ["Name", "Side", "Group", "Contact", "RSVP", "Table", "Entourage role", "Notes"],
    rows,
  );
  const filename = `${sanitizeFilenameSegment(engagement.display_name)} guest list.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
