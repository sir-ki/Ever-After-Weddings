// Creates the first Account (internal team) user.
// Usage: node --env-file=.env.local scripts/create-account-user.mjs <email> <password> "<full name>"
import { createClient } from "@supabase/supabase-js";

const [, , email, password, fullName] = process.argv;

if (!email || !password) {
  console.error(
    'Usage: node --env-file=.env.local scripts/create-account-user.mjs <email> <password> "<full name>"',
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: fullName || "",
  },
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

// handle_new_user() always inserts new rows as 'couple' — signup-time
// metadata is never trusted for role assignment (see migration 0007).
// Promoting to 'account' is a separate, explicit step here.
const { error: promoteError } = await supabase
  .from("users")
  .update({ global_role: "account" })
  .eq("id", data.user.id);

if (promoteError) {
  console.error("User created but failed to promote to account:", promoteError.message);
  process.exit(1);
}

console.log("Created Account user:", data.user.id, data.user.email);
