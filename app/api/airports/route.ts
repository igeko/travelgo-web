import { route, ok, queryParam } from "@/lib/api";
import { requireUser } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";

/**
 * GET /api/airports?q=tok — search the airport reference table
 * (IATA / name / city). Returns up to 8 ranked matches.
 */
export const GET = route(async ({ req }) => {
  await requireUser();
  const q = queryParam(req, "q") ?? "";
  const dal = await serverDal();
  const { data, error } = await dal.airports.search(q);
  if (error) throw error;
  return ok(data);
});
