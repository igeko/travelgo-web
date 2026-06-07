/**
 * lib/planning/addToTrip/resolveDuration.ts
 * ─────────────────────────────────────────────────────────────────
 * Step 1 of the Add-to-Trip algorithm.
 *
 * Precedence (brief 06):
 *   1. Google Places hint (or any caller-supplied numeric override)
 *   2. Category → duration lookup (DB-backed in production)
 *   3. Universal fallback (60 minutes)
 *
 * The category lookup is INJECTED — the algorithm never touches the DB.
 * Tries every candidate category the place provides, in order; first
 * positive match wins. This way Google-typed places ("museum") and our
 * own taxonomy ("hotel") coexist without translation.
 * ─────────────────────────────────────────────────────────────────
 */

import { DEFAULT_DURATION_MIN, type CandidatePlace, type AddToTripContext } from "./types";

export function resolveDuration(
  place: Pick<CandidatePlace, "categories" | "durationHintMin">,
  context: Pick<AddToTripContext, "getCategoryDurationMin"> = {},
): number {
  // 1. Per-place hint wins outright.
  if (typeof place.durationHintMin === "number" && place.durationHintMin > 0) {
    return Math.round(place.durationHintMin);
  }

  // 2. Category lookup — first positive match across the candidate list.
  const lookup = context.getCategoryDurationMin;
  if (lookup && place.categories.length > 0) {
    for (const cat of place.categories) {
      const m = lookup(cat);
      if (typeof m === "number" && m > 0) return Math.round(m);
    }
  }

  // 3. Universal fallback.
  return DEFAULT_DURATION_MIN;
}
