export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilenameSegment, contentDisposition } from "@/lib/print-theme";
import { renderPagePng, assemblePdf, PAGE_WIDTH, PAGE_HEIGHT } from "@/lib/printable-pdf";
import { resolveAccentPreset } from "@/lib/site-themes";

const CARDS_PER_PAGE = 10;
const COLUMNS = 2;

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
      .select("id, full_name, table_id")
      .eq("engagement_id", id)
      .eq("rsvp_status", "accepted")
      .is("archived_at", null)
      .order("full_name"),
    supabase.from("tables").select("id, label").eq("engagement_id", id),
  ]);

  if (!guests?.length) {
    return NextResponse.json(
      { error: "No accepted guests to print place cards for." },
      { status: 400 },
    );
  }

  const tableLabel = new Map((tables ?? []).map((t) => [t.id, t.label]));

  // Place cards follow the couple's site theme (unlike the other
  // printables, which stay house palette) — per the launch-readiness
  // spec's own split.
  const { data: site } = await supabase
    .from("sites")
    .select("theme")
    .eq("engagement_id", id)
    .maybeSingle();
  const COLORS = resolveAccentPreset(site?.theme ?? null).tokens;

  const pageCount = Math.ceil(guests.length / CARDS_PER_PAGE);
  const pages: Buffer[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageGuests = guests.slice(
      pageIndex * CARDS_PER_PAGE,
      pageIndex * CARDS_PER_PAGE + CARDS_PER_PAGE,
    );

    const png = await renderPagePng(
      <div
        style={{
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "flex-start",
          backgroundColor: COLORS.canvas,
          padding: 40,
          gap: 24,
          fontFamily: "sans",
        }}
      >
        {pageGuests.map((guest) => (
          <div
            key={guest.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: (PAGE_WIDTH - 80 - 24 * (COLUMNS - 1)) / COLUMNS,
              height: 315,
              border: `2px dashed ${COLORS.border}`,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontFamily: "serif",
                fontSize: 44,
                color: COLORS.ink,
                textAlign: "center",
              }}
            >
              {guest.full_name}
            </div>
            <div
              style={{
                fontSize: 20,
                color: COLORS.accentInk,
                marginTop: 16,
              }}
            >
              {guest.table_id ? tableLabel.get(guest.table_id) || "" : "Unassigned"}
            </div>
          </div>
        ))}
      </div>,
    );

    pages.push(png);
  }

  const pdf = await assemblePdf(pages);
  const filename = `${sanitizeFilenameSegment(engagement.display_name)} place cards.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
