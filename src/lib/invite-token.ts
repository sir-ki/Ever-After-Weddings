import "server-only";
import { createAdminClient } from "./supabase/admin";

// Mirrors src/lib/guest-token.ts's discipline: a token is a bearer
// credential held by an anonymous invitee, not a logged-in session.
// Returns null uniformly for not-found, expired, revoked, and
// already-accepted — no distinguishing oracle for a probing caller. See
// docs/ever-after-launch-readiness-spec.md Part 1.

export type InviteLookup = {
  inviteId: string;
  engagementId: string;
  engagementDisplayName: string;
  email: string;
  role: "partner" | "coordinator";
};

type EngagementRow = { display_name: string; archived_at: string | null };

export async function getInviteByToken(token: string): Promise<InviteLookup | null> {
  if (!token || token.length < 16) return null;

  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("engagement_invites")
    .select(
      "id, engagement_id, email, role, expires_at, accepted_at, revoked_at, engagements(display_name, archived_at)",
    )
    .eq("token", token)
    .maybeSingle();

  if (!invite) return null;
  if (invite.accepted_at || invite.revoked_at) return null;
  if (new Date(invite.expires_at) < new Date()) return null;

  const engagement = invite.engagements as unknown as EngagementRow | null;
  if (!engagement || engagement.archived_at) return null;

  return {
    inviteId: invite.id,
    engagementId: invite.engagement_id,
    engagementDisplayName: engagement.display_name,
    email: invite.email,
    role: invite.role as "partner" | "coordinator",
  };
}
