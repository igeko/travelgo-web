/**
 * lib/dal/index.ts
 * ─────────────────────────────────────────────────────────────────
 * DAL entry point — exports everything and provides two factory
 * functions that wire up all repositories with the right client.
 *
 * Usage in a Server Component / Route Handler:
 *   import { serverDal } from "@/lib/dal";
 *   const dal = await serverDal();
 *   const { data, error } = await dal.trips.findById(id);
 *
 * Usage in a Client Component:
 *   import { browserDal } from "@/lib/dal";
 *   const dal = browserDal();
 *   const { data, error } = await dal.activities.listByDay(dayId);
 * ─────────────────────────────────────────────────────────────────
 */

export * from "./types";
export * from "./supabase";

export { TripRepository }      from "./TripRepository";
export { DayRepository }       from "./DayRepository";
export { ActivityRepository }  from "./ActivityRepository";
// ScheduledActivityRepository lives on `main` (work in progress) — wire it
// up here when that work lands. The DAL still works without it; route
// handlers query scheduled_activities directly through the server client.
export { BudgetRepository }    from "./BudgetRepository";
export { MemberRepository }    from "./MemberRepository";
export { InviteRepository }    from "./InviteRepository";
export { PhotoRepository }     from "./PhotoRepository";
export { JournalRepository }   from "./JournalRepository";
export { UserRepository }      from "./UserRepository";

export type { CreateTripInput, UpdateTripInput }               from "./TripRepository";
export type { CreateDayInput, UpdateDayInput }                 from "./DayRepository";
export type { CreateActivityInput, UpdateActivityInput,
              ActivityWithSections }                           from "./ActivityRepository";
export type { CreateBudgetItemInput, UpdateBudgetItemInput,
              BudgetSummary }                                   from "./BudgetRepository";
export type { CreateInviteInput }                              from "./InviteRepository";
export type { CreatePhotoInput, UpdatePhotoInput }             from "./PhotoRepository";
export type { CreateJournalEntryInput, UpdateJournalEntryInput } from "./JournalRepository";
export type { UserProfile, UpdateProfileInput }                from "./UserRepository";

// ── DAL factory types ─────────────────────────────────────────────

import { getBrowserClient, getServerClient } from "./supabase";
import { TripRepository }       from "./TripRepository";
import { DayRepository }        from "./DayRepository";
import { ActivityRepository }   from "./ActivityRepository";
import { BudgetRepository }     from "./BudgetRepository";
import { MemberRepository }     from "./MemberRepository";
import { InviteRepository }     from "./InviteRepository";
import { PhotoRepository }      from "./PhotoRepository";
import { JournalRepository }    from "./JournalRepository";
import { UserRepository }       from "./UserRepository";

export type Dal = {
  trips:        TripRepository;
  days:         DayRepository;
  activities:   ActivityRepository;
  budget:       BudgetRepository;
  members:      MemberRepository;
  invites:      InviteRepository;
  photos:       PhotoRepository;
  journal:      JournalRepository;
  users:        UserRepository;
};

function buildDal(client: Awaited<ReturnType<typeof getBrowserClient>>): Dal {
  return {
    trips:        new TripRepository(client),
    days:         new DayRepository(client),
    activities:   new ActivityRepository(client),
    budget:       new BudgetRepository(client),
    members:      new MemberRepository(client),
    invites:      new InviteRepository(client),
    photos:       new PhotoRepository(client),
    journal:      new JournalRepository(client),
    users:        new UserRepository(client),
  };
}

/**
 * Server-side DAL — async because it reads cookies.
 * Use in RSC, Route Handlers, and Server Actions.
 */
export async function serverDal(): Promise<Dal> {
  const client = await getServerClient();
  return buildDal(client as Parameters<typeof buildDal>[0]);
}

/**
 * Browser-side DAL — synchronous.
 * Use in Client Components and client-side event handlers.
 */
export function browserDal(): Dal {
  const client = getBrowserClient();
  return buildDal(client);
}
