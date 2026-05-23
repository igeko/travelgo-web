import { route, ok, readJson, badRequest } from "@/lib/api";
import { requireTripMember, requireTripEditor } from "@/lib/api/guards";
import { serverServices, serviceServices } from "@/lib/services";
import type { InviteRole } from "@/lib/dal";

const INVITE_ROLES: readonly InviteRole[] = ["editor", "viewer"];

/** GET /api/trips/[id]/invites — pending invites. */
export const GET = route<{ id: string }>(async ({ params }) => {
  await requireTripMember(params.id);
  const services = await serverServices();
  return ok(await services.members.listInvites(params.id));
});

/** POST /api/trips/[id]/invites — create a pending invite (no email sent). */
export const POST = route<{ id: string }>(async ({ req, params }) => {
  await requireTripEditor(params.id);
  const body = await readJson<{ email?: unknown; role?: unknown }>(req);
  if (typeof body.email !== "string") throw badRequest("Email is required");
  if (!INVITE_ROLES.includes(body.role as InviteRole)) throw badRequest("Invalid role");
  // Guard authorized an editor; bypass invite-managing RLS with service role.
  const services = serviceServices();
  return ok(await services.members.createInvite(params.id, body.email, body.role as InviteRole));
});
