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
 *  4. Auth-check + rate-limit API proxy routes:
 *       /api/places/*  — Google Places / Photo
 *       /api/ai/*      — OpenAI (assistente Go v2)
 *       /api/go/*      — OpenAI (assistente Go v1 + deep-dive)
 *       /api/routes    — Google Routes
 *
 * Rate-limit note: in-memory store works on single instances. For
 * multi-region Vercel deployments, swap with Upstash Redis.
 * ─────────────────────────────────────────────────────────────────
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ─── Page-level auth config ───────────────────────────────────────
const PROTECTED_PAGE_PREFIXES = ["/trips", "/account"];
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

// ─── API auth config ──────────────────────────────────────────────
// All authenticated trip-data routes go through here; route handlers
// add membership/role checks on top.
const API_PROTECTED_PREFIXES = [
  "/api/places",
  "/api/ai",
  "/api/go",
  "/api/routes",
  "/api/activities",
  "/api/trips",
  "/api/days",
  "/api/blocks",
];

type RLConfig = { max: number; windowMs: number };

const RL_CONFIGS: Array<[prefix: string, cfg: RLConfig]> = [
  ["/api/ai",     { max: 20,  windowMs: 60_000 }],
  ["/api/go",     { max: 20,  windowMs: 60_000 }],
  ["/api/places", { max: 120, windowMs: 60_000 }],
  ["/api/routes", { max: 60,  windowMs: 60_000 }],
];

const rlStore = new Map<string, { count: number; resetAt: number }>();
let lastPrune = 0;

function checkRL(key: string, cfg: RLConfig): boolean {
  const now = Date.now();
  const rec = rlStore.get(key);
  if (!rec || now > rec.resetAt) {
    rlStore.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return true;
  }
  if (rec.count >= cfg.max) return false;
  rec.count++;
  return true;
}

function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 5 * 60_000) return;
  lastPrune = now;
  for (const [k, v] of rlStore) if (now > v.resetAt) rlStore.delete(k);
}

function getRLEntry(pathname: string): [string, RLConfig] | null {
  for (const [prefix, cfg] of RL_CONFIGS) {
    if (pathname.startsWith(prefix)) return [prefix, cfg];
  }
  return null;
}

// ─── Proxy handler ────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  // Refresh session — must happen before any auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── API routes: auth + rate limit ──────────────────────────────
  if (API_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized — accesso riservato agli utenti autenticati." },
        { status: 401 },
      );
    }
    const rlEntry = getRLEntry(pathname);
    if (rlEntry) {
      maybePrune();
      const [prefix, cfg] = rlEntry;
      if (!checkRL(`${user.id}:${prefix}`, cfg)) {
        return NextResponse.json(
          { error: "Troppe richieste — riprova fra un minuto." },
          { status: 429, headers: { "Retry-After": "60" } },
        );
      }
    }
    return response;
  }

  // ── Page routes: auth redirects ────────────────────────────────
  if (!user && PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

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
    // Page routes (exclude static assets, but include auth callback so session refreshes)
    "/((?!_next/static|_next/image|favicon.ico|media/|design/).*)",
    // API routes that need auth + rate limiting
    "/api/places/:path*",
    "/api/ai/:path*",
    "/api/go/:path*",
    "/api/routes",
  ],
};
