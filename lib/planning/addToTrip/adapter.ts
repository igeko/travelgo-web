/**
 * lib/planning/addToTrip/adapter.ts
 * ─────────────────────────────────────────────────────────────────
 * Boundary adapter: TripSnapshot (DAL domain) → Plan (algorithm domain).
 *
 * Kept here rather than inside the entities to preserve the algorithm's
 * independence — the algorithm doesn't import from `lib/dal`. If the DAL
 * shape ever changes, only this file moves.
 *
 * Existing activities don't carry a stored duration today. The caller
 * passes a `getExistingActivityDuration(activity) → minutes` hook to
 * resolve them; the default keeps every existing stop at the universal
 * 60' fallback. Accommodations are NOT injected into the Plan: they
 * live on `Day` (accommodation_lat/lng), and every algorithm step that
 * matters (coherence, overflow) excludes them anyway.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Activity, TripSnapshot } from "@/lib/dal";
import { DEFAULT_DURATION_MIN, type Plan, type PlanActivity, type PlanDay } from "./types";

export type SnapshotToPlanOptions = {
  /**
   * Per-activity duration resolver. Default: `DEFAULT_DURATION_MIN` (60').
   * Pass a smarter resolver (Google hint, stored field, category lookup)
   * to refine the overflow check when the data is available.
   */
  getExistingActivityDuration?: (activity: Activity) => number;
};

export function snapshotToPlan(
  snapshot: TripSnapshot,
  opts: SnapshotToPlanOptions = {},
): Plan {
  const resolveDur = opts.getExistingActivityDuration ?? (() => DEFAULT_DURATION_MIN);

  const days: PlanDay[] = snapshot.days.map((d) => ({
    id: d.id,
    dayNumber: d.day_number,
    activities: d.activities.map<PlanActivity>((a) => ({
      id: a.id,
      entityId: a.activity_id ?? a.entity_id ?? null,
      position: a.position ?? 0,
      slot: a.slot,
      time: a.time,
      durationMin: Math.max(1, Math.round(resolveDur(a))),
      placeId: a.location_place_id,
      lat: a.location_lat,
      lng: a.location_lng,
      // Activities are NEVER accommodations in our model — accommodations
      // live on the Day row. Kept as a placeholder for future test plans
      // that may want to inject synthetic accommodation stops.
      isAccommodation: false,
    })),
  }));

  return { tripId: snapshot.trip.id, days };
}
