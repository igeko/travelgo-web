/**
 * lib/services/TripService.ts
 * ─────────────────────────────────────────────────────────────────
 * Trip application service: list, snapshot, creation (trip + owner +
 * generated days) and day metadata updates. Orchestration lives here;
 * routes stay thin.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal, TripSummary, TripSnapshot, DbTrip, DbDay, UpdateTripInput, Activity } from "@/lib/dal";
import type { BridgeData } from "@/lib/dal/domain";
import { notFound, badRequest, upstream } from "@/lib/api/errors";
import type { Scheduler } from "./Scheduler";
import { isCurrencyCode } from "@/lib/api/validation";
import { chatJson } from "@/lib/ai/llm";
import {
  normalizeDestination,
  type BoardingMeta,
  type PlaceMeta,
  type HomeMeta,
  type TripHomeMeta,
} from "@/lib/trip-home/meta";
import { buildHomeMessages, parseHomeMeta } from "@/lib/trip-home/home-prompt";
import { type TripAirport } from "@/lib/trip-home/airports";
import { unwrap } from "./util";
import {
  addPlaceToTrip,
  AddToTripError,
  snapshotToPlan,
  type AddWarning,
  type CandidatePlace,
} from "@/lib/planning/addToTrip";
import { computeRoutes } from "@/lib/maps/provider";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type CreateTripRequest = {
  title?: unknown;
  subtitle?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  currency?: unknown;
};

/** Editable trip fields exposed by the Trip Edit page. */
export type UpdateTripPatch = {
  title?: string;
  subtitle?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  adults_count?: number | null;
  children_count?: number | null;
  theme_tags?: string[];
  theme_description?: string | null;
  departure_airport?: TripAirport | null;
  arrival_airport?: TripAirport | null;
};

const MAX_TRIP_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Wire input for `addPlace`. Mirrors `CandidatePlace` from the planning
 * lib but kept inline so route handlers don't need a second import.
 */
export type AddPlaceInput = {
  placeId: string | null;
  title: string;
  lat: number;
  lng: number;
  categories?: string[];
  durationHintMin?: number | null;
  isAccommodation?: boolean;
  /** STOP_ICONS key da persistere sull'entity activity. Tipicamente
   *  l'icona della sub-category ExploreToolbar che ha generato il pin. */
  icon?: string | null;
};

export type AddPlaceContext = {
  selectedDayId?: string | null;
  selectedActivityId?: string | null;
};

export type AddPlaceResult = {
  scheduledActivity: Activity;
  position: {
    dayId: string;
    dayNumber: number;
    afterActivityId: string | null;
    /** Title of the activity the new stop landed after — for the UI pill. */
    afterTitle: string | null;
  };
  warnings: AddWarning[];
};

/**
 * BridgeData.transport → Google Routes API travelMode. Walk/bike/car/bus/
 * train all have a direct match; metro and taxi don't and we fall back to
 * the closest reasonable mode (TRANSIT and DRIVE respectively).
 */
const TRANSPORT_TO_GOOGLE_TRAVEL_MODE: Record<BridgeData["transport"], string> = {
  walk: "WALK",
  bike: "BICYCLE",
  car: "DRIVE",
  taxi: "DRIVE",
  bus: "TRANSIT",
  metro: "TRANSIT",
  train: "TRANSIT",
};

function safeIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : value;
}

/** Validate/normalize a user-set airport; null clears it. IATA must be 3 letters. */
function normalizeAirport(input: TripAirport | null): TripAirport | null {
  if (!input) return null;
  const city = (input.city ?? "").trim();
  const iata = (input.iata ?? "").trim().toUpperCase();
  if (iata && !/^[A-Z]{3}$/.test(iata)) throw badRequest("Airport code must be 3 letters");
  if (!city && !iata) return null;
  return { city, iata };
}

/** Every ISO date from start..end inclusive (capped). */
function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = Date.parse(`${start}T00:00:00Z`);
  const last = Date.parse(`${end}T00:00:00Z`);
  while (cursor <= last && dates.length < MAX_TRIP_DAYS) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += DAY_MS;
  }
  return dates;
}

export class TripService {
  constructor(
    private readonly dal: Dal,
    /** Scheduling engine — private; reach it only through this service's
     *  scheduling methods so the day↔activity write-path stays single. */
    private readonly scheduler: Scheduler,
  ) {}

  /** All trips for the current user (with day counts). */
  listSummaries(): Promise<TripSummary[]> {
    return this.dal.trips.listSummaries().then(unwrap);
  }

  /** Trip + days + activities, or 404. */
  async getSnapshot(tripId: string): Promise<TripSnapshot> {
    const snapshot = await this.dal.trips.getSnapshot(tripId);
    if (!snapshot) throw notFound("Trip not found");
    return snapshot;
  }

