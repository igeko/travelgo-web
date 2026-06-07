import { route, readJson, ok } from "@/lib/api";
import { badRequest } from "@/lib/api/errors";
import { requireTripEditor } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";
import type { AddPlaceInput, AddPlaceContext, AddPlaceResult } from "@/lib/services/TripService";

type AddPlaceBody = {
  place?: Partial<AddPlaceInput> & Record<string, unknown>;
  selectedDayId?: string | null;
  selectedActivityId?: string | null;
};

/**
 * POST /api/trips/[id]/add-place
 *
 * Single-roundtrip endpoint for the Explore "Add to trip" CTA. Runs the
 * Add-to-Trip algorithm (brief 06), persists the new scheduled activity,
 * and recomputes the bridges that span the insertion point.
 *
 * Body: { place: AddPlaceInput, selectedDayId?, selectedActivityId? }
 * Reply: AddPlaceResult ({ scheduledActivity, position, warnings }).
 */
export const POST = route<{ id: string }>(async ({ req, params }) => {
  await requireTripEditor(params.id);
  const body = await readJson<AddPlaceBody>(req);

  const raw = body.place;
  if (!raw || typeof raw !== "object") throw badRequest("Missing place payload");
  if (typeof raw.title !== "string" || !raw.title.trim()) throw badRequest("place.title is required");
  if (typeof raw.lat !== "number" || typeof raw.lng !== "number") {
    throw badRequest("place.lat and place.lng are required numbers");
  }

  const place: AddPlaceInput = {
    placeId: typeof raw.placeId === "string" ? raw.placeId : null,
    title: raw.title.trim(),
    lat: raw.lat,
    lng: raw.lng,
    categories: Array.isArray(raw.categories)
      ? raw.categories.filter((c): c is string => typeof c === "string")
      : undefined,
    durationHintMin:
      typeof raw.durationHintMin === "number" && raw.durationHintMin > 0
        ? raw.durationHintMin
        : null,
    isAccommodation: raw.isAccommodation === true,
  };

  const context: AddPlaceContext = {
    selectedDayId: typeof body.selectedDayId === "string" ? body.selectedDayId : null,
    selectedActivityId: typeof body.selectedActivityId === "string" ? body.selectedActivityId : null,
  };

  const services = await serverServices();
  const result: AddPlaceResult = await services.trips.addPlace(params.id, place, context);
  return ok(result, { status: 201 });
});
