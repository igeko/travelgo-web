import { revalidatePath } from "next/cache";
import { route, readJson, ok } from "@/lib/api";
import { requireStayEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";
import type { UpdateStayInput } from "@/lib/dal";

async function revalidateTripForStay(stayId: string): Promise<void> {
  const dal = await serverDal();
  const tripId = await dal.accommodations.tripIdOfStay(stayId);
  if (!tripId) return;
  revalidatePath(`/trips/${tripId}/explore-next`);
  revalidatePath(`/trips/${tripId}/explore`);
  revalidatePath(`/trips/${tripId}`);
}

/** PATCH /api/accommodation-stays/[id] — update booking fields, check-in/out, notes. */
export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  await requireStayEditor(params.id);
  const body = await readJson<UpdateStayInput>(req);
  const services = await serverServices();
  const updated = await services.accommodations.update(params.id, body);
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
