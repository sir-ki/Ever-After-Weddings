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
  engagementId: string;
  guest: PublicGuest;
  engagement: PublicEngagement;
};

type EngagementRow = PublicEngagement & { id: string; archived_at: string | null };

export async function getGuestByToken(
  token: string,
): Promise<GuestTokenLookup | null> {
  if (!token || token.length < 16) return null;

  const supabase = createAdminClient();

  const { data: guest } = await supabase
    .from("guests")
    .select(
      "id, full_name, rsvp_status, contact_phone, guest_notes, meal_choice, song_request, archived_at, engagements(id, display_name, wedding_date, ceremony_venue, ceremony_address, ceremony_time, reception_venue, reception_address, reception_time, rsvp_deadline, archived_at)",
    )
    .eq("invite_token", token)
    .maybeSingle();

  if (!guest || guest.archived_at) return null;

  const engagement = guest.engagements as unknown as EngagementRow | null;
  if (!engagement || engagement.archived_at) return null;

  return {
    guestId: guest.id,
    engagementId: engagement.id,
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

export type ScheduleItem = { start_time: string | null; title: string; location: string | null };

export type DayHub = {
  unlocked: boolean;
  guestName: string;
  rsvpStatus: string;
  weddingDate: string | null;
  announcement: string | null;
  schedule: ScheduleItem[];
  tableLabel: string | null;
  venue: {
    ceremony_venue: string | null;
    ceremony_address: string | null;
    reception_venue: string | null;
    reception_address: string | null;
  };
  coordinator: { name: string; phone: string } | null;
};

// The day-of hub: guest-visible schedule, the "right now" announcement,
// and — only for accepted guests — their table. Per
// docs/ever-after-template-spec.md §2, a declined guest still sees the
// schedule and venue info, just no table. Hidden entirely until the
// site's day_hub_unlocked_at has passed.
export async function getDayHubByToken(token: string): Promise<DayHub | null> {
  const base = await getGuestByToken(token);
  if (!base) return null;

  const supabase = createAdminClient();

  const { data: site } = await supabase
    .from("sites")
    .select("day_hub_unlocked_at")
    .eq("engagement_id", base.engagementId)
    .maybeSingle();

  const unlocked =
    !!site?.day_hub_unlocked_at && new Date(site.day_hub_unlocked_at) <= new Date();

  if (!unlocked) {
    return {
      unlocked: false,
      guestName: base.guest.full_name,
      rsvpStatus: base.guest.rsvp_status,
      weddingDate: base.engagement.wedding_date,
      announcement: null,
      schedule: [],
      tableLabel: null,
      venue: {
        ceremony_venue: null,
        ceremony_address: null,
        reception_venue: null,
        reception_address: null,
      },
      coordinator: null,
    };
  }

  const [{ data: announcement }, { data: scheduleItems }, { data: guestRow }, { data: coordinators }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select("body")
        .eq("engagement_id", base.engagementId)
        .eq("is_active", true)
        .order("posted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("schedule_items")
        .select("start_time, title, location")
        .eq("engagement_id", base.engagementId)
        .eq("is_guest_visible", true)
        .order("sort_order"),
      supabase.from("guests").select("table_id").eq("id", base.guestId).single(),
      supabase
        .from("engagement_members")
        .select("user_id, role, users(full_name, phone)")
        .eq("engagement_id", base.engagementId)
        .eq("role", "coordinator"),
    ]);

  let tableLabel: string | null = null;
  if (base.guest.rsvp_status === "accepted" && guestRow?.table_id) {
    const { data: table } = await supabase
      .from("tables")
      .select("label")
      .eq("id", guestRow.table_id)
      .maybeSingle();
    tableLabel = table?.label ?? null;
  }

  let coordinator: { name: string; phone: string } | null = null;
  for (const member of coordinators ?? []) {
    const person = member.users as unknown as { full_name: string | null; phone: string | null } | null;
    if (person?.full_name && person?.phone) {
      coordinator = { name: person.full_name, phone: person.phone };
      break;
    }
  }

  return {
    unlocked: true,
    guestName: base.guest.full_name,
    rsvpStatus: base.guest.rsvp_status,
    weddingDate: base.engagement.wedding_date,
    announcement: announcement?.body ?? null,
    schedule: scheduleItems ?? [],
    tableLabel,
    venue: {
      ceremony_venue: base.engagement.ceremony_venue,
      ceremony_address: base.engagement.ceremony_address,
      reception_venue: base.engagement.reception_venue,
      reception_address: base.engagement.reception_address,
    },
    coordinator,
  };
}
