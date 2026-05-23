import { route, ok } from "@/lib/api";
import { requireTripEditor } from "@/lib/api/guards";
import { serviceServices } from "@/lib/services";

/** DELETE /api/trips/[id]/invites/[inviteId] — revoke a pending invite. */
export const DELETE = route<{ id: string; inviteId: string }>(async ({ params }) => {
  await requireTripEditor(params.id);
  const services = serviceServices();
  await services.members.deleteInvite(params.id, params.inviteId);
  return ok(null);
});
