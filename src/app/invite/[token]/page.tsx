import { getInviteByToken } from "@/lib/invite-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInviteSignup, acceptInviteExisting } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  partner: "partner",
  coordinator: "coordinator",
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

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
      <div className="min-h-screen bg-neutral-50 px-4 py-12">
        <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-neutral-900">
            This invite link is invalid or has expired.
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
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
    <div className="min-h-screen bg-neutral-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-8">
        <p className="text-sm text-neutral-500">You&apos;ve been invited to</p>
        <h1 className="text-2xl font-semibold text-neutral-900">
          {invite.engagementDisplayName}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          as a {ROLE_LABELS[invite.role] ?? invite.role}
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="my-6 h-px bg-neutral-100" />

        {existingUser ? (
          <form action={acceptInviteExisting} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-neutral-600">
              An account already exists for {invite.email}. Sign in to accept.
            </p>
            <div>
              <label className={labelClass}>Password</label>
              <input
                name="password"
                type="password"
                required
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
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
              className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Create account and accept
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
