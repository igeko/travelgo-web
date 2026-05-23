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

/** Photo metadata (storage objects live in Supabase Storage, not here). */
export enum MediaTable {
  Photos = "photos",
}

/** Trip journal entries. */
export enum JournalTable {
  Entries = "journal_entries",
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
