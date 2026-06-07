/**
 * lib/planning/addToTrip
 * ─────────────────────────────────────────────────────────────────
 * Add-to-Trip algorithm — pure, no side effects.
 *
 * Decides WHERE a new place from Explore lands in the plan, with what
 * duration, and raises non-blocking warnings (overflow, geographic
 * incoherence, duplicate). Persistence and Routes API recalculation
 * are the caller's responsibility (Fase 2 of the brief).
 *
 * Public surface — the orchestrator is the only thing most callers need:
 *
 *   import { addPlaceToTrip, snapshotToPlan } from "@/lib/planning/addToTrip";
 *
 *   const plan = snapshotToPlan(tripSnapshot);
 *   const result = addPlaceToTrip(plan, place, {
 *     selectedActivityId,
 *     selectedDayId,
 *     getCategoryDurationMin: (cat) => durationMap.get(cat) ?? null,
 *   });
 *   // → result.activity / result.position / result.warnings
 *
 * The individual steps (resolveDuration, resolveInsertPosition, …) are
 * exported too, for tests and bespoke flows.
 *
 * Brief: docs/briefs/06-add-to-trip-algorithm.md
 * ─────────────────────────────────────────────────────────────────
 */

export { addPlaceToTrip, AddToTripError } from "./addPlaceToTrip";
export { resolveDuration } from "./resolveDuration";
export { resolveInsertPosition } from "./resolveInsertPosition";
export { checkTimeOverflow } from "./checkTimeOverflow";
export { checkGeographicCoherence } from "./checkGeographicCoherence";
export { checkDuplicate } from "./checkDuplicate";
export { buildActivity } from "./buildActivity";
export { snapshotToPlan } from "./adapter";

export type {
  AddResult,
  AddToTripContext,
  AddWarning,
  BuiltActivity,
  CandidatePlace,
  InsertPosition,
  Plan,
  PlanActivity,
  PlanDay,
  PlanCoord,
} from "./types";
export {
  DEFAULT_DURATION_MIN,
  DEFAULT_COHERENCE_THRESHOLD_KM,
  ACCOMMODATION_CHECKIN_TIME,
  ACCOMMODATION_CHECKOUT_TIME,
} from "./types";
