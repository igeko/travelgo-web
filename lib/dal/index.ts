/**
 * lib/dal/index.ts
 * ─────────────────────────────────────────────────────────────────
 * DAL entry point — exports everything and provides factory functions
 * that wire up the entity classes with the right Supabase client.
 *
 * One class per domain entity:
 *   dal.trips       Trips       trips + days + scheduling (scheduled_activities)
 *   dal.activities  Activities  activities + sections + sidebar + search
 *   dal.members     Membership  trip_members + trip_invites
 *   dal.users       Users       auth + profiles + user_platform_roles
 *   dal.feedback    Feedback    tester_notes (admin)
 *
 * Usage in a Server Component / Route Handler:
 *   import { serverDal } from "@/lib/dal";
 *   const dal = await serverDal();
 *   const { data, error } = await dal.trips.findById(id);
 *
 * Usage in a Client Component:
 *   import { browserDal } from "@/lib/dal";
 *   const dal = browserDal();
 *
 * Service-role (after the route has checked auth + authorization):
 *   import { serviceDal } from "@/lib/dal";
 *   const dal = serviceDal();
 * ─────────────────────────────────────────────────────────────────
 */

export * from "./types";
export * from "./tables";
export * from "./domain";
export * from "./supabase";

export { Trips }       from "./entities/Trips";
export { Activities }  from "./entities/Activities";
export { Membership }  from "./entities/Membership";
export { Users }       from "./entities/Users";
export { Feedback }    from "./entities/Feedback";

export type {
  CreateTripInput, UpdateTripInput,
  CreateDayInput, UpdateDayInput,
  ScheduleActivityInput, UpdateScheduleInput, ScheduleInstanceFields,
  TripSummary,
} from "./entities/Trips";
export type {
  CreateActivityInput, UpdateActivityInput, ActivityWithSections,
  ActivitySearchInput, ActivitySearchResult,
  ActivityScheduledInstance, ActivitySearchWishlistRow,
} from "./entities/Activities";
export type { AddMemberInput, CreateInviteInput } from "./entities/Membership";
export type { UserProfile, UpdateProfileInput } from "./entities/Users";
export type { CreateTesterNoteInput } from "./entities/Feedback";

// ── DAL factory ───────────────────────────────────────────────────

import { getBrowserClient, getServerClient, getServiceClient, type SupabaseClient } from "./supabase";
import { Trips }       from "./entities/Trips";
import { Activities }  from "./entities/Activities";
import { Membership }  from "./entities/Membership";
import { Users }       from "./entities/Users";
import { Feedback }    from "./entities/Feedback";

export type Dal = {
  trips:      Trips;
  activities: Activities;
  members:    Membership;
  users:      Users;
  feedback:   Feedback;
};

function buildDal(client: SupabaseClient): Dal {
  return {
    trips:      new Trips(client),
    activities: new Activities(client),
    members:    new Membership(client),
    users:      new Users(client),
    feedback:   new Feedback(client),
  };
}

/**
 * Server-side DAL — async because it reads cookies.
 * Use in RSC, Route Handlers, and Server Actions.
 */
export async function serverDal(): Promise<Dal> {
  const client = await getServerClient();
  return buildDal(client);
}

/**
 * Browser-side DAL — synchronous.
 * Use in Client Components and client-side event handlers.
 */
export function browserDal(): Dal {
  const client = getBrowserClient() as unknown as SupabaseClient;
  return buildDal(client);
}

/**
 * Service-role DAL — bypasses RLS. Callers MUST verify auth and
 * authorization before using this. Server-only.
 */
export function serviceDal(): Dal {
  const client = getServiceClient() as unknown as SupabaseClient;
  return buildDal(client);
}
