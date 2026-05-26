import { route, ok, readJson } from "@/lib/api";
import { requireTripMember, requireTripEditor, requireTripOwner } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";
import type { UpdateTripPatch } from "@/lib/services";

/** GET /api/trips/[id] — full trip snapshot (days + activities). */
export const GET = route<{ id: string }>(async ({ params }) => {
  await requireTripMember(params.id);
  const services = await serverServices();
  return ok(await services.trips.getSnapshot(params.id));
});

/** PATCH /api/trips/[id] — edit trip fields; reconciles days if the range moved. */
export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  await requireTripEditor(params.id);
  const patch = await readJson<UpdateTripPatch>(req);
  const services = await serverServices();
  return ok(await services.trips.update(params.id, patch));
});

/** DELETE /api/trips/[id] — delete the trip (owner only; cascades). */
export const DELETE = route<{ id: string }>(async ({ params }) => {
  await requireTripOwner(params.id);
  const services = await serverServices();
  await services.trips.delete(params.id);
  return ok({ deleted: true });
});
