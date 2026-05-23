import { route, readJson, ok } from "@/lib/api";
import { requireScheduledEditor } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

/** PATCH /api/scheduled-activities/[id] — update instance/timeline fields. */
export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  await requireScheduledEditor(params.id);
  const body = await readJson<Record<string, unknown>>(req);
  const services = await serverServices();
  await services.scheduler.updateInstance(params.id, body);
  return ok(null);
});

/** DELETE /api/scheduled-activities/[id] — unschedule (entity untouched). */
export const DELETE = route<{ id: string }>(async ({ params }) => {
  await requireScheduledEditor(params.id);
  const services = await serverServices();
  await services.scheduler.removeFromDay(params.id);
  return ok(null);
});
