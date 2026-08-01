import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — only ever use from server-side
// route handlers, never expose to the client bundle.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
