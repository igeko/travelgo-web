/**
 * proxy.ts  (Next.js 16 — replaces middleware.ts)
 * ─────────────────────────────────────────────────────────────────
 * Runs on every matched request.
 *
 * Responsibilities:
 *  1. Refresh the Supabase session (keeps cookies up to date)
 *  2. Protect authenticated routes — redirect unauthenticated users
 *     to /login, preserving the intended destination in ?next=
 *  3. Redirect already-authenticated users away from /login
 * ─────────────────────────────────────────────────────────────────
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/trips", "/account"];

// Routes only for unauthenticated users (redirect away if logged in)
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, let the request through — the page itself will error clearly
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]),
        );
      },
    },
  });

  // Refresh session — must happen before checking auth state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth-only pages
  if (user && AUTH_ONLY_ROUTES.includes(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/trips";
    homeUrl.searchParams.delete("next");
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|media/|design/|auth/callback|api/).*)",
  ],
};
