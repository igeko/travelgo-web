/**
 * lib/api/guards.ts
 * ─────────────────────────────────────────────────────────────────
 * Authorization guards. Each resolves the resource → trip → role and
 * throws an ApiError (401/403/404) on failure, or returns the caller's
 * userId on success. Used inside route handlers / services.
 * ─────────────────────────────────────────────────────────────────
 */

import { serverDal, serviceDal, type Dal } from "@/lib/dal";
import { unauthorized, forbidden, notFound } from "./errors";

/** Highest-privilege platform roles. */
export const ADMIN_ROLES = ["admin", "dev"] as const;
/** Roles allowed to submit/read tester notes (includes ADMIN_ROLES). */
export const TESTER_ROLES = ["admin", "dev", "tester"] as const;

const EDITOR_ROLES = ["owner", "editor"] as const;
const MEMBER_ROLES = ["owner", "editor", "viewer"] as const;

export type AuthContext = { userId: string };

async function currentUserId(dal: Dal): Promise<string> {
  const { data: user } = await dal.users.getCurrentUser();
  if (!user) throw unauthorized();
  return user.id;
}

/** Require the current user to be logged in (no resource scope). */
export async function requireUser(): Promise<AuthContext> {
  const dal = await serverDal();
  return { userId: await currentUserId(dal) };
}

// ── Trip-scoped ───────────────────────────────────────────────────

async function requireTripRole(
  tripId: string,
  allowed: readonly string[],
): Promise<AuthContext> {
  const dal = await serverDal();
  const userId = await currentUserId(dal);
  const role = await dal.members.roleInTrip(tripId, userId, allowed);
  if (!role) throw forbidden();
  return { userId };
}

export const requireTripEditor = (tripId: string) => requireTripRole(tripId, EDITOR_ROLES);
export const requireTripMember = (tripId: string) => requireTripRole(tripId, MEMBER_ROLES);

// ── Day-scoped ────────────────────────────────────────────────────

async function tripIdForDayOr404(dayId: string): Promise<string> {
  const dal = await serverDal();
  const tripId = await dal.trips.tripIdForDay(dayId);
  if (!tripId) throw notFound();
  return tripId;
}

export const requireDayEditor = async (dayId: string) =>
  requireTripEditor(await tripIdForDayOr404(dayId));
export const requireDayMember = async (dayId: string) =>
  requireTripMember(await tripIdForDayOr404(dayId));

// ── Activity-scoped (entity) ──────────────────────────────────────

async function tripIdForActivityOr404(activityId: string): Promise<string> {
  const dal = await serverDal();
  const tripId = await dal.activities.tripIdForActivity(activityId);
  if (!tripId) throw notFound();
  return tripId;
}

export const requireActivityEditor = async (activityId: string) =>
  requireTripEditor(await tripIdForActivityOr404(activityId));
export const requireActivityMember = async (activityId: string) =>
  requireTripMember(await tripIdForActivityOr404(activityId));

// ── Scheduled-activity-scoped (instance) ──────────────────────────

async function dayIdForScheduledOr404(scheduledId: string): Promise<string> {
  const dal = await serverDal();
  const dayId = await dal.trips.dayIdForScheduled(scheduledId);
  if (!dayId) throw notFound();
  return dayId;
}

export const requireScheduledEditor = async (scheduledId: string) =>
  requireDayEditor(await dayIdForScheduledOr404(scheduledId));
export const requireScheduledMember = async (scheduledId: string) =>
  requireDayMember(await dayIdForScheduledOr404(scheduledId));

// ── Platform-scoped ───────────────────────────────────────────────

/** Require a platform role from `allowed`; returns the user's full role set. */
async function requirePlatformRole(
  allowed: readonly string[],
): Promise<AuthContext & { roles: string[] }> {
  const dal = await serverDal();
  const userId = await currentUserId(dal);
  const roles = await serviceDal().users.getPlatformRoles(userId);
  if (!roles.some((r) => allowed.includes(r))) throw forbidden();
  return { userId, roles };
}

export const requirePlatformAdmin = () => requirePlatformRole(ADMIN_ROLES);
export const requirePlatformTester = () => requirePlatformRole(TESTER_ROLES);
