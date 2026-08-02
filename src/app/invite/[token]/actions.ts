"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getInviteByToken } from "@/lib/invite-token";

// Server actions don't receive a Request object (unlike the route handler
// getClientIp was written for), so the IP is pulled from headers() here
// directly — same x-forwarded-for convention as src/lib/rate-limit.ts.
async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function fail(token: string, message: string): never {
  redirect(`/invite/${token}?error=${encodeURIComponent(message)}`);
}

// Public, unauthenticated acceptance. Every field that grants access
// (engagement_id, role) is re-resolved server-side from the invite row
// looked up by token — never taken from form data. Same discipline as
// the vendor public-signup path (src/app/directory/apply/actions.ts) and
// the class of bug migration 0007 fixed. Uses the admin client narrowly:
// an anonymous visitor has no session to satisfy any RLS check.
export async function acceptInviteSignup(formData: FormData) {
  const token = formData.get("token") as string;
  const fullName = (formData.get("full_name") as string)?.trim();
  const password = formData.get("password") as string;

  const allowed = await checkRateLimit(await clientIp());
  if (!allowed) {
    fail(token, "Too many attempts. Please try again in a minute.");
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    fail(token, "This invite link is invalid or has expired.");
  }

  if (!fullName || !password || password.length < 8) {
    fail(token, "Please provide your name and a password of at least 8 characters.");
  }

  const admin = createAdminClient();

  // No role metadata — handle_new_user() (migration 0007) always lands
  // new users as 'couple', which is correct here regardless of the
  // engagement_members role being granted below.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    fail(token, "Something went wrong creating your account. Please try again.");
  }

  const { error: memberError } = await admin.from("engagement_members").insert({
    engagement_id: invite.engagementId,
    user_id: created.user.id,
    role: invite.role,
  });

  if (memberError) {
    fail(token, "Something went wrong attaching your account. Please try again.");
  }

  await admin
    .from("engagement_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: created.user.id })
    .eq("id", invite.inviteId);

  // Sign in via the session-bound client so cookies are actually set —
  // the admin client used above never touches the request's cookies.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });

  if (signInError) {
    redirect("/login");
  }

  redirect(`/engagements/${invite.engagementId}`);
}

export async function acceptInviteExisting(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  const allowed = await checkRateLimit(await clientIp());
  if (!allowed) {
    fail(token, "Too many attempts. Please try again in a minute.");
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    fail(token, "This invite link is invalid or has expired.");
  }

  const supabase = await createClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });

  if (signInError || !signInData.user) {
    fail(token, "Incorrect password.");
  }

  // The invite is a public link — verify the session that just signed in
  // actually belongs to the invited email, not some other account that
  // happened to share this browser.
  if (signInData.user.email !== invite.email) {
    await supabase.auth.signOut();
    fail(token, "This invite is for a different email address.");
  }

  const admin = createAdminClient();
  const { error: memberError } = await admin.from("engagement_members").insert({
    engagement_id: invite.engagementId,
    user_id: signInData.user.id,
    role: invite.role,
  });

  // A unique-violation here just means they're already attached (e.g. a
  // re-click) — treat it as success, not a failure, same soft-conflict
  // handling as the checkpoint scanner's race case.
  if (memberError && memberError.code !== "23505") {
    fail(token, "Something went wrong attaching your account. Please try again.");
  }

  await admin
    .from("engagement_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: signInData.user.id })
    .eq("id", invite.inviteId);

  redirect(`/engagements/${invite.engagementId}`);
}
