export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilenameSegment, contentDisposition } from "@/lib/print-theme";
import { renderTablePdf } from "@/lib/printable-pdf";

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

  const [{ data: entries }, { data: guests }] = await Promise.all([
    supabase
      .from("processional_entries")
      .select("id, sort_order, label, left_guest_id, right_guest_id, free_text, notes")
      .eq("engagement_id", id)
      .order("sort_order"),
    supabase.from("guests").select("id, full_name").eq("engagement_id", id),
  ]);

  if (!entries?.length) {
    return NextResponse.json(
      { error: "No processional entries to print." },
      { status: 400 },
    );
  }

  const guestName = new Map((guests ?? []).map((g) => [g.id, g.full_name]));

  const rows = entries.map((entry, i) => {
    const names = [
      entry.left_guest_id ? guestName.get(entry.left_guest_id) : entry.free_text,
      entry.right_guest_id ? guestName.get(entry.right_guest_id) : null,
    ]
      .filter(Boolean)
      .join(" & ");

    return {
      order: String(i + 1),
      position: entry.label || "",
      names,
      notes: entry.notes || "",
    };
  });

  const pdf = await renderTablePdf({
    title: "Processional running order",
    subtitle: engagement.display_name,
    columns: [
      { key: "order", label: "#", flex: 0.4 },
      { key: "position", label: "Position", flex: 1.5 },
      { key: "names", label: "Who", flex: 2 },
      { key: "notes", label: "Notes", flex: 1.5 },
    ],
    rows,
    rowsPerPage: 26,
  });

  const filename = `${sanitizeFilenameSegment(engagement.display_name)} processional.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
