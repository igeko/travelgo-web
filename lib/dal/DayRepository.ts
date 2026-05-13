/**
 * lib/dal/DayRepository.ts
 * ─────────────────────────────────────────────────────────────────
 * All DB access for the `days` table.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "./supabase";
import {
  DalError,
  type DalResult,
  type DbDay,
  type DayType,
  type AccommodationType,
} from "./types";

// ── Input types ───────────────────────────────────────────────────

export type CreateDayInput = {
  trip_id: string;
  day_number: number;
  date?: string;
  city?: string;
  label?: string;
  notes?: string;
  day_type?: DayType;
  is_ghost?: boolean;
};

export type UpdateDayInput = {
  date?: string;
  city?: string;
  label?: string;
  notes?: string;
  day_type?: DayType | null;
  is_ghost?: boolean;
  use_previous_accommodation?: boolean;
  accommodation_type?: AccommodationType | null;
  accommodation_name?: string | null;
  accommodation_address?: string | null;
  accommodation_url?: string | null;
  accommodation_notes?: string | null;
  accommodation_place_id?: string | null;
  accommodation_lat?: number | null;
  accommodation_lng?: number | null;
  accommodation_cost_amount?: number | null;
  accommodation_cost_currency?: string | null;
  accommodation_cost_paid?: boolean;
};

// ── Repository ────────────────────────────────────────────────────

export class DayRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** All days for a trip, ordered by day_number. */
  async listByTrip(tripId: string): Promise<DalResult<DbDay[]>> {
    const { data, error } = await this.db
      .from("days")
      .select("*")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay[], error: null };
  }

  /** Single day by ID. */
  async findById(id: string): Promise<DalResult<DbDay>> {
    const { data, error } = await this.db
      .from("days")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay, error: null };
  }

  /** Days with their activity count (useful for the day list sidebar). */
  async listWithActivityCount(
    tripId: string,
  ): Promise<DalResult<(DbDay & { activity_count: number })[]>> {
    const { data, error } = await this.db
      .from("days")
      .select("*, activities(count)")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };

    const rows = (data as (DbDay & { activities: { count: number }[] })[]).map(
      (d) => ({
        ...d,
        activity_count: d.activities?.[0]?.count ?? 0,
      }),
    );

    return { data: rows, error: null };
  }

  async create(input: CreateDayInput): Promise<DalResult<DbDay>> {
    const { data, error } = await this.db
      .from("days")
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay, error: null };
  }

  async update(id: string, input: UpdateDayInput): Promise<DalResult<DbDay>> {
    const { data, error } = await this.db
      .from("days")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from("days").delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /** Reorder a day — updates day_number and shifts siblings. */
  async moveTo(id: string, newDayNumber: number): Promise<DalResult<DbDay>> {
    const { data, error } = await this.db
      .from("days")
      .update({ day_number: newDayNumber, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay, error: null };
  }
}
