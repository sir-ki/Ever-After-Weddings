import { NextResponse } from "next/server";
import { getDayHubByToken } from "@/lib/guest-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const allowed = await checkRateLimit(getClientIp(request));
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const hub = await getDayHubByToken(token);
  if (!hub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(hub);
}
