import { revalidatePath } from "next/cache";
import { route, ok } from "@/lib/api";
import { requireStayEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";

/**
 * POST /api/accommodation-stays/[id]/convert-to-stop
 *
 * Cross-table conversion (Sleep → Stop): drop the stay (and its nights
 * via cascade), and insert a single scheduled_activities row on the
 * stay's check-in day, reusing the same Property activity.
 *
 * NOTE: extra nights of multi-night stays are silently lost — the UI
 * must confirm with the user before calling this.
 */
export const POST = route<{ id: string }>(async ({ params }) => {
  await requireStayEditor(params.id);
  const dal = await serverDal();
  const tripId = await dal.accommodations.tripIdOfStay(params.id);

  const services = await serverServices();
  const result = await services.accommodations.convertStayToScheduled(params.id);

  if (tripId) {
    revalidatePath(`/trips/${tripId}/explore-next`);
    revalidatePath(`/trips/${tripId}/explore`);
    revalidatePath(`/trips/${tripId}`);
  }
  return ok(result);
});
