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
import type { BookingStatus } from "../domain";
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
  /** Entity owner (the user who created it). Independent of any trip. */
  created_by: string;
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
  /** When true, only the creator can edit/delete the entity. */
  readonly?: boolean;
};

export type UpdateActivityInput = Partial<Omit<CreateActivityInput, "created_by">>;

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

/** One scheduled occurrence of an activity, surfaced alongside search hits. */
export type ActivityScheduledInstance = {
  /** ISO "YYYY-MM-DD" of the day it sits on, or null if the day has no date. */
  date: string | null;
  time: string | null;
  status: BookingStatus | null;
};

export type ActivitySearchWishlistRow = SearchRow & {
  in_current_day: boolean;
  /** Every day this activity is scheduled on (empty → still wishlist-only). */
  scheduled: ActivityScheduledInstance[];
};

export type ActivitySearchResult = {
  wishlist: ActivitySearchWishlistRow[];
  platform: SearchRow[];
};

// Entity columns surfaced by the autocomplete search.
const SEARCH_SELECT = "id, title, short_desc, location, hero_image, created_by, readonly";

/** Escape LIKE wildcards in user input to avoid blind enumeration via `%`/`_`. */
function escapeLikePattern(input: string): string {
  return input.replace(/([\\%_])/g, "\\$1");
}

// ── Entity class ──────────────────────────────────────────────────

export class Activities {
  constructor(private readonly db: SupabaseClient) {}

  // ── Entity rows ──────────────────────────────────────────────────

  /**
   * All activity entities scheduled anywhere in a trip. The trip link now
   * lives in scheduled_activities (→ days → trips), so we derive the entity
   * ids from the schedule rather than from a column on `activities`.
   */
  async listByTrip(tripId: string): Promise<DalResult<DbActivity[]>> {
    const ids = await this.activityIdsForTrip(tripId);
    if (ids.length === 0) return { data: [], error: null };

    const { data, error } = await this.db
      .from(ActivityTable.Activities)
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbActivity[], error: null };
  }

  /** Distinct activity ids scheduled in a trip (via scheduled_activities → days). */
  private async activityIdsForTrip(tripId: string): Promise<string[]> {
    const { data } = await this.db
      .from(TripTable.ScheduledActivities)
      .select("activity_id, days!inner(trip_id)")
      .eq("days.trip_id", tripId);
    return [
      ...new Set(((data ?? []) as { activity_id: string }[]).map((r) => r.activity_id)),
    ];
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

  /**
   * Authorization context for an activity entity, fully decoupled from trips:
   * its owner, its `readonly` flag, and every trip it is reachable through via
   * scheduling. Returns null if the activity does not exist. Intended to be
   * called on a service-role DAL (ground truth, bypasses RLS).
   */
  async authzContext(
    activityId: string,
  ): Promise<{ createdBy: string | null; readonly: boolean; tripIds: string[] } | null> {
    const { data: act } = await this.db
      .from(ActivityTable.Activities)
      .select("created_by, readonly")
      .eq("id", activityId)
      .maybeSingle();
    if (!act) return null;
    const row = act as { created_by: string | null; readonly: boolean | null };

    const { data: sched } = await this.db
      .from(TripTable.ScheduledActivities)
      .select("day_id")
      .eq("activity_id", activityId);
    const dayIds = [
      ...new Set(((sched ?? []) as { day_id: string }[]).map((s) => s.day_id)),
    ];

    const tripIds = new Set<string>();
    if (dayIds.length > 0) {
      const { data: days } = await this.db
        .from(TripTable.Days)
        .select("trip_id")
        .in("id", dayIds);
      for (const d of (days ?? []) as { trip_id: string }[]) tripIds.add(d.trip_id);
    }

    return { createdBy: row.created_by, readonly: row.readonly ?? false, tripIds: [...tripIds] };
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

    // "The trip's activities" = entities scheduled anywhere in this trip.
    const tripActivityIds = await this.activityIdsForTrip(tripId);

    if (tripActivityIds.length === 0) {
      // Nothing scheduled yet → no wishlist. Platform still searchable below.
      if (!safeQ) return { wishlist: [], platform: [] };
    }

    let wishlistQuery = this.db
      .from(ActivityTable.Activities)
      .select(SEARCH_SELECT)
      .in("id", tripActivityIds)
      .order("title", { ascending: true })
      .limit(30);

    if (safeQ) wishlistQuery = wishlistQuery.ilike("title", `%${safeQ}%`);

    const { data: wishlistRaw } = tripActivityIds.length > 0 ? await wishlistQuery : { data: [] };

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

    const wishlistRows = (wishlistRaw ?? []) as SearchRow[];
    const scheduledByActivity = await this.scheduledInstancesFor(
      wishlistRows.map((a) => a.id as string),
    );

    const wishlist = wishlistRows.map((a) => ({
      ...a,
      in_current_day: dayId ? scheduledIds.has(a.id as string) : false,
      scheduled: scheduledByActivity.get(a.id as string) ?? [],
    }));

    if (!safeQ) return { wishlist, platform: [] };

    // Platform = activities the caller can see (RLS: owned + their other trips)
    // that are NOT already scheduled in this trip. We exclude the trip's own
    // ids in app code to avoid building a fragile UUID `not.in` filter.
    const tripIdSet = new Set(tripActivityIds);
    const { data: platformRaw } = await this.db
      .from(ActivityTable.Activities)
      .select(SEARCH_SELECT)
      .ilike("title", `%${safeQ}%`)
      .limit(40);
    const platform = ((platformRaw ?? []) as SearchRow[])
      .filter((r) => !tripIdSet.has(r.id))
      .slice(0, 20);

    return { wishlist, platform };
  }

  /**
   * Group the scheduled occurrences (day date + time + booking status) of a
   * set of activities by activity id. Occurrences are sorted by date, then time.
   */
  private async scheduledInstancesFor(
    activityIds: string[],
  ): Promise<Map<string, ActivityScheduledInstance[]>> {
    const byActivity = new Map<string, ActivityScheduledInstance[]>();
    if (activityIds.length === 0) return byActivity;

    const { data: scheduled } = await this.db
      .from(TripTable.ScheduledActivities)
      .select("activity_id, time, booking_status, day_id")
      .in("activity_id", activityIds);

    const rows = (scheduled ?? []) as {
      activity_id: string;
      time: string | null;
      booking_status: string | null;
      day_id: string;
    }[];
    if (rows.length === 0) return byActivity;

    const dayIds = [...new Set(rows.map((r) => r.day_id))];
    const { data: days } = await this.db
      .from(TripTable.Days)
      .select("id, date")
      .in("id", dayIds);
    const dateByDay = new Map(
      ((days ?? []) as { id: string; date: string | null }[]).map((d) => [d.id, d.date]),
    );

    for (const r of rows) {
      const list = byActivity.get(r.activity_id) ?? [];
      list.push({
        date: dateByDay.get(r.day_id) ?? null,
        time: r.time,
        status: (r.booking_status ?? null) as BookingStatus | null,
      });
      byActivity.set(r.activity_id, list);
    }

    for (const list of byActivity.values()) {
      list.sort(
        (a, b) =>
          (a.date ?? "").localeCompare(b.date ?? "") ||
          (a.time ?? "").localeCompare(b.time ?? ""),
      );
    }
    return byActivity;
  }
}
