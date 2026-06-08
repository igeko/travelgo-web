/**
 * lib/dal/tables.ts
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for Supabase table names.
 *
 * Enums are split per domain (one enum per entity area) so that each
 * entity class imports only the names it owns and table strings never
 * appear inline anywhere in the codebase.
 * ─────────────────────────────────────────────────────────────────
 */

/** Trip aggregate: the trip, its days, and the day↔activity scheduling join. */
export enum TripTable {
  Trips = "trips",
  Days = "days",
  ScheduledActivities = "scheduled_activities",
}

/** Lodging: reservations as ranges + their per-day projection. */
export enum AccommodationTable {
  Stays = "accommodation_stays",
  Nights = "accommodation_nights",
}

/** Activity entity and its rich-content relations. */
export enum ActivityTable {
  Activities = "activities",
  Sections = "activity_sections",
  Sidebar = "activity_sidebar",
  /** Which trips a 'shared' activity is shared with. */
  Shares = "activity_shares",
}

/** Trip collaboration: members and pending invites. */
export enum MembershipTable {
  Members = "trip_members",
  Invites = "trip_invites",
}

/** User profiles and platform-level roles. */
export enum UserTable {
  Profiles = "user_profiles",
  PlatformRoles = "user_platform_roles",
}

/** Tester / QA feedback notes. */
export enum FeedbackTable {
  TesterNotes = "tester_notes",
}

/** Read-only airport reference data. */
export enum AirportTable {
  Airports = "airports",
}

/** Go agent: per-(trip,user) planning session and its conversation thread. */
export enum GoTable {
  Sessions = "go_sessions",
  Messages = "go_messages",
}

/** Planning / Add-to-Trip configuration tables. */
export enum PlanningTable {
  /** Default duration (minutes) per place category — feeds resolveDuration. */
  CategoryDurations = "category_durations",
}

/** Cache tables — payload Google Places & co. con TTL applicato dal DAL. */
export enum CacheTable {
  /** Cache server-side dei dettagli Place v1 (per placeId). TTL 30gg. */
  Places = "place_cache",
}
