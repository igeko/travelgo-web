/**
 * lib/services/TripService.ts
 * ─────────────────────────────────────────────────────────────────
 * Trip application service: list, snapshot, creation (trip + owner +
 * generated days) and day metadata updates. Orchestration lives here;
 * routes stay thin.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal, TripSummary, TripSnapshot } from "@/lib/dal";
import { notFound, badRequest } from "@/lib/api/errors";
import { isCurrencyCode } from "@/lib/api/validation";
import { unwrap } from "./util";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type CreateTripRequest = {
  title?: unknown;
  subtitle?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  currency?: unknown;
};

function safeIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : value;
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
}
