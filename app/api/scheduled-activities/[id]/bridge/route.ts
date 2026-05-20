import { route, readJson, ok } from "@/lib/api";
import { requireScheduledEditor } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

type BridgeBody = { direction: "in" | "out"; bridge: Record<string, unknown> | null };

/** PATCH /api/scheduled-activities/[id]/bridge — set a transport bridge. */
export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  await requireScheduledEditor(params.id);
  const body = await readJson<BridgeBody>(req);
  const services = await serverServices();
  await services.activities.setBridge(params.id, body.direction, body.bridge ?? null);
  return ok(null);
});
