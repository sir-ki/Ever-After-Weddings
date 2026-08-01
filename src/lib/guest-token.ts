import "server-only";
import { createAdminClient } from "./supabase/admin";

// The highest-risk surface in the system: a token is a bearer
// credential held by an anonymous guest, not a logged-in session. Every
// function here must resolve to exactly one guest row and return only
// a hand-built shape — never `select *`, never a list, never
// internal_notes or another guest's data. See docs/ever-after-auth-and-access.md §5.

export type PublicGuest = {
  full_name: string;
  rsvp_status: string;
  contact_phone: string | null;
  guest_notes: string | null;
  meal_choice: string | null;
  song_request: string | null;
};

export type PublicEngagement = {
  display_name: string;
  wedding_date: string | null;
  ceremony_venue: string | null;
  ceremony_address: string | null;
  ceremony_time: string | null;
  reception_venue: string | null;
  reception_address: string | null;
  reception_time: string | null;
  rsvp_deadline: string | null;
};

export type GuestTokenLookup = {
  guestId: string;
  guest: PublicGuest;
  engagement: PublicEngagement;
};

type EngagementRow = PublicEngagement & { archived_at: string | null };

export async function getGuestByToken(
  token: string,
): Promise<GuestTokenLookup | null> {
  if (!token || token.length < 16) return null;

  const supabase = createAdminClient();

  const { data: guest } = await supabase
    .from("guests")
    .select(
      "id, full_name, rsvp_status, contact_phone, guest_notes, meal_choice, song_request, archived_at, engagements(display_name, wedding_date, ceremony_venue, ceremony_address, ceremony_time, reception_venue, reception_address, reception_time, rsvp_deadline, archived_at)",
    )
    .eq("invite_token", token)
    .maybeSingle();

  if (!guest || guest.archived_at) return null;

  const engagement = guest.engagements as unknown as EngagementRow | null;
  if (!engagement || engagement.archived_at) return null;

  return {
    guestId: guest.id,
    guest: {
      full_name: guest.full_name,
      rsvp_status: guest.rsvp_status,
      contact_phone: guest.contact_phone,
      guest_notes: guest.guest_notes,
      meal_choice: guest.meal_choice,
      song_request: guest.song_request,
    },
    engagement: {
      display_name: engagement.display_name,
      wedding_date: engagement.wedding_date,
      ceremony_venue: engagement.ceremony_venue,
      ceremony_address: engagement.ceremony_address,
      ceremony_time: engagement.ceremony_time,
      reception_venue: engagement.reception_venue,
      reception_address: engagement.reception_address,
      reception_time: engagement.reception_time,
      rsvp_deadline: engagement.rsvp_deadline,
    },
  };
}

export function isPastDeadline(rsvpDeadline: string | null): boolean {
  if (!rsvpDeadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today > rsvpDeadline;
}
