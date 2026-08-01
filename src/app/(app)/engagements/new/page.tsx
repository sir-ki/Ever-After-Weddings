import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createEngagement } from "../actions";

export default async function NewEngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user!.id)
    .single();

  if (profile?.global_role !== "account") {
    redirect("/");
  }

  const { data: accountUsers } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("global_role", "account")
    .order("full_name");

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">
        New engagement
      </h1>

      <form action={createEngagement} className="space-y-4">
        <div>
          <label
            htmlFor="display_name"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            placeholder="Maria & Jon"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="partner_a_name"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Partner A name
            </label>
            <input
              id="partner_a_name"
              name="partner_a_name"
              type="text"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="partner_b_name"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Partner B name
            </label>
            <input
              id="partner_b_name"
              name="partner_b_name"
              type="text"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="wedding_date"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Wedding date
            </label>
            <input
              id="wedding_date"
              name="wedding_date"
              type="date"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="stage"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Stage
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue="onboarding"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            >
              <option value="onboarding">Onboarding</option>
              <option value="building">Building</option>
              <option value="live">Live</option>
              <option value="post_wedding">Post-wedding</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="assigned_to"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Assigned to
          </label>
          <select
            id="assigned_to"
            name="assigned_to"
            defaultValue=""
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Unassigned</option>
            {accountUsers?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Create engagement
        </button>
      </form>
    </div>
  );
}
