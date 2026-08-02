export const runtime = "nodejs";
// Launch-readiness spec Part 5: bulk export was explicitly flagged during
// Part 3 as a scale risk to decide on, not discover in production.
// Rendering is batched below (concurrency, not fully sequential) and this
// makes the time budget explicit — 60s is also the Vercel Hobby-plan
// ceiling regardless of a higher value, so this doesn't assume a paid tier.
export const maxDuration = 60;

import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import {
  renderInvitationCardPng,
  sanitizeFilenameSegment,
} from "@/lib/invitation-card";
import { contentDisposition } from "@/lib/print-theme";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: engagement } = await supabase
    .from("engagements")
    .select("display_name, wedding_date, ceremony_venue")
    .eq("id", id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: guests } = await supabase
    .from("guests")
    .select("id, full_name, invite_token")
    .eq("engagement_id", id)
    .is("archived_at", null)
    .order("full_name");

  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  // Rendered in small concurrent batches rather than one at a time — the
  // sharp/resvg work behind renderInvitationCardPng overlaps meaningfully,
  // cutting wall-clock without unbounded memory use at once. At the
  // seeded 300-guest scale this was measured directly (see the handoff/
  // commit notes), not assumed.
  const CONCURRENCY = 8;
  for (let start = 0; start < (guests?.length ?? 0); start += CONCURRENCY) {
    const batch = (guests ?? []).slice(start, start + CONCURRENCY);
    const pngs = await Promise.all(
      batch.map((guest) =>
        renderInvitationCardPng({
          guestName: guest.full_name,
          coupleNames: engagement.display_name,
          weddingDate: engagement.wedding_date,
          ceremonyVenue: engagement.ceremony_venue,
          inviteUrl: `${SITE_URL}/r/${guest.invite_token}`,
        }),
      ),
    );

    batch.forEach((guest, i) => {
      const base = sanitizeFilenameSegment(guest.full_name);
      const priorCount = usedNames.get(base) ?? 0;
      usedNames.set(base, priorCount + 1);
      const filename =
        priorCount === 0 ? `${base}.png` : `${base} (${priorCount + 1}).png`;
      zip.file(filename, pngs[i]);
    });
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipFilename = `${sanitizeFilenameSegment(engagement.display_name)} invitations.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(zipFilename),
    },
  });
}
