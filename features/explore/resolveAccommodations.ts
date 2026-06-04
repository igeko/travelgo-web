/**
 * features/explore/resolveAccommodations.ts
 * ─────────────────────────────────────────────────────────────────
 * Reads the legacy days.accommodation_* columns and derives an
 * AccommodationDisplay per day, resolving the use_previous_accommodation
 * chain and tagging arrival/departure/night-index across each stay.
 *
 * Bridge layer — the new accommodations / scheduled_accommodations tables
 * are not yet populated. When they are, this resolver will be replaced
 * by a direct projection from the scheduled rows.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Day } from "@/lib/dal/domain";

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
};

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
