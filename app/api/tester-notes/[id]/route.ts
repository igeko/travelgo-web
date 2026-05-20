import { route, readJson, ok } from "@/lib/api";
import { requireUser, ADMIN_ROLES } from "@/lib/api/guards";
import { serviceDal } from "@/lib/dal";
import { serviceServices } from "@/lib/services";

/** PATCH /api/tester-notes/[id] — edit note (author) / status & fix (admin). */
export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  const { userId } = await requireUser();
  const isAdmin = await serviceDal().users.hasPlatformRole(userId, ADMIN_ROLES);
  const body = await readJson<Record<string, unknown>>(req);
  await serviceServices().feedback.update(params.id, body, { userId, isAdmin });
  return ok(null);
});
