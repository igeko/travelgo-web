/**
 * middleware.ts — API Security Guard
 *
 * Protegge tutti gli endpoint proxy verso Google e OpenAI, e le route media:
 *   /api/places/*  — Google Places / Photo
 *   /api/ai/*      — OpenAI (assistente Go v2)
 *   /api/go/*      — OpenAI (assistente Go v1 + deep-dive)
 *   /api/routes    — Google Routes
 *   /api/media/*   — import/upload media (SSRF + quota protection)
 *
 * Due livelli di difesa:
 *   1. AUTH  — verifica la sessione Supabase; 401 se non autenticato.
 *   2. RATE LIMIT — per utente autenticato, finestra di 1 minuto.
 *              ai/* + go/*  → max 20 req/min  (OpenAI è costoso)
 *              places/*     → max 120 req/min
 *              routes       → max 60 req/min
 *
 * Nota sull'in-memory store: funziona perfettamente in locale e su
 * istanze singole (self-hosted, single-region). Su Vercel Edge ogni
 * worker ha il suo Map separato — la protezione rimane valida contro
 * burst rapidi, ma per rate limiting globale multi-region sostituire
 * con Upstash Redis (@upstash/ratelimit).
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// ─── Rate-limit store ────────────────────────────────────────────
const rlStore = new Map<string, { count: number; resetAt: number }>();

type RLConfig = { max: number; windowMs: number };

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

// Pulizia periodica per evitare memory leak (ogni 5 min)
let lastPrune = 0;
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 5 * 60_000) return;
  lastPrune = now;
  for (const [k, v] of rlStore) if (now > v.resetAt) rlStore.delete(k);
}

// ─── Configurazione ──────────────────────────────────────────────
const PROTECTED_PREFIXES = ["/api/places", "/api/ai", "/api/go", "/api/routes", "/api/media"];

const RL_CONFIGS: Array<[prefix: string, cfg: RLConfig]> = [
  ["/api/ai",     { max: 20,  windowMs: 60_000 }], // OpenAI — costoso
  ["/api/go",     { max: 20,  windowMs: 60_000 }], // OpenAI — costoso
  ["/api/places", { max: 120, windowMs: 60_000 }], // Google Places
  ["/api/routes", { max: 60,  windowMs: 60_000 }], // Google Routes
  ["/api/media",  { max: 30,  windowMs: 60_000 }], // Upload/import media
];

function getRLEntry(pathname: string): [string, RLConfig] | null {
  for (const [prefix, cfg] of RL_CONFIGS) {
    if (pathname.startsWith(prefix)) return [prefix, cfg];
  }
  return null;
}

// ─── Middleware ───────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Solo le route protette
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Costruiamo la risposta di pass-through (usata anche per propagare
  // i cookie di sessione aggiornati da Supabase).
  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          // Aggiorna i cookie sul request object e poi ricostruisce la
          // response in modo che il browser riceva i cookie refreshati.
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() verifica il JWT lato server — non fidarsi solo del cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized — accesso riservato agli utenti autenticati." },
      { status: 401 },
    );
  }

  // Rate limiting per utente
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

  return supabaseResponse;
}

// ─── Matcher ─────────────────────────────────────────────────────
// Includiamo solo le route effettivamente esposte.
// Le route trips/*, me/*, tester-notes/* hanno già la propria auth
// granulare (requireTripEditor ecc.) e non vengono toccate qui.
export const config = {
  matcher: [
    "/api/places/:path*",
    "/api/ai/:path*",
    "/api/go/:path*",
    "/api/routes",
    "/api/media/:path*",
  ],
};
