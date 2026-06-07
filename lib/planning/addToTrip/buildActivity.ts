/**
 * lib/planning/addToTrip/buildActivity.ts
 * ─────────────────────────────────────────────────────────────────
 * Step 6 of the Add-to-Trip algorithm.
 *
 * Builds the BuiltActivity payload — NOT a DB row, just the shape the
 * caller hands to `Scheduler.addToDay` for persistence.
 *
 * Special-case: accommodations get the brief's fixed timing —
 *   check-in  → 22:00 today  (slot "night")
 *   checkout → 09:00 tomorrow (caller's responsibility, not built here)
 * For every other place, the slot is inferred from the cumulative time
 * we're appending after; the explicit time is left null so the user can
 * tighten it later. (The algorithm intentionally avoids manufacturing a
 * fictitious start time — `time` is a user-controlled field.)
 * ─────────────────────────────────────────────────────────────────
 */

import {
  ACCOMMODATION_CHECKIN_TIME,
  type BuiltActivity,
  type CandidatePlace,
  type InsertPosition,
  type PlanActivity,
} from "./types";

/** Slot derived from "minutes since 00:00". Mirrors the convention used
 *  elsewhere in the app — morning 04–12, afternoon 12–17, evening 17–21,
 *  night 21–04. */
function slotForClock(minutes: number | null): PlanActivity["slot"] {
  if (minutes === null) return null;
  const h = minutes / 60;
  if (h >= 4 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function parseClock(time: string | null): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mm)) return null;
  return h * 60 + mm;
}

/**
 * Walk the day's activities up to the insertion point and infer the slot
 * for the new stop. Uses the latest fixed-time anchor plus stacked
 * durations — same logic as checkTimeOverflow, simplified.
 */
function inferSlot(
  day: { activities: PlanActivity[] },
  insertAfterId: string | null,
): PlanActivity["slot"] {
  let clock: number | null = null;
  let inheritedSlot: PlanActivity["slot"] = null;

  for (const a of day.activities) {
    if (a.isAccommodation) {
      // Skip — accommodations bracket the day, don't push the clock.
      if (a.id === insertAfterId) break;
      continue;
    }
    const fixed = parseClock(a.time);
    if (fixed !== null) clock = fixed + a.durationMin;
    else if (clock !== null) clock += a.durationMin;
    if (a.slot) inheritedSlot = a.slot;
    if (a.id === insertAfterId) break;
  }

  // If the day had a running clock, derive from it; else inherit the last
  // explicit slot we saw; else null (caller can leave it unset).
  return clock !== null ? slotForClock(clock) : inheritedSlot;
}

export function buildActivity(args: {
  place: CandidatePlace;
  position: InsertPosition;
  /** The target day — needed for slot inference and accommodation guard. */
  day: { activities: PlanActivity[] };
  /** Position index (1-based) for the new stop in the day's ordering. */
  newPositionIndex: number;
  durationMin: number;
}): BuiltActivity {
  const { place, position, day, newPositionIndex, durationMin } = args;
  const isAccommodation = !!place.isAccommodation;

  const slot: PlanActivity["slot"] = isAccommodation
    ? "night"
    : inferSlot(day, position.afterActivityId);

  const time = isAccommodation ? ACCOMMODATION_CHECKIN_TIME : null;
  const type: BuiltActivity["type"] = "place";

  return {
    title: place.title,
    location: null,
    location_place_id: place.placeId,
    location_lat: place.lat,
    location_lng: place.lng,
    day_id: position.dayId,
    position: newPositionIndex,
    slot,
    time,
    type,
    durationMin,
  };
}
