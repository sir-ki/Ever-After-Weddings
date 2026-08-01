import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, global_role")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-neutral-500">Signed in as</p>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">
          {profile?.full_name || user.email}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {profile?.email ?? user.email} · {profile?.global_role ?? "no role"}
        </p>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
