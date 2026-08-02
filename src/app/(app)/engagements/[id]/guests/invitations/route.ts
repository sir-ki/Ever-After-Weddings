export const runtime = "nodejs";

import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import {
  renderInvitationCardPng,
  sanitizeFilenameSegment,
} from "@/lib/invitation-card";

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

  for (const guest of guests ?? []) {
    const png = await renderInvitationCardPng({
      guestName: guest.full_name,
      coupleNames: engagement.display_name,
      weddingDate: engagement.wedding_date,
      ceremonyVenue: engagement.ceremony_venue,
      inviteUrl: `${SITE_URL}/r/${guest.invite_token}`,
    });

    const base = sanitizeFilenameSegment(guest.full_name);
    const priorCount = usedNames.get(base) ?? 0;
    usedNames.set(base, priorCount + 1);
    const filename = priorCount === 0 ? `${base}.png` : `${base} (${priorCount + 1}).png`;

    zip.file(filename, png);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipFilename = `${sanitizeFilenameSegment(engagement.display_name)} invitations.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    },
  });
}
