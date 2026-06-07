/**
 * lib/planning/addToTrip/addPlaceToTrip.ts
 * ─────────────────────────────────────────────────────────────────
 * The orchestrator.
 *
 * Composes the six pure steps of the Add-to-Trip algorithm:
 *   resolveDuration → resolveInsertPosition → buildActivity
 *   → checkTimeOverflow + checkGeographicCoherence + checkDuplicate
 *
 * Returns the built activity (NOT persisted), the target position, and
 * the aggregated non-blocking warnings. Persistence and the Routes API
 * bridge recalculation (Fase 2 of the brief) are the caller's job —
 * typically a route handler that calls `Scheduler.addToDay` and then
 * `/api/routes`.
 * ─────────────────────────────────────────────────────────────────
 */

import { resolveDuration } from "./resolveDuration";
import { resolveInsertPosition } from "./resolveInsertPosition";
import { checkTimeOverflow } from "./checkTimeOverflow";
import { checkGeographicCoherence } from "./checkGeographicCoherence";
import { checkDuplicate } from "./checkDuplicate";
import { buildActivity } from "./buildActivity";
import type {
  AddResult,
  AddToTripContext,
  AddWarning,
  CandidatePlace,
  Plan,
} from "./types";
import { DEFAULT_COHERENCE_THRESHOLD_KM } from "./types";

export class AddToTripError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AddToTripError";
  }
}

export function addPlaceToTrip(
  plan: Plan,
  place: CandidatePlace,
  context: AddToTripContext = {},
): AddResult {
  // 1. Duration — Google hint → category lookup → 60' fallback.
  const durationMin = resolveDuration(place, context);

  // 2. Position — selection precedence → end of last populated day → Day 1.
  const position = resolveInsertPosition(plan, context);
  if (!position) {
    throw new AddToTripError("Trip has no days — nothing to add to.");
  }

  const targetDay = plan.days.find((d) => d.id === position.dayId);
  if (!targetDay) {
    // Defensive — resolveInsertPosition only returns dayIds it actually saw.
    throw new AddToTripError("Resolved insert position points to an unknown day.");
  }

  // Index after which the new stop sits, in the target day's list.
  const insertAfterIndex = position.afterActivityId
    ? targetDay.activities.findIndex((a) => a.id === position.afterActivityId)
    : targetDay.activities.length - 1;

  // 3. Build the activity (non-persisted).
  const newPositionIndex = insertAfterIndex + 2; // 1-based, after the anchor
  const activity = buildActivity({
    place,
    position,
    day: targetDay,
    newPositionIndex,
    durationMin,
  });

  // 4. Post-positioning checks — non-blocking, aggregated into `warnings`.
  const warnings: AddWarning[] = [];

  // Accommodations are exempt from overflow + coherence (special-case timing,
  // geographically bracket the day on purpose).
  if (!place.isAccommodation) {
    const overflow = checkTimeOverflow(targetDay, insertAfterIndex, durationMin);
    if (overflow.overflows) warnings.push("overflow");

    const threshold = context.coherenceThresholdKm ?? DEFAULT_COHERENCE_THRESHOLD_KM;
    const coherence = checkGeographicCoherence(
      { lat: place.lat, lng: place.lng },
      targetDay.activities,
      threshold,
    );
    if (coherence.incoherent) warnings.push("incoherent");
  }

  if (checkDuplicate(plan, place.placeId)) warnings.push("duplicate");

  return { activity, position, warnings };
}
