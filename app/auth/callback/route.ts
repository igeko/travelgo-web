/**
 * app/auth/callback/route.ts
 * ─────────────────────────────────────────────────────────────────
 * OAuth callback handler.
 *
 * After Google redirects back here with ?code=..., Supabase exchanges
 * the code for a session and sets the auth cookies. We then redirect
 * the user to their intended destination (or /trips by default).
 * ─────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` lets us send users to a specific page post-login
  const next = searchParams.get("next") ?? "/trips";

  if (code) {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`);
  }

  console.error("[auth/callback] No code in request:", request.url);
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&reason=no_code`);
}
