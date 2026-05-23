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

/**
 * Authorize an action on an activity *entity*, now that activities are
 * decoupled from trips. Access is granted when the caller is the entity
 * owner (`created_by`) OR holds an allowed role in any trip the activity is
 * reachable through (scheduled trips + the legacy trip_id during the
 * transition). Ground truth is read with the service-role DAL so RLS can't
 * mask a trip the user actually belongs to.
 */
async function requireActivityRole(
  activityId: string,
  allowed: readonly string[],
): Promise<AuthContext> {
  const dal = await serverDal();
  const userId = await currentUserId(dal);

  const ctx = await serviceDal().activities.authzContext(activityId);
  if (!ctx) throw notFound();

  // The creator can always act on their own entity.
  if (ctx.createdBy === userId) return { userId };

  for (const tripId of ctx.tripIds) {
    if (await dal.members.roleInTrip(tripId, userId, allowed)) return { userId };
  }
  throw forbidden();
}

export const requireActivityEditor = (activityId: string) =>
  requireActivityRole(activityId, EDITOR_ROLES);
export const requireActivityMember = (activityId: string) =>
  requireActivityRole(activityId, MEMBER_ROLES);

/**
 * Require the caller to be the activity's creator (owner). Used for yume
 * ownership operations (visibility, sharing, removal) where trip-editor
 * access is not enough.
 */
export async function requireActivityOwner(activityId: string): Promise<AuthContext> {
  const dal = await serverDal();
  const userId = await currentUserId(dal);
  const ctx = await serviceDal().activities.authzContext(activityId);
  if (!ctx) throw notFound();
  if (ctx.createdBy !== userId) throw forbidden();
  return { userId };
}

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
