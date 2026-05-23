/**
 * /api/yumes/[id]/shares/[tripId] — stop sharing a yume with a trip (owner only).
 *   DELETE
 */
import { route, ok } from "@/lib/api";
import { requireActivityOwner } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

export const DELETE = route<{ id: string; tripId: string }>(async ({ params }) => {
  await requireActivityOwner(params.id);
  const services = await serverServices();
  await services.yumes.unshareFromTrip(params.id, params.tripId);
  return ok(null);
});
