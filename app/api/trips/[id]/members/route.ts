import { route, ok } from "@/lib/api";
import { requireTripMember } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

/** GET /api/trips/[id]/members — roster enriched with name + avatar. */
export const GET = route<{ id: string }>(async ({ params }) => {
  await requireTripMember(params.id);
  const services = await serverServices();
  return ok(await services.members.listMembers(params.id));
});
