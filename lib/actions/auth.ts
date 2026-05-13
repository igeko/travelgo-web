/**
 * lib/actions/auth.ts
 * ─────────────────────────────────────────────────────────────────
 * Server Actions for auth operations that need server-side execution.
 * ─────────────────────────────────────────────────────────────────
 */

"use server";

import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/dal/supabase";

/** Sign out the current user and redirect to /login. */
export async function signOut() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
