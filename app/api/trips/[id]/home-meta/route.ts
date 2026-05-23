import { getLocale } from "next-intl/server";
import { route, ok, queryParam } from "@/lib/api";
import { requireTripMember } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

/**
 * GET /api/trips/[id]/home-meta?locale=it
 *
 * AI-resolved Trip Home content (boarding section for now: country, airport,
 * welcome) projected for a locale. Cached on the trip; generated on a miss.
 */
export const GET = route<{ id: string }>(async ({ req, params }) => {
  await requireTripMember(params.id);
  const locale = queryParam(req, "locale") ?? (await getLocale());
  const services = await serverServices();
  return ok(await services.trips.getHomeMeta(params.id, locale));
});
