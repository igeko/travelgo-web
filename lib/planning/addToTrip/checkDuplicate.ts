/**
 * lib/planning/addToTrip/checkDuplicate.ts
 * ─────────────────────────────────────────────────────────────────
 * Step 5 of the Add-to-Trip algorithm.
 *
 * Returns true when the same Google placeId is already scheduled
 * anywhere in the trip. The warning is non-blocking — the orchestrator
 * surfaces it and the user can confirm the insertion anyway.
 *
 * Places without a `placeId` (ad-hoc coordinate pins) are never flagged
 * as duplicates: we have no stable identity to compare on, so two pins
 * at near-identical coordinates remain distinct stops.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Plan } from "./types";

export function checkDuplicate(plan: Plan, placeId: string | null): boolean {
  if (!placeId) return false;
  for (const day of plan.days) {
    for (const activity of day.activities) {
      if (activity.placeId === placeId) return true;
    }
  }
  return false;
}
