/**
 * features/explore/resolveAccommodations.ts
 * ─────────────────────────────────────────────────────────────────
 * Two resolvers for the timeline's per-day "sleep" display:
 *
 *   accommodationsFromNights(nights, days)
 *     The canonical resolver — projects accommodation_nights + stays +
 *     Property activity onto each day. Source of truth.
 *
 *   resolveAccommodations(days)
 *     Legacy fallback — reads days.accommodation_* columns. Kept until
 *     all consumers migrate.
 *
 * Both produce the same AccommodationDisplay shape so the Timeline
 * organism remains source-agnostic.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Day } from "@/lib/dal/domain";
import type { NightWithStay } from "@/lib/dal";

export type AccommodationDisplay = {
  name: string;
  type: string | null;
  address: string | null;
  url: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  is_arrival: boolean;
  is_departure: boolean;
  /** 0-based index of this night within the stay. */
  night_index: number;
  /** Total nights of the stay this day belongs to. */
  nights_total: number;
  /**
   * Stay id — present when the AccommodationDisplay was projected from
   * accommodation_nights. Missing when derived from the legacy days.*
   * columns (those will be deprecated once all writes migrate).
   */
  stay_id?: string;
  /** Property activity id — needed to mutate Property-level fields (the
   *  address, the title, etc.) on the same entity backing the stay. Only
   *  set by the canonical resolver — the legacy fallback has no entity. */
  activity_id?: string;
  /** Icon key sull'entità Property (activities.icon). Quando set, vince
   *  sulla mappa icona per `type` nel render. Solo canonical resolver. */
  iconKey?: string | null;
};

// ── Canonical resolver: from nights ───────────────────────────────

/**
 * Project accommodation_nights onto days. Each night already carries
 * stay → activity (Property), so all we need to do is index by day_id
 * and compute nights_total per stay.
 */
export function accommodationsFromNights<D extends { id: string }>(
  nights: NightWithStay[],
  days: D[],
): Array<D & { accommodation: AccommodationDisplay | null }> {
  // nights_total per stay: count of materialized nights.
  const totalByStay = new Map<string, number>();
  for (const n of nights) {
    totalByStay.set(n.stay_id, (totalByStay.get(n.stay_id) ?? 0) + 1);
  }

  // Index nights by day_id (each day has at most one stay under our
  // exclusion constraint, so the lookup is 1:1).
  const byDay = new Map<string, NightWithStay>();
  for (const n of nights) byDay.set(n.day_id, n);

  return days.map((d) => {
    const n = byDay.get(d.id);
    if (!n) return { ...d, accommodation: null };
    const a = n.stay.activity;
    return {
      ...d,
      accommodation: {
        name: a.title,
        type: null,
        address: a.location,
        url: a.url,
        place_id: a.location_place_id,
        lat: a.location_lat,
        lng: a.location_lng,
        is_arrival: n.is_arrival,
        is_departure: n.is_departure,
        night_index: n.night_index,
        nights_total: totalByStay.get(n.stay_id) ?? 1,
        stay_id: n.stay_id,
        activity_id: a.id,
        iconKey: a.icon ?? null,
      },
    };
  });
}

type Effective = Pick<
  Day,
  | "accommodation_name"
  | "accommodation_address"
  | "accommodation_url"
  | "accommodation_type"
  | "accommodation_place_id"
  | "accommodation_lat"
  | "accommodation_lng"
> | null;

function keyOf(e: Effective): string | null {
  if (!e || !e.accommodation_name) return null;
  if (e.accommodation_place_id) return e.accommodation_place_id;
  return `${e.accommodation_name}|${e.accommodation_address ?? ""}`;
}

export function resolveAccommodations<D extends Day>(
  days: D[],
): Array<D & { accommodation: AccommodationDisplay | null }> {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);

  // Pass 1: each day's effective accommodation (resolves use_previous chain).
  const effective: Effective[] = sorted.map(() => null);
  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i];
    if (d.accommodation_name) {
      effective[i] = {
        accommodation_name: d.accommodation_name,
        accommodation_address: d.accommodation_address,
        accommodation_url: d.accommodation_url,
        accommodation_type: d.accommodation_type,
        accommodation_place_id: d.accommodation_place_id,
        accommodation_lat: d.accommodation_lat,
        accommodation_lng: d.accommodation_lng,
      };
    } else if (d.use_previous_accommodation && i > 0) {
      effective[i] = effective[i - 1];
    } else {
      effective[i] = null;
    }
  }

  // Pass 2: group consecutive days sharing the same key into stays.
  const stay = new Array<{ start: number; end: number }>(sorted.length);
  let cursor = 0;
  while (cursor < sorted.length) {
    const k = keyOf(effective[cursor]);
    if (k === null) {
      stay[cursor] = { start: cursor, end: cursor };
      cursor++;
      continue;
    }
    let j = cursor;
    while (j + 1 < sorted.length && keyOf(effective[j + 1]) === k) j++;
    for (let x = cursor; x <= j; x++) stay[x] = { start: cursor, end: j };
    cursor = j + 1;
  }

  return sorted.map((d, idx) => {
    const e = effective[idx];
    if (!e || !e.accommodation_name) {
      return { ...d, accommodation: null };
    }
    const s = stay[idx];
    return {
      ...d,
      accommodation: {
        name: e.accommodation_name,
        type: e.accommodation_type,
        address: e.accommodation_address,
        url: e.accommodation_url,
        place_id: e.accommodation_place_id,
        lat: e.accommodation_lat,
        lng: e.accommodation_lng,
        is_arrival: idx === s.start,
        is_departure: idx === s.end,
        night_index: idx - s.start,
        nights_total: s.end - s.start + 1,
      },
    };
  });
}
