import { route, readJson, ok } from "@/lib/api";
import { requireUser } from "@/lib/api/guards";
import { serverServices, serviceServices, type CreateTripRequest } from "@/lib/services";

/** GET /api/trips — the current user's trips with day counts. */
export const GET = route(async () => {
  await requireUser();
  const services = await serverServices();
  return ok(await services.trips.listSummaries());
});

/** POST /api/trips — create a trip (+ owner + generated days). */
export const POST = route(async ({ req }) => {
  const { userId } = await requireUser();
  const body = await readJson<CreateTripRequest>(req);
  // service-role: the create flow inserts the owner membership + days
  return ok(await serviceServices().trips.create(body, userId), { status: 201 });
});
