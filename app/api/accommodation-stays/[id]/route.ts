import { revalidatePath } from "next/cache";
import { route, readJson, ok } from "@/lib/api";
import { requireStayEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";
import type { UpdateStayInput } from "@/lib/dal";
import type { LodgingPropertyPatch } from "@/lib/services/AccommodationService";

async function revalidateTripForStay(stayId: string): Promise<void> {
  const dal = await serverDal();
  const tripId = await dal.accommodations.tripIdOfStay(stayId);
  if (!tripId) return;
  revalidatePath(`/trips/${tripId}/explore-next`);
  revalidatePath(`/trips/${tripId}/explore`);
  revalidatePath(`/trips/${tripId}`);
}

/**
 * PATCH /api/accommodation-stays/[id]
 *
 * Update combinato: campi della stay (booking_status, cost, check_in_time,
 * notes) + campi della Property activity (name, icon, address, place,
 * url). Il client manda un singolo payload `{ stay?, property? }`; il
 * service applica i due update separati lasciando trasparente al client
 * la duplice tabella.
 *
 * Retrocompatibilità: se il body NON ha né `stay` né `property` (es. una
 * chiamata vecchia che mandava UpdateStayInput piatto), trattiamo
 * l'intero body come `stay` per non rompere chiamate esistenti.
 */
type LodgingPatchBody =
  | { stay?: UpdateStayInput; property?: LodgingPropertyPatch }
  | UpdateStayInput;

export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  await requireStayEditor(params.id);
  const raw = await readJson<LodgingPatchBody>(req);
  const body = raw && ("stay" in raw || "property" in raw)
    ? raw as { stay?: UpdateStayInput; property?: LodgingPropertyPatch }
    : { stay: raw as UpdateStayInput };
  const services = await serverServices();
  const updated = await services.accommodations.updateWithProperty(params.id, body);
  await revalidateTripForStay(params.id);
  return ok(updated);
});

/** DELETE /api/accommodation-stays/[id] — drop the stay (nights cascade). */
export const DELETE = route<{ id: string }>(async ({ params }) => {
  await requireStayEditor(params.id);
  // Resolve trip BEFORE deleting — once gone, the lookup chain breaks.
  const dal = await serverDal();
  const tripId = await dal.accommodations.tripIdOfStay(params.id);

  const services = await serverServices();
  await services.accommodations.delete(params.id);

  if (tripId) {
    revalidatePath(`/trips/${tripId}/explore-next`);
    revalidatePath(`/trips/${tripId}/explore`);
    revalidatePath(`/trips/${tripId}`);
  }
  return ok(null);
});
