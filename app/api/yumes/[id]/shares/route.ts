/**
 * /api/yumes/[id]/shares — share a yume with a trip (owner only).
 *   POST body: { trip_id } → makes the yume visible to that trip's members.
 */
import { route, readJson, ok } from "@/lib/api";
import { requireActivityOwner } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

export const POST = route<{ id: string }>(async ({ req, params }) => {
  await requireActivityOwner(params.id);
  const body = await readJson<{ trip_id?: unknown }>(req);
  const services = await serverServices();
  await services.yumes.shareToTrip(params.id, body.trip_id);
  return ok(null);
});
