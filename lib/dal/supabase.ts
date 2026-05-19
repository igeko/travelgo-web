/**
 * lib/dal/supabase.ts
 * ─────────────────────────────────────────────────────────────────
 * Supabase client factory.
 *
 * Three clients:
 *  • getBrowserClient()  — Client Components (anon key, respects RLS)
 *  • getServerClient()   — Server Components / Route Handlers / Server
 *                          Actions; reads the auth session from cookies
 *  • getServiceClient()  — Route Handlers that need to bypass RLS after
 *                          they've explicitly checked auth + authorization
 *                          themselves (e.g. tester-notes admin views, trip
 *                          create flow). Centralised here so only one
 *                          place imports SUPABASE_SERVICE_ROLE_KEY.
 * ─────────────────────────────────────────────────────────────────
 */

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — check your .env.local",
    );
  }
  return { url, key };
}

/**
 * Browser-side Supabase client — uses @supabase/ssr so the PKCE
 * code verifier is stored in cookies (not localStorage), making it
 * accessible to the server-side callback handler.
 */
export function getBrowserClient() {
  const { url, key } = getEnv();
  return createBrowserClient(url, key);
}

/**
 * Server-side Supabase client.
 * Must only be called in a server context (RSC / Route Handler / Server Action).
 * Reads the auth session from cookies so RLS works correctly.
 */
export async function getServerClient() {
  const { url, key } = getEnv();
  // Dynamically imported to avoid bundling next/headers in client code.
  const { cookies } = await import("next/headers");
  const { createServerClient } = await import("@supabase/ssr");

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Route Handler context — set is not always available
        }
      },
    },
  });
}

export type SupabaseClient = Awaited<ReturnType<typeof getServerClient>>;

/**
 * Service-role client. Bypasses RLS — callers must verify auth and
 * authorization BEFORE invoking this. Server-only.
 */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for service client",
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
