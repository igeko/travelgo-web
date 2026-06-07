/**
 * lib/planning/addToTrip/checkTimeOverflow.ts
 * ─────────────────────────────────────────────────────────────────
 * Step 3 of the Add-to-Trip algorithm.
 *
 * Asks: if we insert the new stop at `insertAfterIndex`, does the day's
 * cumulative schedule overflow midnight?
 *
 * Brief: the day is overflowed when the SUM of durations + the latest
 * fixed start pushes the timeline past 24:00. The brief is deliberately
 * loose ("la somma degli orari") — we anchor the day to the latest
 * `time` set on or before the insertion point and let durations stack
 * from there. Activities without a fixed `time` after the anchor add
 * their duration on top. Accommodations are exempt (their special-case
 * times 22:00/09:00 are not "schedule blocks" the user is filling).
 * ─────────────────────────────────────────────────────────────────
 */

import type { PlanDay } from "./types";

/** "HH:mm" → minutes since 00:00. Null inputs return null. */
function parseClock(time: string | null): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mm)) return null;
  return h * 60 + mm;
}

/** Minutes-in-day for midnight (24:00). */
const MIDNIGHT_MIN = 24 * 60;

/**
 * @param day The target day's current schedule.
 * @param insertAfterIndex Index in `day.activities` AFTER which the new stop
 *   sits (-1 = front of day). The brief returns positions as an "afterActivityId"
 *   token; the caller resolves it to an index before calling this.
 * @param durationMin Duration of the new stop.
 */
export function checkTimeOverflow(
  day: PlanDay,
  insertAfterIndex: number,
  durationMin: number,
): { overflows: boolean } {
  // Build the post-insertion list of stops as a flat sequence. We don't mutate
  // `day` — the new stop is a virtual placeholder injected at the right spot.
  const seq = day.activities.filter((a) => !a.isAccommodation);
  // Map the original-list index onto our filtered list. `insertAfterIndex` is
  // an index in `day.activities`, so we re-count how many non-accommodation
  // stops sit at index ≤ insertAfterIndex.
  let virtualAfter = -1;
  for (let i = 0; i <= insertAfterIndex && i < day.activities.length; i++) {
    if (!day.activities[i].isAccommodation) virtualAfter++;
  }

  // Walk the sequence, tracking the running clock. The clock starts unset
  // and is anchored the first time we meet a stop with a fixed `time`.
  let clock: number | null = null;
  for (let i = 0; i < seq.length + 1; i++) {
    // Inject the new stop right after `virtualAfter`.
    const isNew = i === virtualAfter + 1;
    if (isNew) {
      if (clock === null) {
        // No anchor yet — treat the new stop as starting at midnight (00:00)
        // for the overflow check. Its tail must still fit in the day.
        const tail = durationMin;
        if (tail > MIDNIGHT_MIN) return { overflows: true };
        clock = tail;
      } else {
        clock += durationMin;
        if (clock > MIDNIGHT_MIN) return { overflows: true };
      }
      continue;
    }

    const idx = isNew ? -1 : i > virtualAfter ? i - 1 : i;
    const stop = seq[idx];
    const fixed = parseClock(stop.time);
    if (fixed !== null) clock = fixed + stop.durationMin;
    else if (clock !== null) clock += stop.durationMin;
    // else: still unanchored — the stop has no fixed start AND we have no
    // running clock. It can't push us toward midnight; skip.
    if (clock !== null && clock > MIDNIGHT_MIN) return { overflows: true };
  }

  return { overflows: false };
}
