/**
 * lib/planning/addToTrip/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Local types for the Add-to-Trip algorithm.
 *
 * Kept independent from `lib/dal/domain.ts`: the algorithm is a pure
 * decision layer that reasons over a Plan. An adapter converts a
 * TripSnapshot → Plan at the boundary (see `./adapter.ts`).
 *
 * Brief: docs/briefs/06-add-to-trip-algorithm.md
 * ─────────────────────────────────────────────────────────────────
 */

/** Geographic + identity payload for an existing or candidate stop. */
export type PlanCoord = {
  lat: number;
  lng: number;
};

/**
 * A single scheduled stop on a day, in the shape the algorithm needs.
 * - `time` is "HH:mm" when known, else null (the algorithm treats null as
 *   "no fixed start" — accommodations and slot-only stops fall here).
 * - `durationMin` is the resolved duration (already merged: Google hint →
 *   category → fallback). The algorithm does not call back to the lookup.
 * - `placeId` is the Google place identity, used for duplicate detection.
 */
export type PlanActivity = {
  /** Stable id of the scheduled occurrence (scheduled_activities.id). */
  id: string;
  /** Entity id (activities.id) — surfaced for upstream lookups. */
  entityId: string | null;
  position: number;
  slot: "morning" | "afternoon" | "evening" | "night" | null;
  time: string | null;
  durationMin: number;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  /** True when this stop is an accommodation — exempt from time-overflow and coherence checks. */
  isAccommodation: boolean;
};

/** A single day in the algorithm's plan view. */
export type PlanDay = {
  id: string;
  dayNumber: number;
  activities: PlanActivity[];
};

/** The plan the algorithm operates on — strictly multi-day. */
export type Plan = {
  tripId: string;
  days: PlanDay[];
};

/** The Place the user is trying to add. */
export type CandidatePlace = {
  /** Google place id (used for duplicate detection). */
  placeId: string | null;
  title: string;
  lat: number;
  lng: number;
  /**
   * Candidate categories, in match-priority order. The algorithm tries each
   * in turn against the category→duration lookup. Sources: Google Places
   * `types` array, our explore sub-category id, or anything the caller
   * wants to surface. Empty array = no category hints.
   */
  categories: string[];
  /**
   * Pre-resolved duration hint, in minutes. Currently `editorial_summary`
   * and `opening_hours` from Google Places do NOT expose a numeric duration,
   * so this is a caller-controlled override (e.g. an admin-edited value or
   * a future enrichment). Wins over the category lookup when set.
   */
  durationHintMin?: number | null;
  /** Marks an accommodation — triggers the 22:00 check-in special-case. */
  isAccommodation?: boolean;
};

/** Caller-supplied insertion context — usually mirrors the current UI selection. */
export type AddToTripContext = {
  /** scheduled_activities.id — insert AFTER this activity, on its day. */
  selectedActivityId?: string | null;
  /** days.id — insert at the END of this day. Ignored when selectedActivityId is set. */
  selectedDayId?: string | null;
  /** Distance threshold (km) for the geographic-coherence check. Default: 50. */
  coherenceThresholdKm?: number;
  /**
   * Lookup for the category→duration table. The algorithm calls this for
   * every candidate category until it returns a positive number. Provider-
   * decoupled by design (DB-backed in production, simple Map in tests).
   */
  getCategoryDurationMin?: (category: string) => number | null | undefined;
};

/** Universal fallback duration (minutes) when no hint and no category match. */
export const DEFAULT_DURATION_MIN = 60;

/** Default geographic-coherence threshold (kilometres). */
export const DEFAULT_COHERENCE_THRESHOLD_KM = 50;

/**
 * Accommodation special-case timings.
 * Check-in is "back at the hotel after dinner" — 22:00.
 * Checkout is the next morning at 09:00. The algorithm itself only inserts
 * the check-in stop; the next-day checkout is the caller's responsibility.
 */
export const ACCOMMODATION_CHECKIN_TIME = "22:00";
export const ACCOMMODATION_CHECKOUT_TIME = "09:00";

/** Target position for the insertion. */
export type InsertPosition = {
  dayId: string;
  /** scheduled_activities.id after which the new activity goes. null = day end. */
  afterActivityId: string | null;
};

/** Non-blocking warnings raised by post-positioning checks. */
export type AddWarning = "overflow" | "incoherent" | "duplicate";

/**
 * The "activity" the algorithm builds — NOT a DB row.
 *
 * Shape matches the contract the caller needs to hand to `Scheduler.addToDay`:
 * the entity-side fields (title/location/...) plus the instance-side fields
 * (slot/time/position). The caller decides how to map this to an existing
 * `activities` row vs creating a new one (delegated to YumeService inside
 * Scheduler.addToDay).
 */
export type BuiltActivity = {
  /** Entity-side */
  title: string;
  location: string | null;
  location_place_id: string | null;
  location_lat: number;
  location_lng: number;
  /** Instance-side */
  day_id: string;
  position: number;
  slot: PlanActivity["slot"];
  time: string | null;
  type: "place" | "move" | "meal" | "pause" | "action";
  /** Derived duration (minutes) — algorithm output, not persisted on the row. */
  durationMin: number;
};

/** Final orchestrator result. Persistence is the caller's responsibility. */
export type AddResult = {
  activity: BuiltActivity;
  position: InsertPosition;
  warnings: AddWarning[];
};
