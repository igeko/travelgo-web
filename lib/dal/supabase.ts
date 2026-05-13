/**
 * lib/dal/supabase.ts
 * ─────────────────────────────────────────────────────────────────
 * Supabase client factory.
 *
 * Two clients:
 *  • createBrowserClient()  — for Client Components (uses anon key,
 *    respects RLS, auth state from cookies)
 *  • createServerClient()   — for Server Components, Route Handlers,
 *    and Server Actions (reads cookies server-side)
 *
 * The service-role client is NOT exported here — it should only be
 * instantiated inside Route Handlers that explicitly need it (e.g.
 * accepting an invite), keeping the blast radius small.
 * ─────────────────────────────────────────────────────────────────
 */

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
 * Browser-side Supabase client (singleton).
 * Safe to call multiple times — returns the same instance.
 */
export function getBrowserClient() {
  const { url, key } = getEnv();
  return createClient(url, key);
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
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}

export type SupabaseClient = Awaited<ReturnType<typeof getServerClient>>;
