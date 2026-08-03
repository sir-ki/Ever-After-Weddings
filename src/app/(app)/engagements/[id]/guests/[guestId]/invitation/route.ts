export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  renderInvitationCardPng,
  sanitizeFilenameSegment,
} from "@/lib/invitation-card";
import { contentDisposition } from "@/lib/print-theme";
import { resolveAccentPreset } from "@/lib/site-themes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; guestId: string }> },
) {
  const { id, guestId } = await params;
  const supabase = await createClient();

  const { data: guest } = await supabase
    .from("guests")
    .select(
      "full_name, invite_token, engagements(display_name, wedding_date, ceremony_venue)",
    )
    .eq("id", guestId)
    .eq("engagement_id", id)
    .single();

  if (!guest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const engagement = guest.engagements as unknown as {
    display_name: string;
    wedding_date: string | null;
    ceremony_venue: string | null;
  } | null;

  // The card must match the couple's site theme — real per-couple
  // theming.
  const { data: site } = await supabase
    .from("sites")
    .select("theme")
    .eq("engagement_id", id)
    .maybeSingle();

  const png = await renderInvitationCardPng({
    guestName: guest.full_name,
    coupleNames: engagement?.display_name ?? "",
    weddingDate: engagement?.wedding_date ?? null,
    ceremonyVenue: engagement?.ceremony_venue ?? null,
    inviteUrl: `${SITE_URL}/r/${guest.invite_token}`,
    colors: resolveAccentPreset(site?.theme ?? null).tokens,
  });

  const filename = `${sanitizeFilenameSegment(guest.full_name)}.png`;

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
