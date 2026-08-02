export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COLORS, sanitizeFilenameSegment, contentDisposition } from "@/lib/print-theme";
import { renderPagePng, assemblePdf, PAGE_WIDTH, PAGE_HEIGHT } from "@/lib/printable-pdf";

function formatTime(time: string | null) {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// The single page a coordinator actually carries — every supplier's
// contact plus the run of show, both already in this codebase
// (engagement_vendors, schedule_items). Internal document: every
// schedule item is shown regardless of is_guest_visible.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: engagement } = await supabase
    .from("engagements")
    .select("display_name, wedding_date")
    .eq("id", id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: vendors }, { data: items }] = await Promise.all([
    supabase
      .from("engagement_vendors")
      .select("business_name, category, contact_phone, contact_email")
      .eq("engagement_id", id)
      .order("business_name"),
    supabase
      .from("schedule_items")
      .select("start_time, title, location, owner")
      .eq("engagement_id", id)
      .order("sort_order"),
  ]);

  const png = await renderPagePng(
    <div
      style={{
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.canvas,
        padding: 64,
        fontFamily: "sans",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
        <div style={{ fontFamily: "serif", fontSize: 40, color: COLORS.ink }}>
          Day-of call sheet
        </div>
        <div style={{ fontSize: 18, color: COLORS.inkSecondary, marginTop: 6 }}>
          {engagement.display_name}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: COLORS.ink,
            borderBottom: `2px solid ${COLORS.ink}`,
            paddingBottom: 8,
            marginBottom: 8,
          }}
        >
          Suppliers
        </div>
        {(vendors ?? []).length === 0 ? (
          <div style={{ display: "flex", fontSize: 16, color: COLORS.inkSecondary }}>
            No suppliers logged yet.
          </div>
        ) : (
          (vendors ?? []).map((v, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                borderBottom: `1px solid ${COLORS.border}`,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              <div style={{ display: "flex", flex: 2, fontSize: 18, color: COLORS.ink }}>
                {v.business_name}
              </div>
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  fontSize: 16,
                  color: COLORS.inkSecondary,
                  textTransform: "capitalize",
                }}
              >
                {v.category}
              </div>
              <div style={{ display: "flex", flex: 2, fontSize: 16, color: COLORS.inkSecondary }}>
                {[v.contact_phone, v.contact_email].filter(Boolean).join(" · ")}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: COLORS.ink,
            borderBottom: `2px solid ${COLORS.ink}`,
            paddingBottom: 8,
            marginBottom: 8,
          }}
        >
          Run of show
        </div>
        {(items ?? []).length === 0 ? (
          <div style={{ display: "flex", fontSize: 16, color: COLORS.inkSecondary }}>
            No schedule items yet.
          </div>
        ) : (
          (items ?? []).map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                borderBottom: `1px solid ${COLORS.border}`,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              <div style={{ display: "flex", flex: 0.8, fontSize: 16, color: COLORS.inkSecondary }}>
                {formatTime(item.start_time)}
              </div>
              <div style={{ display: "flex", flex: 2, fontSize: 18, color: COLORS.ink }}>
                {item.title}
              </div>
              <div style={{ display: "flex", flex: 1.5, fontSize: 16, color: COLORS.inkSecondary }}>
                {item.location || ""}
              </div>
              <div style={{ display: "flex", flex: 1, fontSize: 16, color: COLORS.inkSecondary }}>
                {item.owner || ""}
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
  );

  const pdf = await assemblePdf([png]);
  const filename = `${sanitizeFilenameSegment(engagement.display_name)} call sheet.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
