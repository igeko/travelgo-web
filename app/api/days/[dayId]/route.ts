import { route, readJson, ok } from "@/lib/api";
import { requireDayEditor } from "@/lib/api/guards";
import { badRequest } from "@/lib/api/errors";
import { pickFields, safeHttpUrl } from "@/lib/api/validation";
import { serverServices } from "@/lib/services";

const ALLOWED_DAY_FIELDS = [
  "show_map", "city", "label", "day_type", "notes", "summary",
  "accommodation_type", "accommodation_name", "accommodation_address",
  "accommodation_url", "accommodation_notes",
  "accommodation_place_id", "accommodation_lat", "accommodation_lng",
  "accommodation_cost_amount", "accommodation_cost_currency", "accommodation_cost_paid",
  "image_url", "narrative",
] as const;

const URL_FIELDS = new Set(["accommodation_url", "image_url"]);

/** PATCH /api/days/[dayId] — update day metadata. */
export const PATCH = route<{ dayId: string }>(async ({ req, params }) => {
  await requireDayEditor(params.dayId);

  const body = await readJson(req);
  const patch = pickFields(body, ALLOWED_DAY_FIELDS);

  for (const key of URL_FIELDS) {
    const value = patch[key as keyof typeof patch];
    if (key in patch && value != null && value !== "") {
      const safe = safeHttpUrl(value);
      if (!safe) throw badRequest(`Invalid URL in ${key}`);
      patch[key as keyof typeof patch] = safe;
    }
  }

  if (Object.keys(patch).length === 0) throw badRequest("No valid fields to update");

  const services = await serverServices();
  await services.trips.updateDay(params.dayId, patch as Record<string, unknown>);
  return ok(null);
});
