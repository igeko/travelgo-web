import { route, readJson, ok } from "@/lib/api";
import { requirePlatformTester, ADMIN_ROLES } from "@/lib/api/guards";
import { serviceServices } from "@/lib/services";

/** POST /api/tester-notes — submit a tester note. */
export const POST = route(async ({ req }) => {
  const { userId } = await requirePlatformTester();
  const body = await readJson<Record<string, unknown>>(req);
  return ok(await serviceServices().feedback.submit(userId, body), { status: 201 });
});

/** GET /api/tester-notes — list notes (own, or all for admins). */
export const GET = route(async () => {
  const { userId, roles } = await requirePlatformTester();
  const isAdmin = roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
  return ok(await serviceServices().feedback.list({ userId, isAdmin }));
});
