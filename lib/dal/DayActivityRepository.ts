/**
 * lib/dal/DayActivityRepository.ts
 * ─────────────────────────────────────────────────────────────────
 * All DB access for `day_activities` table.
 * Manages scheduling instances: when an activity occurs on a specific day,
 * what time, slot, and instance-specific metadata (notes, booking, budget).
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "./supabase";
import {
  DalError,
  type DalResult,
  type DbActivity,
  type DbDayActivity,
  type DayActivityWithDetails,
  type ActivitySlot,
} from "./types";

// ── Input types ───────────────────────────────────────────────────

export type CreateDayActivityInput = {
  activity_id: string;
  day_id: string;
  slot?: ActivitySlot;
  time?: string;
  position?: number;
  notes?: string;
  booking?: string;
  budget_amount?: number;
  budget_currency?: string;
  budget_paid?: boolean;
  budget_category?: string;
};

export type UpdateDayActivityInput = Partial<
  Omit<CreateDayActivityInput, "activity_id" | "day_id">
>;

export type ReorderDayActivityInput = {
  id: string;
  slot: ActivitySlot;
  position: number;
};

// ── Repository ────────────────────────────────────────────────────

export class DayActivityRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** All day_activities for a specific day, ordered by slot then position. */
  async listByDay(dayId: string): Promise<DalResult<DayActivityWithDetails[]>> {
    const { data, error } = await this.db
      .from("day_activities")
      .select()
      .eq("day_id", dayId)
      .order("slot", { ascending: true, nullsFirst: false })
      .order("position", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    if (!data || data.length === 0) return { data: [], error: null };

    // Fetch activity details separately
    const activityIds = [...new Set(data.map((da) => da.activity_id))];
    const { data: activities, error: activitiesError } = await this.db
      .from("activities")
      .select()
      .in("id", activityIds);

    if (activitiesError) {
      return { data: null, error: new DalError(activitiesError.message, activitiesError.code) };
    }

    const activitiesMap = new Map(
      ((activities ?? []) as DbActivity[]).map((a) => [a.id, a]),
    );

    const merged = ((data ?? []) as DbDayActivity[]).map((da) => ({
      ...da,
      activity: activitiesMap.get(da.activity_id) as DbActivity,
    })) as DayActivityWithDetails[];

    return { data: merged, error: null };
  }

  /** Single day_activity by ID with activity details. */
  async findById(id: string): Promise<DalResult<DayActivityWithDetails>> {
    const { data, error } = await this.db
      .from("day_activities")
      .select()
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    if (!data) return { data: null, error: new DalError("Not found", "NOT_FOUND") };

    // Fetch activity details separately
    const { data: activity, error: activityError } = await this.db
      .from("activities")
      .select()
      .eq("id", data.activity_id)
      .single();

    if (activityError) {
      return { data: null, error: new DalError(activityError.message, activityError.code) };
    }

    const merged = {
      ...data,
      activity,
    } as DayActivityWithDetails;

    return { data: merged, error: null };
  }

  /** All instances (day_activities) of a single activity. */
  async listByActivityId(activityId: string): Promise<DalResult<DbDayActivity[]>> {
    const { data, error } = await this.db
      .from("day_activities")
      .select("*")
      .eq("activity_id", activityId)
      .order("day_id", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDayActivity[], error: null };
  }

  async create(input: CreateDayActivityInput): Promise<DalResult<DbDayActivity>> {
    const { data, error } = await this.db
      .from("day_activities")
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDayActivity, error: null };
  }

  async update(
    id: string,
    input: UpdateDayActivityInput,
  ): Promise<DalResult<DbDayActivity>> {
    const { data, error } = await this.db
      .from("day_activities")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDayActivity, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from("day_activities")
      .delete()
      .eq("id", id);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /**
   * Bulk-update slot + position for drag-and-drop reordering within a day.
   * Uses individual updates — Supabase does not support bulk CASE WHEN yet.
   */
  async reorder(items: ReorderDayActivityInput[]): Promise<DalResult<true>> {
    const updates = items.map((item) =>
      this.db
        .from("day_activities")
        .update({ slot: item.slot, position: item.position })
        .eq("id", item.id),
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      return {
        data: null,
        error: new DalError(failed.error.message, failed.error.code),
      };
    }
    return { data: true, error: null };
  }

  /** Move a day_activity to a different day. */
  async moveToDay(id: string, newDayId: string): Promise<DalResult<DbDayActivity>> {
    const { data, error } = await this.db
      .from("day_activities")
      .update({ day_id: newDayId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDayActivity, error: null };
  }
}
