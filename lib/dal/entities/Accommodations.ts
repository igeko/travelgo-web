/**
 * lib/dal/entities/Accommodations.ts
 * ─────────────────────────────────────────────────────────────────
 * The Accommodation Stay entity.
 *
 * A "stay" is a lodging reservation as a range (daterange), pointing
 * to an `activities` row of category 'lodging' (the Property). The
 * per-day projection lives in `accommodation_nights` and is maintained
 * by a DB trigger as a pure function of stay_range + the trip calendar.
 *
 * This entity is read+write for stays; nights are read-only (writes
 * go through the trigger).
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { AccommodationTable } from "../tables";
import {
  DalError,
  type DalResult,
  type DbAccommodationStay,
  type DbAccommodationNight,
  type DbActivity,
  type StayBookingStatus,
} from "../types";

// ── Input types ──────────────────────────────────────────────────

export type CreateStayInput = {
  trip_id: string;
  activity_id: string;
  created_by?: string | null;
  /** ISO date "YYYY-MM-DD" — inclusive check-in. */
  check_in: string;
  /** ISO date "YYYY-MM-DD" — exclusive check-out. */
  check_out: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  booking_status?: StayBookingStatus;
  confirmation_code?: string | null;
  total_cost_amount?: number | null;
  total_cost_currency?: string | null;
  paid?: boolean;
  instance_note?: string | null;
};

export type UpdateStayInput = Partial<{
  check_in: string;
  check_out: string;
  check_in_time: string | null;
  check_out_time: string | null;
  booking_status: StayBookingStatus;
  confirmation_code: string | null;
  total_cost_amount: number | null;
  total_cost_currency: string | null;
  paid: boolean;
  instance_note: string | null;
  /** Re-pointing the stay to a different Property (e.g. user edits the hotel). */
  activity_id: string;
}>;

export type StayWithActivity = DbAccommodationStay & {
  activity: DbActivity;
};

export type NightWithStay = DbAccommodationNight & {
  stay: StayWithActivity;
};

// ── Helpers ──────────────────────────────────────────────────────

/** Serialise an ISO check-in/check-out pair into a daterange literal. */
function toDateRange(checkIn: string, checkOut: string): string {
  return `[${checkIn},${checkOut})`;
}

/**
 * Map our flat {check_in, check_out, ...} input to the DB row shape.
 * Drops undefined keys so PATCH semantics work correctly.
 */
function toRow(
  input: CreateStayInput | UpdateStayInput,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (k === "check_in" || k === "check_out") continue;
    out[k] = v;
  }
  // Build stay_range only if BOTH ends are present in the input.
  const ci = (input as CreateStayInput).check_in;
  const co = (input as CreateStayInput).check_out;
  if (ci && co) out.stay_range = toDateRange(ci, co);
  return out;
}

// ── Entity class ─────────────────────────────────────────────────

export class Accommodations {
  constructor(private readonly db: SupabaseClient) {}

  // ── Stays ──────────────────────────────────────────────────────

  /** All stays of a trip, with their Property activity, ordered by check-in. */
  async listByTrip(tripId: string): Promise<DalResult<StayWithActivity[]>> {
    const { data, error } = await this.db
      .from(AccommodationTable.Stays)
      .select(`*, activity:activities!inner ( * )`)
      .eq("trip_id", tripId);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    const rows = (data ?? []) as StayWithActivity[];
    // Sort client-side: stay_range is text in Supabase JS, sorting it via
    // .order would be lexicographic but happens to match for our format
    // [YYYY-MM-DD,YYYY-MM-DD). We sort here to keep the API stable.
    rows.sort((a, b) => a.stay_range.localeCompare(b.stay_range));
    return { data: rows, error: null };
  }

  async findById(stayId: string): Promise<DalResult<StayWithActivity | null>> {
    const { data, error } = await this.db
      .from(AccommodationTable.Stays)
      .select(`*, activity:activities!inner ( * )`)
      .eq("id", stayId)
      .maybeSingle();
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: (data as StayWithActivity | null) ?? null, error: null };
  }

  /** Resolve the trip_id of a stay. Used by route guards. */
  async tripIdOfStay(stayId: string): Promise<string | null> {
    const { data } = await this.db
      .from(AccommodationTable.Stays)
      .select("trip_id")
      .eq("id", stayId)
      .maybeSingle();
    return (data as { trip_id: string } | null)?.trip_id ?? null;
  }

  async create(
    input: CreateStayInput,
  ): Promise<DalResult<DbAccommodationStay>> {
    const row = {
      trip_id: input.trip_id,
      activity_id: input.activity_id,
      created_by: input.created_by ?? null,
      stay_range: toDateRange(input.check_in, input.check_out),
      check_in_time: input.check_in_time ?? null,
      check_out_time: input.check_out_time ?? null,
      booking_status: input.booking_status ?? "todo",
      confirmation_code: input.confirmation_code ?? null,
      total_cost_amount: input.total_cost_amount ?? null,
      total_cost_currency: input.total_cost_currency ?? null,
      paid: input.paid ?? false,
      instance_note: input.instance_note ?? null,
    };
    const { data, error } = await this.db
      .from(AccommodationTable.Stays)
      .insert(row)
      .select()
      .single();
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbAccommodationStay, error: null };
  }

  async update(
    stayId: string,
    input: UpdateStayInput,
  ): Promise<DalResult<DbAccommodationStay>> {
    const patch = { ...toRow(input), updated_at: new Date().toISOString() };
    const { data, error } = await this.db
      .from(AccommodationTable.Stays)
      .update(patch)
      .eq("id", stayId)
      .select()
      .single();
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbAccommodationStay, error: null };
  }

  async delete(stayId: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(AccommodationTable.Stays)
      .delete()
      .eq("id", stayId);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  // ── Nights (projection — read-only) ─────────────────────────────

  /**
   * All nights of a trip, with their stay + Property activity hydrated.
   * Used by the timeline render to place "sleep" items on each day.
   */
  async listNightsByTrip(tripId: string): Promise<DalResult<NightWithStay[]>> {
    const { data, error } = await this.db
      .from(AccommodationTable.Nights)
      .select(
        `*, stay:accommodation_stays!inner (
          *, activity:activities!inner ( * )
        )`,
      )
      .eq("stay.trip_id", tripId);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: (data ?? []) as NightWithStay[], error: null };
  }
}