  /** Delete a trip (owner-only; cascades to days/activities via FK). */
  async delete(tripId: string): Promise<void> {
    unwrap(await this.dal.trips.delete(tripId));
  }

  /**
   * Patch editable trip fields (Trip Edit page). Validates dates, persists
   * the change, then reconciles days when the date range moved.
   */
  async update(tripId: string, patch: UpdateTripPatch): Promise<DbTrip> {
    const update: UpdateTripInput = {};

    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) throw badRequest("Title is required");
      if (title.length > 200) throw badRequest("Title too long");
      update.title = title;
    }
    if (patch.subtitle !== undefined) {
      update.subtitle = patch.subtitle ? patch.subtitle.trim().slice(0, 500) : null;
    }
    if (patch.destination !== undefined) {
      update.destination = patch.destination ? patch.destination.trim().slice(0, 200) : null;
    }

    // Resolve the effective range (incoming value, else current row) so we can
    // validate ordering and decide whether days need reconciling.
    let nextStart: string | null | undefined;
    let nextEnd: string | null | undefined;

    if (patch.start_date !== undefined) {
      if (patch.start_date === null) {
        nextStart = null;
      } else {
        const d = safeIsoDate(patch.start_date);
        if (!d) throw badRequest("Invalid start_date (expected YYYY-MM-DD)");
        nextStart = d;
      }
      update.start_date = nextStart;
    }
    if (patch.end_date !== undefined) {
      if (patch.end_date === null) {
        nextEnd = null;
      } else {
        const d = safeIsoDate(patch.end_date);
        if (!d) throw badRequest("Invalid end_date (expected YYYY-MM-DD)");
        nextEnd = d;
      }
      update.end_date = nextEnd;
    }

    if (patch.adults_count !== undefined) update.adults_count = patch.adults_count ?? undefined;
    if (patch.children_count !== undefined) {
      update.children_count = patch.children_count ?? undefined;
    }
    if (patch.theme_tags !== undefined) update.theme_tags = patch.theme_tags;
    if (patch.theme_description !== undefined) {
      update.theme_description = patch.theme_description ?? undefined;
    }
    if (patch.departure_airport !== undefined) {
      update.departure_airport = normalizeAirport(patch.departure_airport);
    }
    if (patch.arrival_airport !== undefined) {
      update.arrival_airport = normalizeAirport(patch.arrival_airport);
    }

    const datesChanged = patch.start_date !== undefined || patch.end_date !== undefined;

    // Validate the effective end >= start before any write.
    if (datesChanged) {
      const current = nextStart === undefined || nextEnd === undefined
        ? unwrap(await this.dal.trips.findById(tripId))
        : null;
      const effectiveStart = nextStart !== undefined ? nextStart : current?.start_date ?? null;
      const effectiveEnd = nextEnd !== undefined ? nextEnd : current?.end_date ?? null;
      if (effectiveStart && effectiveEnd && new Date(effectiveEnd) < new Date(effectiveStart)) {
        throw badRequest("end_date precedes start_date");
      }
      nextStart = effectiveStart;
      nextEnd = effectiveEnd;
    }

    const trip = unwrap(await this.dal.trips.update(tripId, update));

    if (datesChanged && nextStart && nextEnd) {
      await this.reconcileDays(tripId, nextStart, nextEnd);
    }

    return trip;
  }

  /**
   * Project the [start, end] date range onto the existing day list as an
   * overlay (model B: the ordered day list is the source of truth, dates are
   * an overlay). Dates map onto days in list order; if the range has more dates
   * than days the surplus is appended as new dated days; if it has fewer, the
   * trailing days keep their position but lose their date. NO day is ever
   * deleted here, so scheduled activities are never lost — to drop a day the
   * caller uses `removeDay`.
   */
  private async reconcileDays(tripId: string, start: string, end: string): Promise<void> {
    const desired = enumerateDates(start, end);
    const existing = (unwrap(await this.dal.trips.listDays(tripId)) ?? []) as DbDay[];

    // Target date for each existing day, in list order; surplus days → null.
    const targets = existing.map((_, i) => (i < desired.length ? desired[i] : null));

    // Two-phase to avoid transient (trip_id, date) unique collisions when dates
    // shift across days: first clear every changing date, then assign the new
    // ones (days whose target is null simply stay cleared).
    const changing = existing.filter((d, i) => d.date !== targets[i]);
    for (const d of changing) unwrap(await this.dal.trips.patchDay(d.id, { date: null }));
    for (let i = 0; i < existing.length; i++) {
      if (existing[i].date !== targets[i] && targets[i] !== null) {
        unwrap(await this.dal.trips.patchDay(existing[i].id, { date: targets[i] }));
      }
    }

    // More dates than days → append the surplus as new dated days at the end.
    if (desired.length > existing.length) {
      let dayNumber = existing.reduce((max, d) => Math.max(max, d.day_number), 0) + 1;
      const rows = desired.slice(existing.length).map((date) => ({
        trip_id: tripId,
        day_number: dayNumber++,
        date,
      }));
      unwrap(await this.dal.trips.createDays(rows));
    }
  }

  /**
   * Create a trip, add the creator as owner, and generate one day per
   * date in [start_date, end_date]. Requires a service-scoped DAL.
   */
  async create(body: CreateTripRequest, createdBy: string): Promise<{ id: string }> {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) throw badRequest("Title is required");
    if (title.length > 200) throw badRequest("Title too long");

    const subtitle = typeof body.subtitle === "string" ? body.subtitle.trim().slice(0, 500) : "";
    const startDate = body.start_date ? safeIsoDate(body.start_date) : null;
    const endDate = body.end_date ? safeIsoDate(body.end_date) : null;
    if (body.start_date && !startDate) throw badRequest("Invalid start_date (expected YYYY-MM-DD)");
    if (body.end_date && !endDate) throw badRequest("Invalid end_date (expected YYYY-MM-DD)");
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      throw badRequest("end_date precedes start_date");
    }

    const currency = isCurrencyCode(body.currency) ? body.currency : "EUR";

    const trip = unwrap(
      await this.dal.trips.create({
        title,
        subtitle: subtitle || null,
        start_date: startDate,
        end_date: endDate,
        currency,
        local_currency: currency,
        display_currency: currency,
        created_by: createdBy,
      }),
    );

    unwrap(await this.dal.members.add({ trip_id: trip.id, user_id: createdBy, role: "owner" }));

    if (startDate && endDate) {
      const rows = [];
      const current = new Date(startDate);
      const end = new Date(endDate);
      let dayNumber = 1;
      while (current <= end && dayNumber <= 366) {
        rows.push({
          trip_id: trip.id,
          day_number: dayNumber++,
          date: current.toISOString().split("T")[0],
        });
        current.setDate(current.getDate() + 1);
      }
      if (rows.length > 0) unwrap(await this.dal.trips.createDays(rows));
    }

    return { id: trip.id };
  }

  /** Patch day metadata (route validates/whitelists the patch). */
  async updateDay(dayId: string, patch: Record<string, unknown>): Promise<void> {
    unwrap(await this.dal.trips.patchDay(dayId, patch));
  }

  // ── Day-list engine (model B: the ordered day list is the source of ──
  //    truth; dates are an overlay). Positions are 1-based `day_number`.
  //    Every reorder operates on stable `day_id` rows and only renumbers
  //    them in place — never delete-and-recreate — so each day's
  //    scheduled activities (linked by day_id) ride along untouched.

  /**
   * Assign 1..N day_numbers to the given day ids in order, two-phase to avoid
   * transient (trip_id, day_number) unique collisions: park everyone in a high,
   * collision-free range, then assign final numbers.
   */
  private async renumberDays(orderedDayIds: string[]): Promise<void> {
    const PARK = 100_000;
    for (let i = 0; i < orderedDayIds.length; i++)
      unwrap(await this.dal.trips.patchDay(orderedDayIds[i], { day_number: PARK + i }));
    for (let i = 0; i < orderedDayIds.length; i++)
      unwrap(await this.dal.trips.patchDay(orderedDayIds[i], { day_number: i + 1 }));
  }

  /** Days ordered by day_number. */
  private async orderedDays(tripId: string): Promise<DbDay[]> {
    return (unwrap(await this.dal.trips.listDays(tripId)) ?? []) as DbDay[];
  }

  /**
   * Insert `count` new (dateless) days starting at position `atPosition`,
   * shifting the existing days at/after that position later. Returns the
   * created days with their final numbers.
   */
  async insertDays(tripId: string, atPosition: number, count = 1): Promise<DbDay[]> {
    if (!Number.isInteger(count) || count < 1) throw badRequest("count must be a positive integer");
    const days = await this.orderedDays(tripId);
    const at = Math.min(Math.max(Math.trunc(atPosition), 1), days.length + 1);

    // Provisional unique numbers past the current max; renumber fixes order.
    let provisional = days.reduce((max, d) => Math.max(max, d.day_number), 0) + 1;
    const createdIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const created = unwrap(
        await this.dal.trips.createDay({ trip_id: tripId, day_number: provisional++ }),
      );
      createdIds.push(created.id);
    }

    const order = [
      ...days.slice(0, at - 1).map((d) => d.id),
      ...createdIds,
      ...days.slice(at - 1).map((d) => d.id),
    ];
    await this.renumberDays(order);

    const after = await this.orderedDays(tripId);
    const createdSet = new Set(createdIds);
    return after.filter((d) => createdSet.has(d.id));
  }

  /**
   * Delete a day (its scheduled activities cascade) and close the gap by
   * renumbering the remaining days. The only sanctioned day deletion.
   */
  async removeDay(tripId: string, dayId: string): Promise<void> {
    unwrap(await this.dal.trips.deleteDay(dayId));
    const remaining = await this.orderedDays(tripId);
    await this.renumberDays(remaining.map((d) => d.id));
  }

  /** Move a day to `toPosition`, shifting the others; its activities follow. */
  async moveDay(tripId: string, dayId: string, toPosition: number): Promise<void> {
    const days = await this.orderedDays(tripId);
    const from = days.findIndex((d) => d.id === dayId);
    if (from === -1) throw notFound("Day not found");
    const to = Math.min(Math.max(Math.trunc(toPosition), 1), days.length) - 1;
    if (to === from) return;
    const order = days.map((d) => d.id);
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    await this.renumberDays(order);
  }

  /** Swap the positions of two days (each keeps its own activities). */
  async swapDays(tripId: string, dayIdA: string, dayIdB: string): Promise<void> {
    if (dayIdA === dayIdB) return;
    const days = await this.orderedDays(tripId);
    const a = days.findIndex((d) => d.id === dayIdA);
    const b = days.findIndex((d) => d.id === dayIdB);
    if (a === -1 || b === -1) throw notFound("Day not found");
    const order = days.map((d) => d.id);
    [order[a], order[b]] = [order[b], order[a]];
    await this.renumberDays(order);
  }

  /**
   * Duplicate a day right after it: copies the day's metadata (dateless) and
   * re-schedules a fresh occurrence of each of its activities (entities are
   * shared, not duplicated). Returns the new day.
   */
  async duplicateDay(tripId: string, dayId: string): Promise<DbDay> {
    const source = unwrap(await this.dal.trips.findDay(dayId)) as DbDay;
    const [created] = await this.insertDays(tripId, source.day_number + 1, 1);

    // Copy metadata the create input doesn't carry (dates intentionally omitted).
    const COPY_FIELDS = [
      "city", "label", "notes", "day_type", "is_ghost", "use_previous_accommodation",
      "accommodation_type", "accommodation_name", "accommodation_address", "accommodation_url",
      "accommodation_notes", "accommodation_place_id", "accommodation_lat", "accommodation_lng",
      "accommodation_cost_amount", "accommodation_cost_currency", "accommodation_cost_paid",
      "show_map", "summary", "image_url", "narrative",
    ] as const;
    const src = source as unknown as Record<string, unknown>;
    const meta: Record<string, unknown> = {};
    for (const f of COPY_FIELDS) if (src[f] !== undefined && src[f] !== null) meta[f] = src[f];
    if (Object.keys(meta).length > 0) unwrap(await this.dal.trips.patchDay(created.id, meta));

    // Re-schedule a fresh occurrence of each activity onto the new day.
    const acts = await this.scheduler.listForDay(dayId);
    for (const a of acts) {
      unwrap(
        await this.dal.trips.scheduleActivity({
          activity_id: a.activity_id,
          day_id: created.id,
          slot: a.slot ?? null,
          time: a.time ?? null,
          position: a.position ?? null,
          type: a.type ?? null,
          fuzzy: a.fuzzy ?? null,
          instance_note: a.instance_note ?? null,
          booking_status: a.booking_status ?? null,
          bridge_in_json: a.bridge_in_json ?? null,
          bridge_out_json: a.bridge_out_json ?? null,
        } as Record<string, unknown>),
      );
    }

    return unwrap(await this.dal.trips.findDay(created.id)) as DbDay;
  }

  /** Remove every scheduled activity from a day (entities left intact). */
  async clearDay(dayId: string): Promise<void> {
    unwrap(await this.dal.trips.deleteSchedulesForDay(dayId));
  }

  // ── Scheduling (day ↔ activity). Thin delegations to the private ─────
  //    Scheduler engine; this is the only public surface for scheduling.

  /** Activities scheduled on a day (entity + instance merged). */
  listDayActivities(dayId: string): Promise<Activity[]> {
    return this.scheduler.listForDay(dayId);
  }

  /** Schedule an existing or brand-new activity onto a day. */
  schedule(dayId: string, body: Record<string, unknown>): Promise<Activity> {
    return this.scheduler.addToDay(dayId, body);
  }

  /** Schedule several activities; returns the created/merged blocks. */
  async scheduleMany(entries: { dayId: string; body: Record<string, unknown> }[]): Promise<Activity[]> {
    const out: Activity[] = [];
    for (const e of entries) out.push(await this.scheduler.addToDay(e.dayId, e.body));
    return out;
  }

  /** Update instance/timeline fields of one scheduled occurrence. */
  updateInstance(scheduledId: string, body: Record<string, unknown>): Promise<void> {
    return this.scheduler.updateInstance(scheduledId, body);
  }

  /** Move a scheduled occurrence to another day. */
  moveActivity(scheduledId: string, dayId: string, instance: Record<string, unknown> = {}): Promise<void> {
    return this.scheduler.moveToDay(scheduledId, dayId, instance);
  }

  /** Reorder occurrences on a day (position/slot). */
  reorderDay(dayId: string, items: { id: string; position: number; slot?: string | null }[]): Promise<Activity[]> {
    return this.scheduler.reorder(dayId, items);
  }

  /**
   * Move a scheduled occurrence one slot up/down. Intra-day = swap with the
   * adjacent activity. Cross-day on border = jump to the end (up→last of
   * previous day) or to the start (down→first of next day). No-op when there
   * is no neighbour in the requested direction (first item of first day with
   * direction=up, or last item of last day with direction=down).
   *
   * After the move, bridges_in/out are recomputed for the affected legs so
   * the polyline durations stay in sync (Google Routes round-trip).
   */
  async moveOneSlot(scheduledId: string, direction: "up" | "down"): Promise<void> {
    const fromDayId = await this.dal.trips.dayIdForScheduled(scheduledId);
    if (!fromDayId) throw notFound("Scheduled activity not found");

    const acts = (await this.scheduler.listForDay(fromDayId)).sort(
      (a, b) => a.position - b.position,
    );
    const idx = acts.findIndex((a) => a.id === scheduledId);
    if (idx === -1) throw notFound("Scheduled activity not found in day");

    const target = acts[idx];

    // ── Intra-day swap ────────────────────────────────────────────
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < acts.length) {
      const other = acts[swapIdx];
      await this.scheduler.reorder(fromDayId, [
        { id: target.id, position: other.position },
        { id: other.id,  position: target.position },
      ]);

      // Recompute bridges around the moved activity in its new position.
      // Reload the day so prev/next reflect post-swap order.
      const post = (await this.scheduler.listForDay(fromDayId)).sort(
        (a, b) => a.position - b.position,
      );
      const newIdx = post.findIndex((a) => a.id === target.id);
      const prev = newIdx > 0 ? post[newIdx - 1] : null;
      const next = newIdx < post.length - 1 ? post[newIdx + 1] : null;
      if (target.location_lat != null && target.location_lng != null) {
        await this.recomputeBridgesAround({
          newScheduledId: target.id,
          newLat: target.location_lat,
          newLng: target.location_lng,
          prev,
          next,
        });
      }
      return;
    }

    // ── Cross-day on border ──────────────────────────────────────
    const tripId = await this.dal.trips.tripIdForDay(fromDayId);
    if (!tripId) throw notFound("Trip not found for day");
    const daysRes = await this.dal.trips.listDays(tripId);
    const allDays = (daysRes.data ?? []).sort((a, b) => a.day_number - b.day_number);
    const dayIdx = allDays.findIndex((d) => d.id === fromDayId);
    const targetDayIdx = direction === "up" ? dayIdx - 1 : dayIdx + 1;
    if (targetDayIdx < 0 || targetDayIdx >= allDays.length) {
      // No-op: already at the very start (or end) of the trip.
      return;
    }
    const toDayId = allDays[targetDayIdx].id;

    // Move to the new day first; the Scheduler keeps slot/time/type via
    // moveToDay(default instance copy). Then set its position to last
    // (direction=up) or first (direction=down) and renumber.
    await this.scheduler.moveToDay(scheduledId, toDayId, {});

    const destActs = (await this.scheduler.listForDay(toDayId)).sort(
      (a, b) => a.position - b.position,
    );
    const moved = destActs.find((a) => a.id === scheduledId);
    if (!moved) return;
    const others = destActs.filter((a) => a.id !== scheduledId);
    const items =
      direction === "up"
        ? [...others, moved].map((a, i) => ({ id: a.id, position: i + 1 }))
        : [moved, ...others].map((a, i) => ({ id: a.id, position: i + 1 }));
    await this.scheduler.reorder(toDayId, items);

    // Bridges: ricalcola sul nuovo giorno (around the moved activity).
    const post = (await this.scheduler.listForDay(toDayId)).sort(
      (a, b) => a.position - b.position,
    );
    const newIdx = post.findIndex((a) => a.id === moved.id);
    const prev = newIdx > 0 ? post[newIdx - 1] : null;
    const next = newIdx < post.length - 1 ? post[newIdx + 1] : null;
    if (moved.location_lat != null && moved.location_lng != null) {
      await this.recomputeBridgesAround({
        newScheduledId: moved.id,
        newLat: moved.location_lat,
        newLng: moved.location_lng,
        prev,
        next,
      });
    }
  }

  /** Copy a scheduled occurrence onto another day (original kept). */
  async copyActivity(scheduledId: string, toDayId: string): Promise<Activity> {
    const fromDayId = await this.dal.trips.dayIdForScheduled(scheduledId);
    if (!fromDayId) throw notFound("Scheduled activity not found");
    const block = (await this.scheduler.listForDay(fromDayId)).find((b) => b.id === scheduledId);
    if (!block) throw notFound("Scheduled activity not found");
    return this.scheduler.addToDay(toDayId, {
      activity_id: block.activity_id,
      slot: block.slot ?? undefined,
      time: block.time ?? undefined,
      type: block.type ?? undefined,
    });
  }

  /** Set/clear a transport bridge (in/out) on a scheduled occurrence. */
  setBridge(scheduledId: string, direction: "in" | "out", bridge: Record<string, unknown> | null): Promise<void> {
    return this.scheduler.setBridge(scheduledId, direction, bridge);
  }

  /** Unschedule an occurrence (entity untouched). */
  unschedule(scheduledId: string): Promise<void> {
    return this.scheduler.removeFromDay(scheduledId);
  }

  /**
   * Drag&drop move: place a scheduled occurrence at an explicit position on
   * a (possibly different) day. `targetIndex` is 0-based and refers to the
   * desired final index **after** the move, computed against the destination
   * day's existing items (with the moved one already excluded if it was on
   * the same day).
   *
   * Intra-day = pure reorder. Cross-day = moveToDay + reorder. In either
   * case bridges are recomputed around the moved activity (prev/next legs).
   */
  async moveToPosition(
    scheduledId: string,
    targetDayId: string,
    targetIndex: number,
  ): Promise<void> {
    const fromDayId = await this.dal.trips.dayIdForScheduled(scheduledId);
    if (!fromDayId) throw notFound("Scheduled activity not found");

    // Cross-day: move first, so listForDay(targetDayId) sees the activity
    // in its new home before we renumber positions.
    if (fromDayId !== targetDayId) {
      await this.scheduler.moveToDay(scheduledId, targetDayId, {});
    }

    const destActs = (await this.scheduler.listForDay(targetDayId)).sort(
      (a, b) => a.position - b.position,
    );
    const moved = destActs.find((a) => a.id === scheduledId);
    if (!moved) throw notFound("Scheduled activity disappeared during move");

    const others = destActs.filter((a) => a.id !== scheduledId);
    const clampedIndex = Math.max(0, Math.min(targetIndex, others.length));
    const ordered = [
      ...others.slice(0, clampedIndex),
      moved,
      ...others.slice(clampedIndex),
    ];
    const items = ordered.map((a, i) => ({ id: a.id, position: i + 1 }));
    await this.scheduler.reorder(targetDayId, items);

    // Bridges: ricalcola attorno alla posizione nuova.
    const post = (await this.scheduler.listForDay(targetDayId)).sort(
      (a, b) => a.position - b.position,
    );
    const newIdx = post.findIndex((a) => a.id === scheduledId);
    const prev = newIdx > 0 ? post[newIdx - 1] : null;
    const next = newIdx < post.length - 1 ? post[newIdx + 1] : null;
    if (moved.location_lat != null && moved.location_lng != null) {
      await this.recomputeBridgesAround({
        newScheduledId: moved.id,
        newLat: moved.location_lat,
        newLng: moved.location_lng,
        prev,
        next,
      });
    }
  }

  /** AI reorder of a day: decides the order, then applies it via reorderDay. */
  organize(dayId: string): Promise<Activity[]> {
    return this.scheduler.organize(dayId);
  }

  /**
   * Add a place picked from Explore to the trip.
   *
   * Orchestrates the brief 06 algorithm end-to-end:
   *   1. snapshot + category durations → plan
   *   2. addPlaceToTrip → { activity, position, warnings }
   *   3. persist via Scheduler.addToDay
   *   4. recompute the two bridges that span the new stop
   *      (prev→new and new→next), inheriting the broken bridge's transport
   *
   * Returns the merged scheduled Activity, a position payload with the
   * day number + the title of the activity it landed after (for the UI
   * pill), and any non-blocking warnings raised by the algorithm.
   */
  async addPlace(
    tripId: string,
    place: AddPlaceInput,
    context: AddPlaceContext = {},
  ): Promise<AddPlaceResult> {
    const snapshot = await this.dal.trips.getSnapshot(tripId);
    if (!snapshot) throw notFound("Trip not found");
    const durationMap = await this.dal.categoryDurations.asMap();
    const plan = snapshotToPlan(snapshot);

    const candidate: CandidatePlace = {
      placeId: place.placeId ?? null,
      title: place.title,
      lat: place.lat,
      lng: place.lng,
      categories: place.categories ?? [],
      durationHintMin: place.durationHintMin ?? null,
      isAccommodation: !!place.isAccommodation,
    };

    let outcome;
    try {
      outcome = addPlaceToTrip(plan, candidate, {
        selectedDayId: context.selectedDayId ?? null,
        selectedActivityId: context.selectedActivityId ?? null,
        getCategoryDurationMin: (cat) => durationMap.get(cat) ?? null,
      });
    } catch (err) {
      if (err instanceof AddToTripError) throw badRequest(err.message);
      throw err;
    }
    const { activity: built, position, warnings } = outcome;

    // Capture prev/next BEFORE the insertion mutates the day. Both are needed
    // for the bridge recalc + the "after X" label in the UI pill.
    const targetDay = snapshot.days.find((d) => d.id === position.dayId);
    if (!targetDay) throw upstream("Day disappeared between plan and persist");
    const sortedActs = [...targetDay.activities].sort((a, b) => a.position - b.position);

    let prevActivity: Activity | null = null;
    let nextActivity: Activity | null = null;
    if (position.afterActivityId) {
      const idx = sortedActs.findIndex((a) => a.id === position.afterActivityId);
      if (idx >= 0) {
        prevActivity = sortedActs[idx];
        nextActivity = sortedActs[idx + 1] ?? null;
      }
    } else {
      prevActivity = sortedActs[sortedActs.length - 1] ?? null;
    }
    const afterTitle = prevActivity?.title ?? null;

    // Persist — Scheduler creates entity + scheduled row in one shot.
    // `icon` viene salvato sull'entity activity (ENTITY_FIELDS lo accetta) e
    // poi la Timeline lo risolve via getStopIcon().
    const scheduledActivity = await this.scheduler.addToDay(position.dayId, {
      title: built.title,
      location: built.location,
      location_place_id: built.location_place_id,
      location_lat: built.location_lat,
      location_lng: built.location_lng,
      slot: built.slot,
      time: built.time,
      position: built.position,
      type: built.type,
      ...(place.icon ? { icon: place.icon } : {}),
    });

    // Bridge recalc (Fase 2). Best-effort: if Google fails we surface in logs
    // and leave the warnings as they are — the insertion itself succeeded.
    try {
      await this.recomputeBridgesAround({
        newScheduledId: scheduledActivity.id,
        newLat: built.location_lat,
        newLng: built.location_lng,
        prev: prevActivity,
        next: nextActivity,
      });
    } catch (err) {
      console.error("[TripService.addPlace] bridge recalc failed:", err);
    }

    return {
      scheduledActivity,
      position: {
        dayId: position.dayId,
        dayNumber: targetDay.day_number,
        afterActivityId: position.afterActivityId,
        afterTitle,
      },
      warnings,
    };
  }

  /**
   * Recompute the bridges spanning the freshly inserted stop. Replaces the
   * single "prev→next" bridge (which doesn't exist anymore) with two new
   * ones: prev→new and new→next. The transport mode is inherited from the
   * broken bridge (or falls back to 'walk').
   *
   * Writes to BOTH sides of each bridge (bridge_out on the origin and
   * bridge_in on the destination) so every consumer finds it.
   */
  private async recomputeBridgesAround(args: {
    newScheduledId: string;
    newLat: number;
    newLng: number;
    prev: Activity | null;
    next: Activity | null;
  }): Promise<void> {
    const { newScheduledId, newLat, newLng, prev, next } = args;

    const inheritedTransport: BridgeData["transport"] =
      (prev?.bridge_out_json?.transport as BridgeData["transport"] | undefined) ??
      (next?.bridge_in_json?.transport as BridgeData["transport"] | undefined) ??
      "walk";

    const prevHasCoords = prev?.location_lat != null && prev?.location_lng != null;
    const nextHasCoords = next?.location_lat != null && next?.location_lng != null;

    // Le due chiamate Google sono indipendenti — eseguirle in parallelo
    // dimezza il critical path quando l'inserimento è "in mezzo". Quando il
    // giorno è vuoto (entrambi null) nessuna chiamata viene avviata.
    const [prevBridge, nextBridge] = await Promise.all([
      prevHasCoords
        ? this.computeBridge(
            { lat: prev!.location_lat as number, lng: prev!.location_lng as number },
            { lat: newLat, lng: newLng },
            inheritedTransport,
          )
        : Promise.resolve(null),
      nextHasCoords
        ? this.computeBridge(
            { lat: newLat, lng: newLng },
            { lat: next!.location_lat as number, lng: next!.location_lng as number },
            inheritedTransport,
          )
        : Promise.resolve(null),
    ]);

    // Anche le scritture sono indipendenti — un solo Promise.all per chiudere.
    const writes: Promise<unknown>[] = [];
    const newPatch: { bridge_in_json?: BridgeData; bridge_out_json?: BridgeData } = {};

    if (prevBridge && prev) {
      newPatch.bridge_in_json = prevBridge;
      writes.push(this.dal.trips.updateSchedule(prev.id, { bridge_out_json: prevBridge }));
    }
    if (nextBridge && next) {
      newPatch.bridge_out_json = nextBridge;
      writes.push(this.dal.trips.updateSchedule(next.id, { bridge_in_json: nextBridge }));
    }
    if (Object.keys(newPatch).length > 0) {
      writes.push(
        this.dal.trips.updateSchedule(newScheduledId, newPatch as Record<string, unknown>),
      );
    }
    if (writes.length > 0) await Promise.all(writes);
  }

  /**
   * Build a BridgeData payload from a single Google Routes call. Returns
   * null if the points coincide, Routes fails, or the response is missing
   * `duration`. `line`/`stops`/`note` stay null — those are transit-only
   * details surfaced via /api/routes/transit, not by computeRoutes.
   */
  private async computeBridge(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    transport: BridgeData["transport"],
  ): Promise<BridgeData | null> {
    if (origin.lat === destination.lat && origin.lng === destination.lng) return null;

    const travelMode = TRANSPORT_TO_GOOGLE_TRAVEL_MODE[transport] ?? "WALK";
    const body = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode,
      polylineEncoding: "ENCODED_POLYLINE",
    };

    const res = await computeRoutes(body, "routes.duration");
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { routes?: Array<{ duration?: string }> } | null;
    const rawDuration = data?.routes?.[0]?.duration;
    if (typeof rawDuration !== "string") return null;
    const seconds = Number(rawDuration.replace(/s$/, ""));
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return {
      transport,
      duration_min: Math.max(1, Math.round(seconds / 60)),
      line: null,
      stops: null,
      note: null,
    };
  }

  /**
   * AI content for the Trip Home, projected for `locale`. Sections (boarding
   * pass + place card) are cached on `trips.home_meta` and reused until the
   * destination changes; a miss triggers ONE LLM call that fills them all.
   */
  async getHomeMeta(tripId: string, locale: string): Promise<HomeMeta> {
    const trip = unwrap(await this.dal.trips.findById(tripId));
    const home = (trip.home_meta as TripHomeMeta | null) ?? {};

    const source = normalizeDestination(trip.title);
    const fresh = (m?: { source: string; byLocale: Record<string, unknown> }) =>
      m && m.source === source && m.byLocale[locale] !== undefined;

    // Both sections already resolved for this destination + locale → no call.
    if (fresh(home.boarding) && fresh(home.place)) {
      return { boarding: home.boarding!.byLocale[locale], place: home.place!.byLocale[locale] };
    }

    const raw = await chatJson({
      tier: "fast",
      maxTokens: 380,
      messages: buildHomeMessages({
        destination: trip.title,
        startDate: trip.start_date,
        endDate: trip.end_date,
        adults: trip.adults_count,
        children: trip.children_count,
        themes: trip.theme_tags,
        locale,
      }),
    });

    const parsed = parseHomeMeta(raw, trip.title);
    if (!parsed.boarding) throw upstream("Could not resolve destination info");

    // Merge per-locale, resetting a section's cache when the destination moved.
    const boarding: BoardingMeta = {
      source,
      byLocale: { ...(home.boarding?.source === source ? home.boarding.byLocale : {}), [locale]: parsed.boarding },
    };
    const place: PlaceMeta | undefined = parsed.place
      ? { source, byLocale: { ...(home.place?.source === source ? home.place.byLocale : {}), [locale]: parsed.place } }
      : home.place?.source === source ? home.place : undefined;

    // Persist; a write failure shouldn't deny the freshly computed answer.
    await this.dal.trips.update(tripId, { home_meta: { ...home, boarding, place } });

    return { boarding: parsed.boarding, place: parsed.place };
  }
}
