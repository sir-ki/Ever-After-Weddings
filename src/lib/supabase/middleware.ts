import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: refreshes the auth token and must run before any
  // route logic that checks the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");

  // Guests are never logged in — the token in the URL is their
  // credential. These routes must stay reachable without a session.
  // /s/[slug] is the public wedding site: anonymous visitors see
  // published sites (RLS-gated), while a logged-in Account/couple
  // still gets their session cookies here to preview a draft.
  // /invite/ is anonymous invite acceptance — the token is the
  // credential, not a session, same as /r/.
  // The marketing site (docs/ever-after-marketing-site-plan.md) — anonymous
  // visitors, no auth, no data. "/" doubles as both the marketing homepage
  // and (for a signed-in user) the entry point to the app, so it gets its
  // own redirect below rather than folding into isPublicRoute.
  const isMarketingRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/how-it-works") ||
    request.nextUrl.pathname.startsWith("/pricing") ||
    request.nextUrl.pathname.startsWith("/vendors") ||
    request.nextUrl.pathname.startsWith("/contact");

  if (user && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const isPublicRoute =
    isMarketingRoute ||
    request.nextUrl.pathname.startsWith("/r/") ||
    request.nextUrl.pathname.startsWith("/api/g/") ||
    request.nextUrl.pathname.startsWith("/s/") ||
    request.nextUrl.pathname.startsWith("/directory") ||
    request.nextUrl.pathname.startsWith("/invite/");

  if (isPublicRoute) {
    return supabaseResponse;
  }

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
