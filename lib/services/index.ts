/**
 * lib/services/index.ts
 * ─────────────────────────────────────────────────────────────────
 * Application service layer. One service per domain that has real
 * orchestration or policy (Trips, Activities, Feedback, Users); trivial
 * CRUD routes use the DAL directly through the HTTP kit.
 *
 *   const services = await serverServices();      // RLS-scoped
 *   const trip = await services.trips.getSnapshot(id);
 *
 *   const services = serviceServices();           // service-role (after auth)
 *   await services.trips.create(body, userId);
 * ─────────────────────────────────────────────────────────────────
 */

import { serverDal, serviceDal, type Dal } from "@/lib/dal";
import { TripService } from "./TripService";
import { ActivityService } from "./ActivityService";
import { FeedbackService } from "./FeedbackService";
import { UserService } from "./UserService";

export { TripService, ActivityService, FeedbackService, UserService };
export type { CreateTripRequest } from "./TripService";
export type { Me } from "./UserService";

export type Services = {
  trips: TripService;
  activities: ActivityService;
  feedback: FeedbackService;
  users: UserService;
};

function build(dal: Dal): Services {
  return {
    trips: new TripService(dal),
    activities: new ActivityService(dal),
    feedback: new FeedbackService(dal),
    users: new UserService(dal),
  };
}

/** Services bound to the RLS-scoped server client. */
export async function serverServices(): Promise<Services> {
  return build(await serverDal());
}

/** Services bound to the service-role client. Verify auth/authorization first. */
export function serviceServices(): Services {
  return build(serviceDal());
}
