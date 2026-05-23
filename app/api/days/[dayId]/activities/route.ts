import { route, readJson, ok } from "@/lib/api";
import { requireDayMember, requireDayEditor } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

/** GET /api/days/[dayId]/activities — activities scheduled on the day. */
export const GET = route<{ dayId: string }>(async ({ params }) => {
  await requireDayMember(params.dayId);
  const services = await serverServices();
  return ok(await services.scheduler.listForDay(params.dayId));
});

/** POST /api/days/[dayId]/activities — create an activity and schedule it. */
export const POST = route<{ dayId: string }>(async ({ req, params }) => {
  await requireDayEditor(params.dayId);
  const body = await readJson<Record<string, unknown>>(req);
  const services = await serverServices();
  const block = await services.scheduler.addToDay(params.dayId, body);
  return ok(block, { status: 201 });
});
