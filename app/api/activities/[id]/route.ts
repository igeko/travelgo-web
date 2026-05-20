import { route, readJson, ok } from "@/lib/api";
import { requireActivityEditor } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

/** PATCH /api/activities/[id] — update entity-level fields. */
export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  await requireActivityEditor(params.id);
  const body = await readJson<Record<string, unknown>>(req);
  const services = await serverServices();
  return ok(await services.activities.updateEntity(params.id, body));
});

/** DELETE /api/activities/[id] — delete the entity (cascades scheduling). */
export const DELETE = route<{ id: string }>(async ({ params }) => {
  await requireActivityEditor(params.id);
  const services = await serverServices();
  await services.activities.deleteEntity(params.id);
  return ok(null);
});
