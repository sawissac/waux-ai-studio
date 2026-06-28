import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // supabaseResponse must be used as the return value so session cookies are
  // written back. Do not create a new NextResponse.next() elsewhere in this fn.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request first (so subsequent SSR reads see them).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Recreate the response so all cookie writes end up on the same object.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: use getUser() not getSession() — getSession() reads from the
  // cookie without server-side validation and is insecure in proxy.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // UUID-shaped paths are public share links; /api/shared/* serves their data.
  const isSharePage =
    /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      pathname,
    );
  const isSharedApi = pathname.startsWith("/api/shared/");
  // Public gallery: the /g/<handle> page and its data API. Both serve only
  // published galleries (RLS-gated) and expose no owner identity.
  const isGalleryPage = pathname.startsWith("/g/");
  const isGalleryApi = pathname.startsWith("/api/gallery/");
  // Themed-node fetcher + its font relay; shared tool views call them
  // anonymously. The routes do their own target validation (http(s) only,
  // private hosts rejected).
  const isSiteProxy =
    pathname === "/api/site-proxy" || pathname.startsWith("/api/site-proxy/");
  // Password-reset flow: the request form and the email-link callback both run
  // before a session exists, so they must be reachable while unauthenticated.
  const isAuthFlow =
    pathname === "/forgot-password" || pathname.startsWith("/auth/");
  // Public marketing landing page — reachable by everyone, logged in or not.
  const isLanding = pathname === "/";
  // Public legal pages — must load while unauthenticated.
  const isLegal = pathname === "/privacy" || pathname === "/terms";

  if (
    !user &&
    pathname !== "/login" &&
    !isLanding &&
    !isLegal &&
    !isSharePage &&
    !isSharedApi &&
    !isGalleryPage &&
    !isGalleryApi &&
    !isSiteProxy &&
    !isAuthFlow
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/studio";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Skip Next.js internals, the favicon, and public static assets (cursors,
  // images, fonts) — these must load even while unauthenticated, or the auth
  // redirect breaks them (e.g. the SVG cursor falls back to the native arrow).
  // All other routes (including API routes) go through session-refresh logic.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf)$).*)",
  ],
};
