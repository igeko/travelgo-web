import { getServerClient } from "@/lib/dal/supabase";
import { NextResponse } from "next/server";

export const ADMIN_ROLES = ["admin"] as const;
export const TESTER_ROLES = ["admin", "dev", "tester"] as const;

const EDITOR_ROLES = ["owner", "editor"] as const;
const MEMBER_ROLES = ["owner", "editor", "viewer"] as const;

type AuthOk = { ok: true; userId: string };
type AuthErr = { ok: false; response: NextResponse };
type AuthResult = AuthOk | AuthErr;

async function checkTripRole(
  tripId: string,
  allowed: readonly string[],
): Promise<AuthResult> {
  const supabase = await getServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .in("role", allowed as unknown as string[])
    .maybeSingle();

  if (!data) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, userId: user.id };
}

/**
 * Verifica che l'utente loggato sia editor o owner del viaggio indicato.
 * Ritorna { ok: true } oppure { ok: false, response: NextResponse 401/403 }.
 */
export function requireTripEditor(tripId: string): Promise<AuthResult> {
  return checkTripRole(tripId, EDITOR_ROLES);
}

/**
 * Verifica che l'utente loggato sia membro (owner/editor/viewer) del viaggio.
 * Da usare nelle GET trip-scoped per impedire IDOR.
 */
export function requireTripMember(tripId: string): Promise<AuthResult> {
  return checkTripRole(tripId, MEMBER_ROLES);
}

async function resolveActivityTripId(activityId: string): Promise<string | null> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("activities")
    .select("trip_id")
    .eq("id", activityId)
    .maybeSingle();
  return data?.trip_id ?? null;
}

async function resolveDayTripId(dayId: string): Promise<string | null> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("days")
    .select("trip_id")
    .eq("id", dayId)
    .maybeSingle();
  return data?.trip_id ?? null;
}

async function resolveDayActivityDayId(dayActivityId: string): Promise<string | null> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("day_activities")
    .select("day_id")
    .eq("id", dayActivityId)
    .maybeSingle();
  return data?.day_id ?? null;
}

function notFound(): AuthErr {
  return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
}

export async function requireActivityEditor(activityId: string): Promise<AuthResult> {
  const tripId = await resolveActivityTripId(activityId);
  if (!tripId) return notFound();
  return requireTripEditor(tripId);
}

export async function requireActivityMember(activityId: string): Promise<AuthResult> {
  const tripId = await resolveActivityTripId(activityId);
  if (!tripId) return notFound();
  return requireTripMember(tripId);
}

export async function requireDayEditor(dayId: string): Promise<AuthResult> {
  const tripId = await resolveDayTripId(dayId);
  if (!tripId) return notFound();
  return requireTripEditor(tripId);
}

export async function requireDayMember(dayId: string): Promise<AuthResult> {
  const tripId = await resolveDayTripId(dayId);
  if (!tripId) return notFound();
  return requireTripMember(tripId);
}

export async function requireDayActivityEditor(dayActivityId: string): Promise<AuthResult> {
  const dayId = await resolveDayActivityDayId(dayActivityId);
  if (!dayId) return notFound();
  return requireDayEditor(dayId);
}

export async function requireDayActivityMember(dayActivityId: string): Promise<AuthResult> {
  const dayId = await resolveDayActivityDayId(dayActivityId);
  if (!dayId) return notFound();
  return requireDayMember(dayId);
}

/**
 * Returns ok if the current user has the `admin` platform role.
 * Replaces the legacy `platform_admins` lookup.
 */
export async function requirePlatformAdmin(): Promise<AuthResult> {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data } = await supabase
    .from("user_platform_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}
