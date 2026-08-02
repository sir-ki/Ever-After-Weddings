export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilenameSegment, contentDisposition } from "@/lib/print-theme";
import { toCsv } from "@/lib/csv";

// Catering is billed per head and usually 40-50% of the whole budget —
// this export matters more than any other. One row per accepted guest,
// deliberately no separate summary line: the row count *is* the final
// accepted count, so it can't drift from what's actually in the export.
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

  const { data: guests } = await supabase
    .from("guests")
    .select("full_name, guest_group, meal_choice, guest_notes")
    .eq("engagement_id", id)
    .eq("rsvp_status", "accepted")
    .is("archived_at", null)
    .order("full_name");

  const rows = (guests ?? []).map((g) => [
    g.full_name,
    g.guest_group || "",
    g.meal_choice || "",
    g.guest_notes || "",
  ]);

  const csv = toCsv(["Name", "Group", "Meal choice", "Dietary notes"], rows);
  const filename = `${sanitizeFilenameSegment(engagement.display_name)} caterer headcount.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
