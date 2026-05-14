import { getServerClient } from "@/lib/dal/supabase";
import { NextResponse } from "next/server";

/**
 * Verifica che l'utente loggato sia editor o owner del viaggio indicato.
 * Ritorna { ok: true } oppure { ok: false, response: NextResponse 401/403 }.
 */
export async function requireTripEditor(tripId: string) {
  const supabase = await getServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .in("role", ["owner", "editor"])
    .maybeSingle();

  if (!data) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

/**
 * Risolve il trip_id di una activity e verifica il ruolo editor.
 */
export async function requireActivityEditor(activityId: string) {
  const supabase = await getServerClient();

  const { data: activity } = await supabase
    .from("activities")
    .select("trip_id")
    .eq("id", activityId)
    .maybeSingle();

  if (!activity) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return requireTripEditor(activity.trip_id);
}

/**
 * Risolve il trip_id di un day e verifica il ruolo editor.
 */
export async function requireDayEditor(dayId: string) {
  const supabase = await getServerClient();

  const { data: day } = await supabase
    .from("days")
    .select("trip_id")
    .eq("id", dayId)
    .maybeSingle();

  if (!day) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return requireTripEditor(day.trip_id);
}
