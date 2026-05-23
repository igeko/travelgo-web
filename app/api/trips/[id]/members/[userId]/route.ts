import { route, ok, readJson, badRequest } from "@/lib/api";
import { requireTripEditor } from "@/lib/api/guards";
import { serviceServices } from "@/lib/services";
import type { MemberRole } from "@/lib/dal";

const ROLES: readonly MemberRole[] = ["owner", "editor", "viewer"];

/** PATCH /api/trips/[id]/members/[userId] — change a member's role. */
export const PATCH = route<{ id: string; userId: string }>(async ({ req, params }) => {
  await requireTripEditor(params.id);
  const body = await readJson<{ role?: unknown }>(req);
  if (!ROLES.includes(body.role as MemberRole)) throw badRequest("Invalid role");
  // Guard authorized an editor; bypass member-managing RLS with service role.
  const services = serviceServices();
  await services.members.setMemberRole(params.id, params.userId, body.role as MemberRole);
  return ok(null);
});

/** DELETE /api/trips/[id]/members/[userId] — remove a member. */
export const DELETE = route<{ id: string; userId: string }>(async ({ params }) => {
  await requireTripEditor(params.id);
  const services = serviceServices();
  await services.members.removeMember(params.id, params.userId);
  return ok(null);
});
