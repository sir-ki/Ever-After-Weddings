import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, phone, global_role")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Profile</h1>

      <form action={updateProfile} className="space-y-4">
        <div>
          <label
            htmlFor="full_name"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            defaultValue={profile?.full_name ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile?.phone ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-neutral-700">
            Email
          </span>
          <p className="text-sm text-neutral-500">{profile?.email}</p>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-neutral-700">
            Role
          </span>
          <p className="text-sm text-neutral-500">{profile?.global_role}</p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Saved.
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
