/**
 * lib/dal/ActivityRepository.ts
 * ─────────────────────────────────────────────────────────────────
 * All DB access for `activities`, `activity_sections`,
 * and `activity_sidebar` tables.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "./supabase";
import {
  DalError,
  type DalResult,
  type DbActivity,
  type DbActivitySection,
  type DbActivitySidebar,
  type ActivitySlot,
} from "./types";

// ── Input types ───────────────────────────────────────────────────

export type CreateActivityInput = {
  day_id: string;
  trip_id: string;
  title: string;
  slot?: ActivitySlot;
  position?: number;
  time?: string;
  short_desc?: string;
  details?: string;
  notes?: string;
  location?: string;
  location_place_id?: string;
  location_lat?: number;
  location_lng?: number;
  icon?: string;
  category?: string;
  hero_image?: string;
  booking?: string;
  url?: string;
  budget_amount?: number;
  budget_currency?: string;
  budget_paid?: boolean;
  budget_category?: string;
};

export type UpdateActivityInput = Partial<
  Omit<CreateActivityInput, "day_id" | "trip_id">
>;

export type ReorderActivityInput = {
  id: string;
  slot: ActivitySlot;
  position: number;
};

// ── Full activity with relations ──────────────────────────────────

export type ActivityWithSections = DbActivity & {
  sections: DbActivitySection[];
  sidebar: DbActivitySidebar[];
};

// ── Repository ────────────────────────────────────────────────────

export class ActivityRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** All activities for a day, ordered by slot then position. */
  async listByDay(dayId: string): Promise<DalResult<DbActivity[]>> {
    const { data, error } = await this.db
      .from("activities")
      .select("*")
      .eq("day_id", dayId)
      .order("slot", { ascending: true, nullsFirst: false })
      .order("position", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity[], error: null };
  }

  /** All activities for an entire trip. */
  async listByTrip(tripId: string): Promise<DalResult<DbActivity[]>> {
    const { data, error } = await this.db
      .from("activities")
      .select("*")
      .eq("trip_id", tripId)
      .order("day_id", { ascending: true })
      .order("position", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity[], error: null };
  }

  /** Single activity with its sections and sidebar blocks. */
  async findById(id: string): Promise<DalResult<ActivityWithSections>> {
    const { data, error } = await this.db
      .from("activities")
      .select(
        `
        *,
        sections:activity_sections ( * ),
        sidebar:activity_sidebar ( * )
        `,
      )
      .eq("id", id)
      .order("position", { referencedTable: "activity_sections", ascending: true })
      .order("position", { referencedTable: "activity_sidebar", ascending: true })
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as ActivityWithSections, error: null };
  }

  async create(input: CreateActivityInput): Promise<DalResult<DbActivity>> {
    const { data, error } = await this.db
      .from("activities")
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity, error: null };
  }

  async update(
    id: string,
    input: UpdateActivityInput,
  ): Promise<DalResult<DbActivity>> {
    const { data, error } = await this.db
      .from("activities")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from("activities").delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /**
   * Bulk-update slot + position for drag-and-drop reordering.
   * Uses individual updates — Supabase does not support bulk CASE WHEN yet.
   */
  async reorder(items: ReorderActivityInput[]): Promise<DalResult<true>> {
    const updates = items.map((item) =>
      this.db
        .from("activities")
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

  // ── Sections ─────────────────────────────────────────────────────

  async upsertSection(
    section: Omit<DbActivitySection, "created_at" | "updated_at">,
  ): Promise<DalResult<DbActivitySection>> {
    const { data, error } = await this.db
      .from("activity_sections")
      .upsert({ ...section, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivitySection, error: null };
  }

  async deleteSection(id: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from("activity_sections")
      .delete()
      .eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  // ── Sidebar ──────────────────────────────────────────────────────

  async upsertSidebarBlock(
    block: Omit<DbActivitySidebar, "created_at">,
  ): Promise<DalResult<DbActivitySidebar>> {
    const { data, error } = await this.db
      .from("activity_sidebar")
      .upsert(block)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivitySidebar, error: null };
  }

  async deleteSidebarBlock(id: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from("activity_sidebar")
      .delete()
      .eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
