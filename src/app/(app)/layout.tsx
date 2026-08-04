import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="text-sm font-semibold text-neutral-900">
            Ever After
          </Link>
          <div className="flex items-center gap-4">
            {profile?.global_role === "account" && (
              <Link href="/vendor-approvals" className="text-sm text-neutral-500 hover:text-neutral-900">
                Vendors
              </Link>
            )}
            <Link
              href="/profile"
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              {profile?.full_name || user.email} ·{" "}
              {profile?.global_role ?? "no role"}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
