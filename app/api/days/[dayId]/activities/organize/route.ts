import { route, ok } from "@/lib/api";
import { requireDayEditor } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

/** POST /api/days/[dayId]/activities/organize — AI reorder of the day. */
export const POST = route<{ dayId: string }>(async ({ params }) => {
  await requireDayEditor(params.dayId);
  const services = await serverServices();
  return ok(await services.activities.organize(params.dayId));
});
