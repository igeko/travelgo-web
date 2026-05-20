import { route, ok } from "@/lib/api";
import { serverServices } from "@/lib/services";

/** GET /api/me — current user identity + platform roles. */
export const GET = route(async () => {
  const services = await serverServices();
  return ok(await services.users.me());
});
