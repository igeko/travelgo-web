/**
 * lib/client/auth.ts — frontend client for browser-side auth.
 *
 * Wraps the (currently Supabase) browser auth SDK so components never
 * import `getBrowserClient` or call `supabase.auth.*` directly. Only the
 * browser OAuth redirect lives here; server-side auth (callback exchange,
 * getUser in RSC) stays on the server via the DAL's server client.
 */
import { getBrowserClient } from "@/lib/dal/supabase";

export const auth = {
  /**
   * Start the Google OAuth redirect flow. `redirectTo` is the absolute
   * callback URL to return to after consent.
   */
  signInWithGoogle: (redirectTo: string) =>
    getBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "consent" },
        skipBrowserRedirect: false,
      },
    }),
};
