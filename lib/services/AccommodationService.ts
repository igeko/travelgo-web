/**
 * lib/services/AccommodationService.ts
 * ─────────────────────────────────────────────────────────────────
 * Lodging stays as a first-class range entity. Orchestrates the
 * cross-table flows that the Sleep↔Stop toggle and the nights
 * stepper need:
 *
 *   convertScheduledToStay  — DELETE scheduled_activities + INSERT stay
 *   convertStayToScheduled  — DELETE stay + INSERT scheduled_activities
 *   extendStay / reduceStay — UPDATE stay_range; trigger re-projects nights
 *
 * Pure DB-level operations belong to the DAL (Accommodations);
 * orchestration and policy live here.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal, StayWithActivity, NightWithStay, UpdateStayInput } from "@/lib/dal";
import { notFound, badRequest } from "@/lib/api/errors";
import { unwrap } from "./util";

/** Parse "YYYY-MM-DD" into a Date at UTC midnight (avoid TZ drift). */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  return new Date(Date.UTC(y, m - 1, d));
}

/** Format Date → "YYYY-MM-DD" (UTC). */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add (or subtract) N days to an ISO date string, returning a new ISO date. */
function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

/** Parse Postgres "[YYYY-MM-DD,YYYY-MM-DD)" daterange into {check_in, check_out}. */
function parseDateRange(range: string): { check_in: string; check_out: string } {
  // Format examples: "[2026-07-31,2026-08-05)" or "empty"
  const m = range.match(/^[\[(]([^,]+),([^)\]]+)[)\]]$/);
  if (!m) throw new Error(`Invalid daterange literal: ${range}`);
  return { check_in: m[1], check_out: m[2] };
}

export class AccommodationService {
  constructor(private readonly dal: Dal) {}

  // ── Reads ──────────────────────────────────────────────────────

  async listByTrip(tripId: string): Promise<StayWithActivity[]> {
    return unwrap(await this.dal.accommodations.listByTrip(tripId)) ?? [];
  }

  async listNightsByTrip(tripId: string): Promise<NightWithStay[]> {
    return unwrap(await this.dal.accommodations.listNightsByTrip(tripId)) ?? [];
  }

  async findById(stayId: string): Promise<StayWithActivity> {
    const stay = unwrap(await this.dal.accommodations.findById(stayId));
    if (!stay) throw notFound("Stay not found");
    return stay;
  }

  // ── Writes ─────────────────────────────────────────────────────

  /** Update arbitrary stay fields (booking_status, cost, notes, …). */
  async update(stayId: string, patch: UpdateStayInput) {
    return unwrap(await this.dal.accommodations.update(stayId, patch));
  }

  async delete(stayId: string) {
    return unwrap(await this.dal.accommodations.delete(stayId));
  }

  /**
   * Extend the stay by one night: check_out += 1 day. The exclusion
   * constraint will reject the update if the new range overlaps with
   * another stay in the same trip — surface the DalError as-is so the
   * client can show a meaningful error.
   */
  async extendStay(stayId: string): Promise<StayWithActivity> {
    const stay = await this.findById(stayId);
    const { check_in, check_out } = parseDateRange(stay.stay_range);
    const newCheckOut = addDays(check_out, 1);
    unwrap(await this.dal.accommodations.update(stayId, {
      check_in,
      check_out: newCheckOut,
    }));
    return this.findById(stayId);
  }

  /**
   * Reduce the stay by one night: check_out -= 1 day. If the range
   * collapses to a single day, delete the stay entirely (zero nights
   * = no reservation).
   */
  async reduceStay(stayId: string): Promise<StayWithActivity | null> {
    const stay = await this.findById(stayId);
    const { check_in, check_out } = parseDateRange(stay.stay_range);
    const newCheckOut = addDays(check_out, -1);
    if (parseISODate(newCheckOut).getTime() <= parseISODate(check_in).getTime()) {
      await this.delete(stayId);
      return null;
    }
    unwrap(await this.dal.accommodations.update(stayId, {
      check_in,
      check_out: newCheckOut,
    }));
    return this.findById(stayId);
  }

  /**
   * Cross-table conversion: turn a Stop (scheduled_activities row) into
   * a Sleep (accommodation_stays). The original entity (`activities`)
   * is reused as the Property; only the per-day instance is replaced
   * with a 1-night stay starting on that day.
   *
   * Returns the new stay. The legacy `days.accommodation_*` columns are
   * NOT touched: the new model is the source of truth.
   */
  async convertScheduledToStay(scheduledId: string): Promise<StayWithActivity> {
    // Read the scheduled row (we need activity_id + day_id)
    const sched = await this.dal.trips.findScheduledById(scheduledId);
    if (!sched) throw notFound("Scheduled activity not found");

    const day = unwrap(await this.dal.trips.findDay(sched.day_id));
    if (!day.date) {
      throw badRequest("Cannot convert: the day has no date set yet");
    }

    // DELETE the scheduled occurrence
    unwrap(await this.dal.trips.unscheduleActivity(scheduledId));

    // INSERT the stay (1 night by default; user can extend with stepper)
    const checkIn = day.date;
    const checkOut = addDays(checkIn, 1);
    const stay = unwrap(await this.dal.accommodations.create({
      trip_id: day.trip_id,
      activity_id: sched.activity_id,
      check_in: checkIn,
      check_out: checkOut,
    }));

    return this.findById(stay.id);
  }

  /**
   * Cross-table conversion: turn a Sleep (accommodation_stays) back
   * into a Stop (scheduled_activities). The Property activity is reused;
   * the stay (and its nights via CASCADE) is dropped; one scheduled
   * occurrence is inserted on the stay's check-in day.
   *
   * Note: if the stay was multi-night, all the extra nights are lost.
   * The UI should warn the user before calling this.
   */
  async convertStayToScheduled(stayId: string): Promise<{ scheduledId: string }> {
    const stay = await this.findById(stayId);
    const { check_in } = parseDateRange(stay.stay_range);

    // Resolve the day for check_in
    const dayId = await this.dal.trips.dayIdForDate(stay.trip_id, check_in);
    if (!dayId) throw badRequest("Trip has no day matching the stay's check-in date");

    await this.delete(stayId);

    const created = unwrap(await this.dal.trips.scheduleActivity({
      activity_id: stay.activity_id,
      day_id: dayId,
      // type is left null: it becomes a generic stop
    }));

    return { scheduledId: created.id };
  }
}
