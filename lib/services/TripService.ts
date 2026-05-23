/**
 * lib/services/TripService.ts
 * ─────────────────────────────────────────────────────────────────
 * Trip application service: list, snapshot, creation (trip + owner +
 * generated days) and day metadata updates. Orchestration lives here;
 * routes stay thin.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal, TripSummary, TripSnapshot, DbTrip, DbDay, UpdateTripInput } from "@/lib/dal";
import { notFound, badRequest, upstream } from "@/lib/api/errors";
import { isCurrencyCode } from "@/lib/api/validation";
import { chatJson } from "@/lib/ai/llm";
import {
  normalizeDestination,
  type BoardingMeta,
  type HomeMeta,
  type TripHomeMeta,
} from "@/lib/trip-home/meta";
import { buildBoardingMessages, parseBoardingMeta } from "@/lib/trip-home/boarding-prompt";
import { type TripAirport } from "@/lib/trip-home/airports";
import { unwrap } from "./util";

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
  constructor(private readonly dal: Dal) {}

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
   * Align the trip's dated days with the [start, end] range:
   * delete dated days that fell outside the range, create days for newly
   * covered dates, then renumber every day (dated ascending, null dates last).
   * Days with a null date and the activities of surviving days are untouched.
   */
  private async reconcileDays(tripId: string, start: string, end: string): Promise<void> {
    const desired = enumerateDates(start, end);
    const desiredSet = new Set(desired);
    const existing = (unwrap(await this.dal.trips.listDays(tripId)) ?? []) as DbDay[];

    // Delete dated days that no longer belong to the range.
    const survivors: DbDay[] = [];
    for (const day of existing) {
      if (day.date !== null && !desiredSet.has(day.date)) {
        unwrap(await this.dal.trips.deleteDay(day.id));
      } else {
        survivors.push(day);
      }
    }

    // Create days for desired dates not already covered by a surviving day.
    const coveredDates = new Set(
      survivors.map((d) => d.date).filter((d): d is string => d !== null),
    );
    for (const date of desired) {
      if (!coveredDates.has(date)) {
        const created = unwrap(
          await this.dal.trips.createDay({ trip_id: tripId, day_number: 0, date }),
        );
        survivors.push(created);
      }
    }

    // Renumber: dated days ascending, null-date days last (keeping their order).
    const dated = survivors
      .filter((d) => d.date !== null)
      .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
    const undated = survivors.filter((d) => d.date === null);
    const ordered = [...dated, ...undated];

    for (let i = 0; i < ordered.length; i++) {
      const desiredNumber = i + 1;
      if (ordered[i].day_number !== desiredNumber) {
        unwrap(await this.dal.trips.patchDay(ordered[i].id, { day_number: desiredNumber }));
      }
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

  /**
   * AI content for the Trip Home, projected for `locale`. Each section is
   * cached on `trips.home_meta` and reused until its inputs change; missing
   * sections are generated and persisted on a miss.
   *
   * Today this resolves the boarding section (country, most-probable airport,
   * localized welcome); future sections plug in here.
   */
  async getHomeMeta(tripId: string, locale: string): Promise<HomeMeta> {
    const trip = unwrap(await this.dal.trips.findById(tripId));
    const home = (trip.home_meta as TripHomeMeta | null) ?? {};

    const source = normalizeDestination(trip.title);
    const cached = home.boarding;
    if (cached && cached.source === source && cached.byLocale[locale]) {
      return { boarding: cached.byLocale[locale] };
    }

    const raw = await chatJson({
      tier: "fast",
      maxTokens: 300,
      messages: buildBoardingMessages({
        destination: trip.title,
        startDate: trip.start_date,
        endDate: trip.end_date,
        adults: trip.adults_count,
        children: trip.children_count,
        themes: trip.theme_tags,
        locale,
      }),
    });

    const boardingLocale = parseBoardingMeta(raw, trip.title);
    if (!boardingLocale) throw upstream("Could not resolve destination info");

    // Reuse other locales only when the destination hasn't changed.
    const byLocale = cached && cached.source === source ? { ...cached.byLocale } : {};
    byLocale[locale] = boardingLocale;
    const boarding: BoardingMeta = { source, byLocale };

    // Persist; a write failure shouldn't deny the freshly computed answer.
    await this.dal.trips.update(tripId, { home_meta: { ...home, boarding } });

    return { boarding: boardingLocale };
  }
}
