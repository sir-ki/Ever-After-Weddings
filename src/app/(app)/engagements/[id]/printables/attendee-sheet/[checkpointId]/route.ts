export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilenameSegment, contentDisposition } from "@/lib/print-theme";
import { renderTablePdf } from "@/lib/printable-pdf";

// The paper backup for a checkpoint — accepted guests, alphabetical,
// table + a blank tick column. Per the spec this is a hard requirement,
// not a convenience: the scanner's "fail loudly" behavior (M7) means
// paper is the fallback when a venue loses signal.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; checkpointId: string }> },
) {
  const { id, checkpointId } = await params;
  const supabase = await createClient();

  const [{ data: engagement }, { data: checkpoint }] = await Promise.all([
    supabase.from("engagements").select("display_name").eq("id", id).single(),
    supabase
      .from("checkpoints")
      .select("id, name")
      .eq("id", checkpointId)
      .eq("engagement_id", id)
      .single(),
  ]);

  if (!engagement || !checkpoint) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: guests }, { data: tables }] = await Promise.all([
    supabase
      .from("guests")
      .select("id, full_name, table_id")
      .eq("engagement_id", id)
      .eq("rsvp_status", "accepted")
      .is("archived_at", null)
      .order("full_name"),
    supabase.from("tables").select("id, label").eq("engagement_id", id),
  ]);

  const tableLabel = new Map((tables ?? []).map((t) => [t.id, t.label]));

  const rows = (guests ?? []).map((g) => ({
    name: g.full_name,
    table: g.table_id ? tableLabel.get(g.table_id) || "" : "",
    present: "",
  }));

  const pdf = await renderTablePdf({
    title: `Attendee sheet — ${checkpoint.name}`,
    subtitle: `${engagement.display_name} · ${rows.length} accepted guests`,
    columns: [
      { key: "name", label: "Name", flex: 3 },
      { key: "table", label: "Table", flex: 1 },
      { key: "present", label: "Present", flex: 1 },
    ],
    rows,
    rowsPerPage: 28,
  });

  const filename = `${sanitizeFilenameSegment(engagement.display_name)} attendee sheet — ${sanitizeFilenameSegment(checkpoint.name)}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
