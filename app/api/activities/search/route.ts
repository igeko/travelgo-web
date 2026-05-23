/**
 * GET /api/activities/search?trip_id=X&day_id=Y&q=tsukiji
 * → { data: { wishlist: Activity[], platform: Activity[] } }
 */
import { route, queryParam, ok } from "@/lib/api";
import { requireTripMember } from "@/lib/api/guards";
import { badRequest } from "@/lib/api/errors";
import { serverServices } from "@/lib/services";

export const GET = route(async ({ req }) => {
  const tripId = queryParam(req, "trip_id");
  if (!tripId) throw badRequest("trip_id required");

  await requireTripMember(tripId);

  const dayId = queryParam(req, "day_id");
  const q = queryParam(req, "q") ?? "";

  const services = await serverServices();
  return ok(await services.yumes.search({ tripId, dayId, query: q }));
});
