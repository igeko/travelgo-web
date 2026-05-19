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
  trip_id: string;
  title: string;
  short_desc?: string;
  details?: string;
  category?: string;
  icon?: string;
  location?: string;
  location_place_id?: string;
  location_lat?: number;
  location_lng?: number;
  hero_image?: string;
  url?: string;
};

export type UpdateActivityInput = Partial<
  Omit<CreateActivityInput, "trip_id">
>;

// ── Full activity with relations ──────────────────────────────────

export type ActivityWithSections = DbActivity & {
  sections: DbActivitySection[];
  sidebar: DbActivitySidebar[];
};

// ── Repository ────────────────────────────────────────────────────

export class ActivityRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** All activities for an entire trip (entities, independent of days). */
  async listByTrip(tripId: string): Promise<DalResult<DbActivity[]>> {
    const { data, error } = await this.db
      .from("activities")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity[], error: null };
  }

  /** Single activity with its sections, sidebar blocks, and instances (scheduled_activities). */
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
