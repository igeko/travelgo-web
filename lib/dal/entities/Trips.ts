/**
 * lib/dal/entities/Trips.ts
 * ─────────────────────────────────────────────────────────────────
 * The Trip aggregate.
 *
 * Owns everything about a trip: its metadata (`trips`), its days
 * (`days`) and the relationship between days and activities — i.e.
 * the scheduling join (`scheduled_activities`).
 *
 * Two layers of API:
 *  • Row-level CRUD returning DalResult<DbX> (used by route handlers)
 *  • Composed reads returning the slimmer UI shapes from `domain.ts`
 *    (getTrip / getDays / getDayActivities / getSnapshot)
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { TripTable, ActivityTable } from "../tables";
import {
  DalError,
  type DalResult,
  type DbTrip,
  type DbDay,
  type DbScheduledActivity,
  type DayType,
  type AccommodationType,
  type ActivitySlot,
} from "../types";
import type { Trip, Day, Activity, TripSnapshot, BlockType, BookingStatus } from "../domain";
import type { TripHomeMeta } from "@/lib/trip-home/meta";
import type { TripAirport } from "@/lib/trip-home/airports";

// ── Input types ───────────────────────────────────────────────────

export type CreateTripInput = {
  title: string;
  subtitle?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  cover_image?: string;
  budget_total?: number;
  currency?: string;
  local_currency?: string;
  display_currency?: string;
  adults_count?: number;
  children_count?: number;
  theme_tags?: string[];
  theme_description?: string;
  home_meta?: TripHomeMeta | null;
  departure_airport?: TripAirport | null;
  arrival_airport?: TripAirport | null;
  created_by?: string;
};

export type UpdateTripInput = Partial<CreateTripInput>;

export type CreateDayInput = {
  trip_id: string;
  day_number: number;
  date?: string | null;
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
  show_map?: boolean;
  summary?: string | null;
  image_url?: string | null;
  narrative?: unknown;
};

export type ScheduleInstanceFields = {
  slot?: ActivitySlot | null;
  time?: string | null;
  position?: number;
  type?: BlockType | null;
  fuzzy?: boolean;
  instance_note?: string | null;
  booking_status?: BookingStatus | null;
  bridge_in_json?: Record<string, unknown> | null;
  bridge_out_json?: Record<string, unknown> | null;
};

export type ScheduleActivityInput = ScheduleInstanceFields & {
  activity_id: string;
  day_id: string;
};

export type UpdateScheduleInput = ScheduleInstanceFields;

export type TripSummary = {
  id: string;
  title: string | null;
  subtitle: string | null;
  start_date: string | null;
  end_date: string | null;
  day_count: number;
};

// ── Column lists for the composed UI reads ────────────────────────

const TRIP_UI_SELECT = "id, title, subtitle, destination, start_date, end_date, currency, adults_count, children_count, theme_tags, theme_description";
const DAY_UI_SELECT =
  "id, trip_id, day_number, date, city, label, day_type, accommodation_name, accommodation_address, accommodation_url, accommodation_type, accommodation_place_id, accommodation_lat, accommodation_lng, use_previous_accommodation, show_map, notes, summary, image_url, narrative";
const SCHEDULED_SELECT =
  "id, activity_id, day_id, slot, position, time, duration_min, type, fuzzy, instance_note, booking_status, bridge_in_json, bridge_out_json, created_at, updated_at";
const SCHEDULED_ACTIVITY_JOIN_SELECT =
  "id, title, short_desc, details, location, location_place_id, location_lat, location_lng, icon, hero_image, url, booking, budget_amount, budget_currency, budget_paid, budget_category, notes";

// Local row shapes for the joined scheduled_activity ↔ activity reads.
type ScheduledRow = {
  id: string;
  activity_id: string;
  day_id: string;
  slot: string | null;
  position: number | null;
  time: string | null;
  duration_min?: number | null;
  type?: string | null;
  fuzzy?: boolean | null;
  instance_note?: string | null;
  booking_status?: string | null;
  bridge_in_json?: Record<string, unknown> | null;
  bridge_out_json?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ActivityJoinRow = {
  id: string;
  title: string;
  short_desc: string | null;
  details?: string | null;
  location: string | null;
  location_place_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  icon: string | null;
  hero_image: string | null;
  url: string | null;
  booking?: string | null;
  budget_amount?: number | null;
  budget_currency?: string | null;
  budget_paid?: boolean | null;
  budget_category?: string | null;
  notes?: string | null;
};

// ── Entity class ──────────────────────────────────────────────────

export class Trips {
  constructor(private readonly db: SupabaseClient) {}

  // ── Trip rows ────────────────────────────────────────────────────

  /** All trips the current user is a member of. */
  async listForCurrentUser(): Promise<DalResult<DbTrip[]>> {
    const { data, error } = await this.db
      .from(TripTable.Trips)
      .select(`*, trip_members!inner ( user_id )`)
      .order("start_date", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTrip[], error: null };
  }

  /** Lightweight trip list with per-trip day counts (RLS-scoped). */
  async listSummaries(): Promise<DalResult<TripSummary[]>> {
    const { data, error } = await this.db
      .from(TripTable.Trips)
      .select("id, title, subtitle, start_date, end_date, days(count)")
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };

    type Row = Omit<TripSummary, "day_count"> & { days: { count: number }[] | null };
    const rows = ((data ?? []) as Row[]).map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle,
      start_date: t.start_date,
      end_date: t.end_date,
      day_count: t.days?.[0]?.count ?? 0,
    }));
    return { data: rows, error: null };
  }

  /** Single trip by ID (RLS enforces membership). */
  async findById(id: string): Promise<DalResult<DbTrip>> {
    const { data, error } = await this.db
      .from(TripTable.Trips)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTrip, error: null };
  }

  async create(input: CreateTripInput): Promise<DalResult<DbTrip>> {
    const { data, error } = await this.db
      .from(TripTable.Trips)
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTrip, error: null };
  }

  async update(id: string, input: UpdateTripInput): Promise<DalResult<DbTrip>> {
    const { data, error } = await this.db
      .from(TripTable.Trips)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTrip, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from(TripTable.Trips).delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  // ── Day rows ─────────────────────────────────────────────────────

  /** All days for a trip (full rows), ordered by day_number. */
  async listDays(tripId: string): Promise<DalResult<DbDay[]>> {
    const { data, error } = await this.db
      .from(TripTable.Days)
      .select("*")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay[], error: null };
  }

  async findDay(id: string): Promise<DalResult<DbDay>> {
    const { data, error } = await this.db
      .from(TripTable.Days)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay, error: null };
  }

  /** Days with their scheduled-activity count (day-list sidebar). */
  async listDaysWithActivityCount(
    tripId: string,
  ): Promise<DalResult<(DbDay & { activity_count: number })[]>> {
    const { data, error } = await this.db
      .from(TripTable.Days)
      .select("*, scheduled_activities(count)")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };

    const rows = (data as (DbDay & { scheduled_activities: { count: number }[] })[]).map(
      (d) => ({ ...d, activity_count: d.scheduled_activities?.[0]?.count ?? 0 }),
    );
    return { data: rows, error: null };
  }

  async createDay(input: CreateDayInput): Promise<DalResult<DbDay>> {
    const { data, error } = await this.db
      .from(TripTable.Days)
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay, error: null };
  }

  /** Insert several days at once (trip-creation flow). */
  async createDays(rows: CreateDayInput[]): Promise<DalResult<DbDay[]>> {
    if (rows.length === 0) return { data: [], error: null };
    const { data, error } = await this.db
      .from(TripTable.Days)
      .insert(rows)
      .select();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay[], error: null };
  }

  async updateDay(id: string, input: UpdateDayInput): Promise<DalResult<DbDay>> {
    const { data, error } = await this.db
      .from(TripTable.Days)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay, error: null };
  }

  /** Partial day update from a route-validated patch (no forced updated_at). */
  async patchDay(id: string, patch: Record<string, unknown>): Promise<DalResult<true>> {
    const { error } = await this.db.from(TripTable.Days).update(patch).eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  async deleteDay(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from(TripTable.Days).delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  async moveDay(id: string, newDayNumber: number): Promise<DalResult<DbDay>> {
    const { data, error } = await this.db
      .from(TripTable.Days)
      .update({ day_number: newDayNumber, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbDay, error: null };
  }

  /** Resolve the trip a day belongs to (authorization helper). */
  async tripIdForDay(dayId: string): Promise<string | null> {
    const { data } = await this.db
      .from(TripTable.Days)
      .select("trip_id")
      .eq("id", dayId)
      .maybeSingle();
    return (data as { trip_id: string } | null)?.trip_id ?? null;
  }

  // ── Day ↔ activity scheduling (scheduled_activities join) ─────────

  async scheduleActivity(
    input: ScheduleActivityInput | Record<string, unknown>,
  ): Promise<DalResult<DbScheduledActivity>> {
    const { data, error } = await this.db
      .from(TripTable.ScheduledActivities)
      .insert(input)
      .select(SCHEDULED_SELECT)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbScheduledActivity, error: null };
  }

  async updateSchedule(
    id: string,
    input: UpdateScheduleInput | Record<string, unknown>,
  ): Promise<DalResult<DbScheduledActivity>> {
    const { data, error } = await this.db
      .from(TripTable.ScheduledActivities)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(SCHEDULED_SELECT)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbScheduledActivity, error: null };
  }

  async unscheduleActivity(id: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(TripTable.ScheduledActivities)
      .delete()
      .eq("id", id);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /** Remove every scheduled occurrence from a day (entities untouched). */
  async deleteSchedulesForDay(dayId: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(TripTable.ScheduledActivities)
      .delete()
      .eq("day_id", dayId);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /** Resolve the day a scheduled-activity belongs to (authorization helper). */
  async dayIdForScheduled(scheduledActivityId: string): Promise<string | null> {
    const { data } = await this.db
      .from(TripTable.ScheduledActivities)
      .select("day_id")
      .eq("id", scheduledActivityId)
      .maybeSingle();
    return (data as { day_id: string } | null)?.day_id ?? null;
  }

  /** Fetch a single scheduled-activity row by id (raw shape, no JOIN). */
  async findScheduledById(
    scheduledActivityId: string,
  ): Promise<DbScheduledActivity | null> {
    const { data } = await this.db
      .from(TripTable.ScheduledActivities)
      .select("*")
      .eq("id", scheduledActivityId)
      .maybeSingle();
    return (data as DbScheduledActivity | null) ?? null;
  }

  /** Resolve a day id within a trip from its ISO date "YYYY-MM-DD". */
  async dayIdForDate(tripId: string, date: string): Promise<string | null> {
    const { data } = await this.db
      .from(TripTable.Days)
      .select("id")
      .eq("trip_id", tripId)
      .eq("date", date)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }

  // ── Composed UI reads (slim/merged shapes from domain.ts) ─────────

  /** Slim trip for the trip header / shell. */
  async getTrip(id: string): Promise<Trip | null> {
    const { data } = await this.db
      .from(TripTable.Trips)
      .select(TRIP_UI_SELECT)
      .eq("id", id)
      .single();
    return (data as Trip | null) ?? null;
  }

  /** Days in the UI shape (with show_map / summary / narrative). */
  async getDays(tripId: string): Promise<Day[]> {
    const { data } = await this.db
      .from(TripTable.Days)
      .select(DAY_UI_SELECT)
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true });
    return (data as Day[] | null) ?? [];
  }

  /** All scheduled activities for a day, merged with their entity data. */
  async getDayActivities(dayId: string): Promise<Activity[]> {
    const { data, error } = await this.db
      .from(TripTable.ScheduledActivities)
      .select(SCHEDULED_SELECT)
      .eq("day_id", dayId)
      .order("slot", { ascending: true, nullsFirst: false })
      .order("position", { ascending: true });

    if (error) {
      console.error("[Trips.getDayActivities] error:", error.message);
      return [];
    }
    const rows = (data ?? []) as ScheduledRow[];
    if (rows.length === 0) return [];

    const activityIds = [...new Set(rows.map((sa) => sa.activity_id))];
    const { data: activitiesData } = await this.db
      .from(ActivityTable.Activities)
      .select(SCHEDULED_ACTIVITY_JOIN_SELECT)
      .in("id", activityIds);

    const actMap = new Map(
      ((activitiesData ?? []) as ActivityJoinRow[]).map((a) => [a.id, a]),
    );

    // The trip is now reached through the day (activities are trip-agnostic).
    const tripId = (await this.tripIdForDay(dayId)) ?? undefined;

    return rows.map((sa) =>
      mergeScheduled(sa, actMap.get(sa.activity_id), tripId),
    ) as Activity[];
  }

  /** Trip + days + every activity of the trip in 4 flat queries. */
  async getSnapshot(tripId: string): Promise<TripSnapshot | null> {
    const [tripRes, daysRes] = await Promise.all([
      this.db.from(TripTable.Trips).select(TRIP_UI_SELECT).eq("id", tripId).single(),
      this.db
        .from(TripTable.Days)
        .select(DAY_UI_SELECT)
        .eq("trip_id", tripId)
        .order("day_number", { ascending: true }),
    ]);

    if (!tripRes.data) {
      if (tripRes.error) console.error("[Trips.getSnapshot] trip error:", tripRes.error.message);
      return null;
    }

    const trip = tripRes.data as unknown as Trip;
    const days = (daysRes.data ?? []) as unknown as Day[];
    if (days.length === 0) return { trip, days: [] };

    const dayIds = days.map((d) => d.id);
    const { data: scheduled } = await this.db
      .from(TripTable.ScheduledActivities)
      .select(SCHEDULED_SELECT)
      .in("day_id", dayIds)
      .order("slot", { ascending: true, nullsFirst: false })
      .order("position", { ascending: true });

    if (!scheduled || scheduled.length === 0) {
      return { trip, days: days.map((d) => ({ ...d, activities: [] })) };
    }

    const saRows = scheduled as ScheduledRow[];
    const activityIds = [...new Set(saRows.map((sa) => sa.activity_id))];
    const { data: activities } = await this.db
      .from(ActivityTable.Activities)
      .select(SCHEDULED_ACTIVITY_JOIN_SELECT)
      .in("id", activityIds);

    const actMap = new Map(
      ((activities ?? []) as ActivityJoinRow[]).map((a) => [a.id, a]),
    );

    const byDay = new Map<string, Activity[]>();
    for (const sa of saRows) {
      const item = mergeScheduled(sa, actMap.get(sa.activity_id), tripId) as Activity;
      const list = byDay.get(sa.day_id) ?? [];
      list.push(item);
      byDay.set(sa.day_id, list);
    }

    return {
      trip,
      days: days.map((d) => ({ ...d, activities: byDay.get(d.id) ?? [] })),
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mergeScheduled(
  sa: ScheduledRow,
  act: ActivityJoinRow | undefined,
  fallbackTripId?: string,
): Activity {
  return {
    id: sa.id,
    activity_id: sa.activity_id,
    day_id: sa.day_id,
    trip_id: fallbackTripId ?? "",
    slot: sa.slot as Activity["slot"],
    position: sa.position ?? 0,
    time: sa.time,
    duration_min: sa.duration_min ?? null,
    title: act?.title ?? "",
    short_desc: act?.short_desc ?? null,
    location: act?.location ?? null,
    location_place_id: act?.location_place_id ?? null,
    location_lat: act?.location_lat ?? null,
    location_lng: act?.location_lng ?? null,
    icon: act?.icon ?? null,
    hero_image: act?.hero_image ?? null,
    url: act?.url ?? null,
    booking: act?.booking ?? null,
    budget_amount: act?.budget_amount ?? null,
    budget_currency: act?.budget_currency ?? null,
    budget_paid: act?.budget_paid ?? false,
    place_enriched: null,
    // Instance-level timeline fields (live on scheduled_activities)
    type: (sa.type ?? undefined) as Activity["type"],
    fuzzy: sa.fuzzy ?? false,
    instance_note: sa.instance_note ?? null,
    booking_status: (sa.booking_status ?? null) as Activity["booking_status"],
    bridge_in_json: (sa.bridge_in_json ?? null) as Activity["bridge_in_json"],
    bridge_out_json: (sa.bridge_out_json ?? null) as Activity["bridge_out_json"],
    entity_id: sa.activity_id,
  };
}
