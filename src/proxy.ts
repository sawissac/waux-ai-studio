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
  // Themed-node fetcher + its font relay; shared tool views call them
  // anonymously. The routes do their own target validation (http(s) only,
  // private hosts rejected).
  const isSiteProxy =
    pathname === "/api/site-proxy" || pathname.startsWith("/api/site-proxy/");

  if (
    !user &&
    pathname !== "/login" &&
    !isSharePage &&
    !isSharedApi &&
    !isSiteProxy
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Skip Next.js internals, static assets, and the favicon. All other routes
  // (including API routes) go through the session-refresh logic.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
