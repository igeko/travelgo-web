/**
 * lib/dal/entities/CategoryDurations.ts
 * ─────────────────────────────────────────────────────────────────
 * Default activity duration (minutes) per place category.
 *
 * Configuration data — small (~5 rows seeded, possibly tens later),
 * read-mostly, public to any authenticated user, writable only by
 * platform admins (enforced via RLS).
 *
 * Backs the Add-to-Trip algorithm's `resolveDuration` step: when no
 * Google Places hint is available, the algorithm tries every candidate
 * category the place provides in order and falls back to 60' if none
 * match. See `lib/planning/addToTrip/resolveDuration.ts`.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { PlanningTable } from "../tables";
import { DalError, type DalResult, type DbCategoryDuration } from "../types";

export class CategoryDurations {
  constructor(private readonly db: SupabaseClient) {}

  /** Full table (small — load once and cache at the call site). */
  async list(): Promise<DalResult<DbCategoryDuration[]>> {
    const { data, error } = await this.db
      .from(PlanningTable.CategoryDurations)
      .select("category, duration_min, label, updated_at");

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: (data ?? []) as DbCategoryDuration[], error: null };
  }

  /**
   * Category→duration map keyed by `category`. Returns an empty map if the
   * table is empty or the read fails — the algorithm tolerates a missing
   * lookup and falls back to its universal default.
   */
  async asMap(): Promise<Map<string, number>> {
    const res = await this.list();
    const map = new Map<string, number>();
    if (res.error || !res.data) return map;
    for (const row of res.data) map.set(row.category, row.duration_min);
    return map;
  }
}
