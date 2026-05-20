import { route, ok } from "@/lib/api";
import { requireTripMember } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

/** GET /api/trips/[id] — full trip snapshot (days + activities). */
export const GET = route<{ id: string }>(async ({ params }) => {
  await requireTripMember(params.id);
  const services = await serverServices();
  return ok(await services.trips.getSnapshot(params.id));
});
