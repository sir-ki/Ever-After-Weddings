"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Vendor is the one role that never lands in the internal-tool
  // workspace — (app)/layout.tsx would just redirect it there anyway,
  // this just skips the bounce.
  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", data.user.id)
    .single();

  redirect(profile?.global_role === "vendor" ? "/vendor/profile" : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
