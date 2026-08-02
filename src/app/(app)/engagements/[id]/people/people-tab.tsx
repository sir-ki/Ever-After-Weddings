import { createClient } from "@/lib/supabase/server";
import { createInvite, revokeInvite, removeMember } from "./actions";
import CopyLinkButton from "./copy-link-button";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PeopleTab({
  engagementId,
  error,
}: {
  engagementId: string;
  error?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentUserRow } = user
    ? await supabase.from("users").select("global_role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAccount = currentUserRow?.global_role === "account";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("engagement_members")
      .select("id, role, created_at, users(full_name, email)")
      .eq("engagement_id", engagementId)
      .order("created_at"),
    supabase
      .from("engagement_invites")
      .select("id, email, role, token, expires_at, accepted_at, revoked_at, created_at")
      .eq("engagement_id", engagementId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      {isAccount && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-neutral-900">Invite a member</h3>
          {error && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <form action={createInvite} className="grid grid-cols-3 gap-3">
            <input type="hidden" name="engagement_id" value={engagementId} />
            <div className="col-span-2">
              <label className={labelClass}>Email</label>
              <input name="email" type="email" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select name="role" defaultValue="partner" className={inputClass}>
                <option value="partner">Partner</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </div>
            <div className="col-span-3">
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Send invite
              </button>
            </div>
          </form>
        </div>
      )}

      <h3 className="mb-2 font-medium text-neutral-900">Members</h3>
      {members?.length ? (
        <table className="mb-6 w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Email</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">Joined</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {members.map((m) => {
              const person = m.users as unknown as {
                full_name: string | null;
                email: string;
              } | null;
              return (
                <tr key={m.id}>
                  <td className="py-2 pr-3 text-neutral-900">
                    {person?.full_name || "—"}
                  </td>
                  <td className="py-2 pr-3 text-neutral-600">{person?.email}</td>
                  <td className="py-2 pr-3 text-neutral-600">{m.role}</td>
                  <td className="py-2 pr-3 text-neutral-600">
                    {formatDate(m.created_at)}
                  </td>
                  <td className="py-2 text-right">
                    {isAccount && (
                      <form action={removeMember}>
                        <input type="hidden" name="engagement_id" value={engagementId} />
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="text-sm text-neutral-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="mb-6 rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          No members attached yet.
        </p>
      )}

      <h3 className="mb-2 font-medium text-neutral-900">Pending invites</h3>
      {invites?.length ? (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Email</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">Expires</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {invites.map((i) => (
              <tr key={i.id}>
                <td className="py-2 pr-3 text-neutral-900">{i.email}</td>
                <td className="py-2 pr-3 text-neutral-600">{i.role}</td>
                <td className="py-2 pr-3 text-neutral-600">
                  {formatDate(i.expires_at)}
                </td>
                <td className="py-2 text-right">
                  {isAccount && (
                    <div className="flex items-center justify-end gap-3">
                      <CopyLinkButton url={`${SITE_URL}/invite/${i.token}`} />
                      <form action={revokeInvite}>
                        <input type="hidden" name="engagement_id" value={engagementId} />
                        <input type="hidden" name="id" value={i.id} />
                        <button
                          type="submit"
                          className="text-sm text-neutral-400 hover:text-red-600"
                        >
                          Revoke
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          No pending invites.
        </p>
      )}
    </div>
  );
}
