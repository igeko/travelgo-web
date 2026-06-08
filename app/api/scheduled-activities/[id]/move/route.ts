import { revalidatePath } from "next/cache";
import { route, readJson, ok } from "@/lib/api";
import { badRequest } from "@/lib/api/errors";
import { requireScheduledEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";

type MoveBody = { direction?: "up" | "down" };

/**
 * POST /api/scheduled-activities/[id]/move — move the occurrence one slot
 * up or down. Intra-day = swap with the adjacent activity; cross-day on
 * border = jump to the start/end of the adjacent day. Bridges are
 * recomputed around the moved activity.
 */
export const POST = route<{ id: string }>(async ({ req, params }) => {
  await requireScheduledEditor(params.id);

  const body = await readJson<MoveBody>(req);
  const direction = body?.direction;
  if (direction !== "up" && direction !== "down") {
    throw badRequest("direction must be 'up' or 'down'");
  }

  // Resolve the trip BEFORE the move — the day might change cross-day.
  const dal = await serverDal();
  const dayId = await dal.trips.dayIdForScheduled(params.id);
  const tripId = dayId ? await dal.trips.tripIdForDay(dayId) : null;

  const services = await serverServices();
  await services.trips.moveOneSlot(params.id, direction);

  if (tripId) {
    revalidatePath(`/trips/${tripId}/explore-next`);
    revalidatePath(`/trips/${tripId}/explore`);
    revalidatePath(`/trips/${tripId}`);
  }
  return ok(null);
});
