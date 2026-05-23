/**
 * /api/yumes/[id] — a single yume.
 *   GET    → read (RLS enforces visibility)
 *   PATCH  → change visibility (owner only)   body: { visibility }
 *   DELETE → remove the yume entity (owner only)
 */
import { route, readJson, ok } from "@/lib/api";
import { requireUser, requireActivityOwner } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";

export const GET = route<{ id: string }>(async ({ params }) => {
  await requireUser();
  const services = await serverServices();
  return ok(await services.yumes.get(params.id));
});

export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  await requireActivityOwner(params.id);
  const body = await readJson<{ visibility?: unknown }>(req);
  const services = await serverServices();
  return ok(await services.yumes.setVisibility(params.id, body.visibility));
});

export const DELETE = route<{ id: string }>(async ({ params }) => {
  await requireActivityOwner(params.id);
  const services = await serverServices();
  await services.yumes.remove(params.id);
  return ok(null);
});
