/**
 * lib/planning/addToTrip/resolveInsertPosition.ts
 * ─────────────────────────────────────────────────────────────────
 * Step 2 of the Add-to-Trip algorithm.
 *
 * Decides WHERE the new stop goes. Rules (brief 06, in precedence order):
 *
 *   1. selectedActivityId → after that activity, on the day that owns it.
 *   2. selectedDayId → end of that day.
 *   3. Default → end of the last day that has at least one activity, OR
 *      Day 1 when the plan is empty.
 *
 * The algorithm treats the whole trip as ONE continuous itinerary: when no
 * selection is supplied and no day has activities, we fall back to the first
 * day; we never skip-ahead or rebalance across days here. Rebalancing on
 * overflow is left to the user (post-positioning warning).
 * ─────────────────────────────────────────────────────────────────
 */

import type { Plan, InsertPosition, AddToTripContext } from "./types";

export function resolveInsertPosition(
  plan: Plan,
  context: Pick<AddToTripContext, "selectedActivityId" | "selectedDayId"> = {},
): InsertPosition | null {
  if (plan.days.length === 0) return null;

  // Rule 1 — activity selected: locate the day that owns it.
  if (context.selectedActivityId) {
    for (const day of plan.days) {
      const found = day.activities.find((a) => a.id === context.selectedActivityId);
      if (found) {
        return { dayId: day.id, afterActivityId: found.id };
      }
    }
    // Selected activity not found in the plan — fall through to the next rule
    // rather than throwing, so a stale selection never blocks the user.
  }

  // Rule 2 — day selected: append to that day.
  if (context.selectedDayId) {
    const day = plan.days.find((d) => d.id === context.selectedDayId);
    if (day) return { dayId: day.id, afterActivityId: null };
  }

  // Rule 3 — append to the LAST day that already has activities.
  for (let i = plan.days.length - 1; i >= 0; i--) {
    if (plan.days[i].activities.length > 0) {
      return { dayId: plan.days[i].id, afterActivityId: null };
    }
  }

  // Empty plan — Day 1.
  return { dayId: plan.days[0].id, afterActivityId: null };
}
