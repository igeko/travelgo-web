import { revalidatePath } from "next/cache";
import { route, ok } from "@/lib/api";
import { requireStayEditor } from "@/lib/api/guards";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";

/** POST /api/accommodation-stays/[id]/extend — +1 night (check_out += 1). */
export const POST = route<{ id: string }>(async ({ params }) => {
  await requireStayEditor(params.id);
  const services = await serverServices();
  const stay = await services.accommodations.extendStay(params.id);

  const dal = await serverDal();
  const tripId = await dal.accommodations.tripIdOfStay(params.id);
  if (tripId) {
    revalidatePath(`/trips/${tripId}/explore-next`);
    revalidatePath(`/trips/${tripId}/explore`);
    revalidatePath(`/trips/${tripId}`);
  }
  return ok(stay);
});
