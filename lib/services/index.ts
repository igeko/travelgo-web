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
import { MembershipService } from "./MembershipService";
import { Scheduler } from "./Scheduler";
import { FeedbackService } from "./FeedbackService";
import { UserService } from "./UserService";
import { YumeService } from "./YumeService";
import { GoService } from "./GoService";

export { TripService, MembershipService, Scheduler, FeedbackService, UserService, YumeService, GoService };
export type { CreateTripRequest, UpdateTripPatch } from "./TripService";
export type { Me } from "./UserService";
export type { Yume } from "./YumeService";

export type Services = {
  trips: TripService;
  /** Trip collaboration: members + pending invites. */
  members: MembershipService;
  /** Scheduling onto days (scheduled_activities). */
  scheduler: Scheduler;
  feedback: FeedbackService;
  users: UserService;
  /** Owner of the activity entity: create/edit/delete/search/visibility/share. */
  yumes: YumeService;
  /** Go agent persistence: session + conversation thread. */
  go: GoService;
};

function build(dal: Dal): Services {
  const yumes = new YumeService(dal);
  return {
    trips: new TripService(dal),
    members: new MembershipService(dal),
    scheduler: new Scheduler(dal, yumes),
    feedback: new FeedbackService(dal),
    users: new UserService(dal),
    yumes,
    go: new GoService(dal),
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
