import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGuestByToken, isPastDeadline } from "@/lib/guest-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ALLOWED_RSVP_STATUSES = ["accepted", "declined"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const allowed = await checkRateLimit(getClientIp(request));
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const result = await getGuestByToken(token);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isPastDeadline(result.engagement.rsvp_deadline)) {
    return NextResponse.json(
      { error: "The RSVP deadline has passed." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { rsvp_status, contact_phone, guest_notes, meal_choice, song_request } =
    body;

  if (
    typeof rsvp_status !== "string" ||
    !ALLOWED_RSVP_STATUSES.includes(rsvp_status)
  ) {
    return NextResponse.json(
      { error: "rsvp_status must be 'accepted' or 'declined'" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guests")
    .update({
      rsvp_status,
      rsvp_responded_at: new Date().toISOString(),
      contact_phone: typeof contact_phone === "string" ? contact_phone : undefined,
      guest_notes: typeof guest_notes === "string" ? guest_notes : undefined,
      meal_choice: typeof meal_choice === "string" ? meal_choice : undefined,
      song_request: typeof song_request === "string" ? song_request : undefined,
    })
    .eq("id", result.guestId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save your RSVP." },
      { status: 500 },
    );
  }

  const updated = await getGuestByToken(token);
  return NextResponse.json({ guest: updated?.guest });
}
