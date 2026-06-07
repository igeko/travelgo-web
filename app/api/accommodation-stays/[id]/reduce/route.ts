import { revalidatePath } from "next/cache";
import { route, ok } from "@/lib/api";
import { requireStayEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";

/**
 * POST /api/accommodation-stays/[id]/reduce — −1 night (check_out -= 1).
 * Returns the updated stay, or null if the stay was a single night and
 * has now been deleted entirely.
 */
export const POST = route<{ id: string }>(async ({ params }) => {
  await requireStayEditor(params.id);
  // Resolve trip BEFORE the mutation in case the stay collapses to zero.
  const dal = await serverDal();
  const tripId = await dal.accommodations.tripIdOfStay(params.id);

  const services = await serverServices();
  const stay = await services.accommodations.reduceStay(params.id);

  if (tripId) {
    revalidatePath(`/trips/${tripId}/explore-next`);
    revalidatePath(`/trips/${tripId}/explore`);
    revalidatePath(`/trips/${tripId}`);
  }
  return ok(stay);
});
