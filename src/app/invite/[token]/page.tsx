import { getInviteByToken } from "@/lib/invite-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInviteSignup, acceptInviteExisting } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  partner: "partner",
  coordinator: "coordinator",
};

const inputClass =
  "w-full rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-canvas)] px-3 py-2.5 text-sm text-[var(--ea-ink)] focus:border-[var(--ea-accent)] focus:outline-none";
const labelClass = "mb-1 block text-sm text-[var(--ea-ink-secondary)]";

export default async function InviteAcceptPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto max-w-md rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-blush)] p-8 text-center">
          <h1 className="ea-font-serif text-xl text-[var(--ea-ink)]">
            This invite link is invalid or has expired.
          </h1>
          <p className="mt-2 text-sm text-[var(--ea-ink-secondary)]">
            Ask whoever sent it to send you a new one.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", invite.email)
    .maybeSingle();

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-md rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-canvas)] p-8">
        <p className="text-sm text-[var(--ea-ink-secondary)]">You&apos;ve been invited to</p>
        <h1 className="ea-font-serif mt-1 text-[28px] leading-[1.2] text-[var(--ea-ink)]">
          {invite.engagementDisplayName}
        </h1>
        <p className="mt-1 text-sm text-[var(--ea-ink-secondary)]">
          as a {ROLE_LABELS[invite.role] ?? invite.role}
        </p>

        {error && (
          <p className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="my-6 h-px bg-[var(--ea-border)]" />

        {existingUser ? (
          <form action={acceptInviteExisting} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-[var(--ea-ink-secondary)]">
              An account already exists for {invite.email}. Sign in to accept.
            </p>
            <div>
              <label className={labelClass}>Password</label>
              <input name="password" type="password" required className={inputClass} />
            </div>
            <button
              type="submit"
              className="min-h-[44px] w-full rounded-[10px] bg-[var(--ea-accent)] px-3 py-2.5 text-sm font-medium text-[#FFF8F5] hover:opacity-90"
            >
              Sign in and accept
            </button>
          </form>
        ) : (
          <form action={acceptInviteSignup} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <div>
              <label className={labelClass}>Your full name</label>
              <input name="full_name" type="text" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Choose a password</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] w-full rounded-[10px] bg-[var(--ea-accent)] px-3 py-2.5 text-sm font-medium text-[#FFF8F5] hover:opacity-90"
            >
              Create account and accept
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
