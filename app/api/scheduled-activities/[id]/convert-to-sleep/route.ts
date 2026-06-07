import { revalidatePath } from "next/cache";
import { route, ok } from "@/lib/api";
import { requireScheduledEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";

/**
 * POST /api/scheduled-activities/[id]/convert-to-sleep
 *
 * Cross-table conversion (Stop → Sleep): drop the scheduled_activities
 * row and create a 1-night accommodation_stays starting on that day,
 * reusing the same Property activity. The user can extend it with the
 * /extend endpoint afterwards.
 */
export const POST = route<{ id: string }>(async ({ params }) => {
  await requireScheduledEditor(params.id);

  // Resolve the trip BEFORE the conversion — the scheduled row will be gone.
  const dal = await serverDal();
  const dayId = await dal.trips.dayIdForScheduled(params.id);
  const tripId = dayId ? await dal.trips.tripIdForDay(dayId) : null;

  const services = await serverServices();
  const stay = await services.accommodations.convertScheduledToStay(params.id);

  if (tripId) {
    revalidatePath(`/trips/${tripId}/explore-next`);
    revalidatePath(`/trips/${tripId}/explore`);
    revalidatePath(`/trips/${tripId}`);
  }
  return ok(stay);
});
