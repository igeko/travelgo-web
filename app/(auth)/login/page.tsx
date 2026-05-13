"use client";

/**
 * app/(auth)/login/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Login page — Google OAuth redirect flow.
 * ─────────────────────────────────────────────────────────────────
 */

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getBrowserClient } from "@/lib/dal/supabase";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/trips";
  const hasError = searchParams.get("error") === "auth_callback_failed";

  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = getBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // After this the browser redirects to Google — no need to setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">

        {/* Brand */}
        <div className="flex items-center gap-[10px] justify-center mb-10">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[22px] leading-none select-none"
            style={{
              background: "var(--color-ink)",
              fontFamily: '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif',
              fontWeight: 500,
            }}
            aria-hidden
          >
            五
          </span>
          <span
            className="text-[13px] text-ink-faint font-normal leading-tight"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
          >
            Travel<b className="text-ink font-medium">Go</b>
          </span>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-lg border border-border px-8 py-10">
          <h1 className="text-[20px] font-semibold text-ink text-center mb-1">
            Welcome back
          </h1>
          <p className="text-[13px] text-ink-soft text-center mb-8">
            Sign in to continue planning your trip
          </p>

          {/* Error banner */}
          {hasError && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-orange-soft border border-orange-border text-[13px] text-orange-deep text-center">
              Sign-in failed. Please try again.
            </div>
          )}

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-surface hover:bg-surface-soft transition-colors text-[14px] font-medium text-ink cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-ink-faint border-t-ink animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>

          <p className="mt-8 text-center text-[11px] text-ink-faint leading-relaxed">
            By continuing you agree to our{" "}
            <a href="/terms" className="underline hover:text-ink-soft">Terms</a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-ink-soft">Privacy Policy</a>.
          </p>
        </div>

      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
