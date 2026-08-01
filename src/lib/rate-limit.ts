import "server-only";
import { createAdminClient } from "./supabase/admin";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const CLEANUP_AGE_MS = 60 * 60_000;

// A token is unguessable at 128 bits, but this turns "theoretically
// infeasible" into "not worth attempting" — per the auth doc's
// hardening checklist for the guest token path.
export async function checkRateLimit(ip: string): Promise<boolean> {
  const supabase = createAdminClient();
  const now = Date.now();

  await supabase
    .from("guest_token_requests")
    .delete()
    .lt("created_at", new Date(now - CLEANUP_AGE_MS).toISOString());

  const { count } = await supabase
    .from("guest_token_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", new Date(now - WINDOW_MS).toISOString());

  await supabase.from("guest_token_requests").insert({ ip });

  return (count ?? 0) < MAX_REQUESTS_PER_WINDOW;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
