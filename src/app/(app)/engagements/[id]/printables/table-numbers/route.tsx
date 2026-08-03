export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilenameSegment, contentDisposition } from "@/lib/print-theme";
import { renderPagePng, assemblePdf, PAGE_WIDTH, PAGE_HEIGHT } from "@/lib/printable-pdf";
import { resolveAccentPreset } from "@/lib/site-themes";

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

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label")
    .eq("engagement_id", id)
    .order("sort_order");

  if (!tables?.length) {
    return NextResponse.json({ error: "No tables to print." }, { status: 400 });
  }

  // Table numbers follow the couple's site theme (unlike the other
  // printables, which stay house palette) — per the launch-readiness
  // spec's own split.
  const { data: site } = await supabase
    .from("sites")
    .select("theme")
    .eq("engagement_id", id)
    .maybeSingle();
  const COLORS = resolveAccentPreset(site?.theme ?? null).tokens;

  const pages = await Promise.all(
    tables.map((table) =>
      renderPagePng(
        <div
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.canvas,
            fontFamily: "sans",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 80,
              border: `2px solid ${COLORS.border}`,
              borderRadius: 32,
            }}
          >
            <div
              style={{
                fontSize: 24,
                letterSpacing: 4,
                color: COLORS.inkSecondary,
                textTransform: "lowercase",
              }}
            >
              {engagement.display_name}
            </div>
            <div
              style={{
                fontFamily: "serif",
                fontSize: 140,
                color: COLORS.accentInk,
                marginTop: 40,
                textAlign: "center",
              }}
            >
              {table.label}
            </div>
          </div>
        </div>,
      ),
    ),
  );

  const pdf = await assemblePdf(pages);
  const filename = `${sanitizeFilenameSegment(engagement.display_name)} table numbers.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
