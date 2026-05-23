/**
 * /api/yumes — the current user's yume collection.
 *   GET  → list my yumes (optional ?visibility=public|private|shared)
 *   POST → create a yume (an activity owned by me)
 */
import { route, readJson, queryParam, ok } from "@/lib/api";
import { requireUser } from "@/lib/api/guards";
import { serverServices } from "@/lib/services";
import type { ActivityVisibility } from "@/lib/dal";

const VISIBILITIES = ["public", "private", "shared"] as const;

export const GET = route(async ({ req }) => {
  await requireUser();
  const raw = queryParam(req, "visibility");
  const visibility = (VISIBILITIES as readonly string[]).includes(raw ?? "")
    ? (raw as ActivityVisibility)
    : undefined;

  const services = await serverServices();
  return ok(await services.yumes.listMine(visibility ? { visibility } : undefined));
});

export const POST = route(async ({ req }) => {
  await requireUser();
  const body = await readJson<Record<string, unknown>>(req);
  const services = await serverServices();
  return ok(await services.yumes.create(body));
});
