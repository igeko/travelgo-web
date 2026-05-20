/**
 * lib/dal/entities/Activities.ts
 * ─────────────────────────────────────────────────────────────────
 * The Activity entity.
 *
 * Owns the activity as an entity (`activities`) plus its rich-content
 * relations (`activity_sections`, `activity_sidebar`), and every form
 * of activity *list* — by trip, the per-day "blocks" view, and search.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { ActivityTable, TripTable } from "../tables";
import {
  DalError,
  type DalResult,
  type DbActivity,
  type DbActivitySection,
  type DbActivitySidebar,
} from "../types";

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

export type UpdateActivityInput = Partial<Omit<CreateActivityInput, "trip_id">>;

export type ActivityWithSections = DbActivity & {
  sections: DbActivitySection[];
  sidebar: DbActivitySidebar[];
};

export type ActivitySearchInput = {
  tripId: string;
  dayId?: string | null;
  query?: string;
};

type SearchRow = Record<string, unknown> & { id: string };
export type ActivitySearchResult = {
  wishlist: (SearchRow & { in_current_day: boolean })[];
  platform: SearchRow[];
};

// Entity columns surfaced by the autocomplete search.
const SEARCH_SELECT = "id, title, short_desc, location, hero_image, trip_id";

/** Escape LIKE wildcards in user input to avoid blind enumeration via `%`/`_`. */
function escapeLikePattern(input: string): string {
  return input.replace(/([\\%_])/g, "\\$1");
}

// ── Entity class ──────────────────────────────────────────────────

export class Activities {
  constructor(private readonly db: SupabaseClient) {}

  // ── Entity rows ──────────────────────────────────────────────────

  /** All activities for an entire trip (entities, independent of days). */
  async listByTrip(tripId: string): Promise<DalResult<DbActivity[]>> {
    const { data, error } = await this.db
      .from(ActivityTable.Activities)
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity[], error: null };
  }

  /** Single activity with its sections and sidebar blocks. */
  async findById(id: string): Promise<DalResult<ActivityWithSections>> {
    const { data, error } = await this.db
      .from(ActivityTable.Activities)
      .select(
        `*, sections:activity_sections ( * ), sidebar:activity_sidebar ( * )`,
      )
      .eq("id", id)
      .order("position", { referencedTable: ActivityTable.Sections, ascending: true })
      .order("position", { referencedTable: ActivityTable.Sidebar, ascending: true })
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as ActivityWithSections, error: null };
  }

  async create(
    input: CreateActivityInput | Record<string, unknown>,
  ): Promise<DalResult<DbActivity>> {
    const { data, error } = await this.db
      .from(ActivityTable.Activities)
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity, error: null };
  }

  /** Update entity-level fields. Pass a route-validated patch object. */
  async update(
    id: string,
    input: UpdateActivityInput | Record<string, unknown>,
  ): Promise<DalResult<DbActivity>> {
    const { data, error } = await this.db
      .from(ActivityTable.Activities)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(ActivityTable.Activities)
      .delete()
      .eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /** Resolve the trip an activity belongs to (authorization helper). */
  async tripIdForActivity(activityId: string): Promise<string | null> {
    const { data } = await this.db
      .from(ActivityTable.Activities)
      .select("trip_id")
      .eq("id", activityId)
      .maybeSingle();
    return (data as { trip_id: string } | null)?.trip_id ?? null;
  }

  // ── Sections ─────────────────────────────────────────────────────

  async upsertSection(
    section: Omit<DbActivitySection, "created_at" | "updated_at">,
  ): Promise<DalResult<DbActivitySection>> {
    const { data, error } = await this.db
      .from(ActivityTable.Sections)
      .upsert({ ...section, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivitySection, error: null };
  }

  async deleteSection(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from(ActivityTable.Sections).delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  // ── Sidebar ──────────────────────────────────────────────────────

  async upsertSidebarBlock(
    block: Omit<DbActivitySidebar, "created_at">,
  ): Promise<DalResult<DbActivitySidebar>> {
    const { data, error } = await this.db
      .from(ActivityTable.Sidebar)
      .upsert(block)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivitySidebar, error: null };
  }

  async deleteSidebarBlock(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from(ActivityTable.Sidebar).delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  // ── Search / autocomplete ────────────────────────────────────────

  /**
   * Two-group autocomplete over activity entities:
   *  • wishlist — activities already in the trip, flagged if currently
   *    scheduled on the given day (via scheduled_activities)
   *  • platform — activities from other trips matching the query
   */
  async search(input: ActivitySearchInput): Promise<ActivitySearchResult> {
    const { tripId, dayId = null } = input;
    const q = (input.query ?? "").trim().slice(0, 100);
    const safeQ = q ? escapeLikePattern(q) : "";

    let wishlistQuery = this.db
      .from(ActivityTable.Activities)
      .select(SEARCH_SELECT)
      .eq("trip_id", tripId)
      .order("title", { ascending: true })
      .limit(30);

    if (safeQ) wishlistQuery = wishlistQuery.ilike("title", `%${safeQ}%`);

    const { data: wishlistRaw } = await wishlistQuery;

    // Which of these are already scheduled on the current day?
    let scheduledIds = new Set<string>();
    if (dayId) {
      const { data: scheduled } = await this.db
        .from(TripTable.ScheduledActivities)
        .select("activity_id")
        .eq("day_id", dayId);
      scheduledIds = new Set(
        ((scheduled ?? []) as { activity_id: string }[]).map((s) => s.activity_id),
      );
    }

    const wishlist = ((wishlistRaw ?? []) as SearchRow[]).map((a) => ({
      ...a,
      in_current_day: dayId ? scheduledIds.has(a.id as string) : false,
    }));

    if (!safeQ) return { wishlist, platform: [] };

    const { data: platform } = await this.db
      .from(ActivityTable.Activities)
      .select(SEARCH_SELECT)
      .neq("trip_id", tripId)
      .ilike("title", `%${safeQ}%`)
      .limit(20);

    return { wishlist, platform: (platform ?? []) as SearchRow[] };
  }
}
