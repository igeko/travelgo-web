import { revalidatePath } from "next/cache";
import { route, readJson, ok } from "@/lib/api";
import { badRequest } from "@/lib/api/errors";
import { requireScheduledEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";

type MoveToBody = { dayId?: string; position?: number };

/**
 * POST /api/scheduled-activities/[id]/move-to — drag&drop endpoint.
 *
 * Body: { dayId, position } where position is the **0-based target index**
 * on dayId (clamped server-side). Intra-day = pure reorder; cross-day =
 * moveToDay + reorder. Bridges recomputed around the new position.
 */
export const POST = route<{ id: string }>(async ({ req, params }) => {
  await requireScheduledEditor(params.id);

  const body = await readJson<MoveToBody>(req);
  const dayId = body?.dayId;
  const position = body?.position;
  if (typeof dayId !== "string" || dayId.length === 0) {
    throw badRequest("dayId is required");
  }
  if (typeof position !== "number" || !Number.isFinite(position)) {
    throw badRequest("position must be a finite number");
  }

  // Resolve trip BEFORE the move — the source day might no longer hold the
  // activity after cross-day.
  const dal = await serverDal();
  const fromDayId = await dal.trips.dayIdForScheduled(params.id);
  const tripId = fromDayId ? await dal.trips.tripIdForDay(fromDayId) : null;

  const services = await serverServices();
  await services.trips.moveToPosition(params.id, dayId, position);

  if (tripId) {
    revalidatePath(`/trips/${tripId}/explore-next`);
    revalidatePath(`/trips/${tripId}/explore`);
    revalidatePath(`/trips/${tripId}`);
  }
  return ok(null);
});
