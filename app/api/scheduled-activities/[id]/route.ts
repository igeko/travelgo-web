import { revalidatePath } from "next/cache";
import { route, readJson, ok } from "@/lib/api";
import { requireScheduledEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";

/**
 * Invalidate the trip-scoped pages that render activity data so the
 * client's router.refresh() returns fresh server-rendered output. Without
 * this, Next.js's Router Cache can keep serving stale RSC payloads after
 * a mutation and the change stays invisible until a hard reload.
 */
async function revalidateTripForScheduled(scheduledId: string): Promise<void> {
  const dal = await serverDal();
  const dayId = await dal.trips.dayIdForScheduled(scheduledId);
  if (!dayId) return;
  const tripId = await dal.trips.tripIdForDay(dayId);
  if (!tripId) return;
  revalidatePath(`/trips/${tripId}/explore-next`);
  revalidatePath(`/trips/${tripId}/explore`);
  revalidatePath(`/trips/${tripId}`);
}

/** PATCH /api/scheduled-activities/[id] — update instance/timeline fields. */
export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  await requireScheduledEditor(params.id);
  const body = await readJson<Record<string, unknown>>(req);
  const services = await serverServices();
  await services.trips.updateInstance(params.id, body);
  await revalidateTripForScheduled(params.id);
  return ok(null);
});

/** DELETE /api/scheduled-activities/[id] — unschedule (entity untouched). */
export const DELETE = route<{ id: string }>(async ({ params }) => {
  await requireScheduledEditor(params.id);
  // Resolve the trip BEFORE unscheduling — once the row is gone the lookup
  // chain (scheduled → day → trip) breaks and we lose the revalidation path.
  const dal = await serverDal();
  const dayId = await dal.trips.dayIdForScheduled(params.id);
  const tripId = dayId ? await dal.trips.tripIdForDay(dayId) : null;

  const services = await serverServices();
  await services.trips.unschedule(params.id);

  if (tripId) {
    revalidatePath(`/trips/${tripId}/explore-next`);
    revalidatePath(`/trips/${tripId}/explore`);
    revalidatePath(`/trips/${tripId}`);
  }
  return ok(null);
});
