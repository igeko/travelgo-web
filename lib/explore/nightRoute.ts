/**
 * lib/explore/nightRoute.ts
 * ─────────────────────────────────────────────────────────────────
 * Pure pre-analysis for the Explore "night route" layer.
 *
 * Given the trip's days (each with its scheduled activities), it builds the
 * ordered chain of distinct geographical waypoints made of, per day, the last
 * geolocated activity followed by where the traveller sleeps that night — then
 * collapses consecutive points that sit at the same place. The result is the
 * spatial backbone of the trip: one pin per real location, in day order, ready
 * to be drawn with markers + a connecting route.
 *
 * Each waypoint carries the trip's OWN saved fields (title, time, address, …)
 * so its card shows the stored activity/accommodation info — never a Google
 * Place lookup.
 *
 * No React, no DB, no Google SDK — safe to run on the server.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Day, Activity } from "@/lib/dal/domain";

/** A day enriched with its scheduled activities — the shape `getSnapshot` returns. */
export type DayWithActivities = Day & { activities: Activity[] };

/** What a waypoint represents on the map. `both` = sleep spot coincides with the day's last activity. */
export type NightStopKind = "accommodation" | "lastActivity" | "both";

export type NightWaypoint = {
  lat: number;
  lng: number;
  kind: NightStopKind;
  /** Saved title — accommodation name / activity title. */
  title: string;
  /** Day numbers this waypoint covers (a collapsed run spans several). */
  dayNumbers: number[];
  /** Activity icon key when the waypoint is a last-activity stop; null for a pure sleep spot. */
  iconKey: string | null;
  /** Accommodation kind (hotel/campground/…) when known. */
  accommodationType: string | null;
  /** Saved activity time ("HH:mm"); null for accommodation stops. */
  time: string | null;
  /** Saved activity description (short_desc); null for accommodation stops. */
  description: string | null;
  /** Saved address — activity location text or accommodation address. */
  address: string | null;
  /** Saved accommodation URL; null for activity stops. */
  url: string | null;
  /** Saved image URL — activity hero_image / day image_url; null → gradient fallback. */
  image: string | null;
};

/** Chronological slot order — duplicated here to keep this module dependency-free
 *  (lib must not import from features). Mirrors features/activity SLOT_ORDER. */
const SLOT_RANK: Record<string, number> = { morning: 0, afternoon: 1, evening: 2, night: 3 };

/** Merge points closer than this (metres) into a single waypoint — collapses
 *  "same campground night after night" and "last activity == sleep spot". */
const SAME_PLACE_METERS = 150;

function hasCoords(lat: number | null, lng: number | null): lat is number {
  return lat != null && lng != null;
}

/** Great-circle distance in metres. */
function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Canonical itinerary order: by slot, then clock time, then position. Mirrors
 *  the Timeline ordering so "last" matches what the user sees. */
function orderActivities(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => {
    const sr = (SLOT_RANK[a.slot ?? ""] ?? 99) - (SLOT_RANK[b.slot ?? ""] ?? 99);
    if (sr !== 0) return sr;
    const at = a.time ?? "";
    const bt = b.time ?? "";
    if (at && bt && at !== bt) return at.localeCompare(bt);
    if (at && !bt) return -1;
    if (!at && bt) return 1;
    return (a.position ?? 0) - (b.position ?? 0);
  });
}

/** A single point in the pre-collapse chain, carrying its saved fields. */
type RawStop = {
  lat: number;
  lng: number;
  placeId: string | null;
  kind: "accommodation" | "lastActivity";
  title: string;
  dayNumber: number;
  iconKey: string | null;
  accommodationType: string | null;
  time: string | null;
  description: string | null;
  address: string | null;
  url: string | null;
  image: string | null;
};

/**
 * Build the ordered, de-duplicated waypoint chain for the night-route layer.
 *
 * Carry-forward: a day without its own accommodation coordinates inherits the
 * last known sleep spot. The domain snapshot omits the `use_previous_accommodation`
 * flag, so "missing coords ⇒ still parked at the previous place" stands in for
 * it — and the collapse step makes inherited duplicates disappear anyway.
 */
export function selectNightRoute(days: DayWithActivities[]): NightWaypoint[] {
  const ordered = [...days].sort((a, b) => a.day_number - b.day_number);

  const raw: RawStop[] = [];
  let carried:
    | { lat: number; lng: number; placeId: string | null; name: string | null; type: string | null; address: string | null; url: string | null; image: string | null }
    | null = null;

  for (const day of ordered) {
    // Last geolocated activity of the day, in canonical itinerary order.
    const last = orderActivities(day.activities)
      .reverse()
      .find((a) => hasCoords(a.location_lat, a.location_lng));
    if (last && hasCoords(last.location_lat, last.location_lng)) {
      raw.push({
        lat: last.location_lat,
        lng: last.location_lng as number,
        placeId: last.location_place_id,
        kind: "lastActivity",
        title: last.title || last.location || "—",
        dayNumber: day.day_number,
        iconKey: last.icon,
        accommodationType: null,
        time: last.time,
        description: last.short_desc,
        address: last.location,
        url: null,
        image: last.hero_image,
      });
    }

    // Where they sleep — own coords if set, else the carried-forward spot.
    if (hasCoords(day.accommodation_lat, day.accommodation_lng)) {
      carried = {
        lat: day.accommodation_lat,
        lng: day.accommodation_lng as number,
        placeId: day.accommodation_place_id,
        name: day.accommodation_name,
        type: day.accommodation_type,
        address: day.accommodation_address,
        url: day.accommodation_url,
        image: day.image_url,
      };
    }
    if (carried) {
      raw.push({
        lat: carried.lat,
        lng: carried.lng,
        placeId: carried.placeId,
        kind: "accommodation",
        title: carried.name || day.city || "Alloggio",
        dayNumber: day.day_number,
        iconKey: null,
        accommodationType: carried.type,
        time: null,
        description: null,
        address: carried.address,
        url: carried.url,
        image: carried.image,
      });
    }
  }

  return collapse(raw);
}

/** Two raw stops are the "same place" when they share a place id or sit within
 *  SAME_PLACE_METERS of each other. */
function samePlace(a: RawStop, b: RawStop): boolean {
  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;
  return metersBetween(a.lat, a.lng, b.lat, b.lng) <= SAME_PLACE_METERS;
}

/** Fold consecutive same-place stops into one waypoint, tracking which kinds and
 *  days it covers. An accommodation identity wins the card (it names the place). */
function collapse(raw: RawStop[]): NightWaypoint[] {
  const out: NightWaypoint[] = [];

  type Run = {
    lat: number;
    lng: number;
    days: Set<number>;
    acc: RawStop | null;
    act: RawStop | null;
    last: RawStop;
  };
  let run: Run | null = null;

  const flush = () => {
    if (!run) return;
    const { acc, act } = run;
    const kind: NightStopKind = acc && act ? "both" : acc ? "accommodation" : "lastActivity";
    // Accommodation identity wins for accommodation/both; activity for a pure stop.
    const primary = acc ?? act!;
    out.push({
      lat: run.lat,
      lng: run.lng,
      kind,
      title: primary.title,
      dayNumbers: [...run.days].sort((a, b) => a - b),
      iconKey: kind === "lastActivity" ? act!.iconKey : null,
      accommodationType: acc?.accommodationType ?? null,
      time: kind === "lastActivity" ? act!.time : null,
      description: kind === "lastActivity" ? act!.description : null,
      address: primary.address,
      url: acc?.url ?? null,
      image: primary.image ?? act?.image ?? null,
    });
    run = null;
  };

  for (const stop of raw) {
    if (run && samePlace(run.last, stop)) {
      run.days.add(stop.dayNumber);
      run.last = stop;
      if (stop.kind === "accommodation") run.acc = run.acc ?? stop;
      else run.act = run.act ?? stop;
      continue;
    }
    flush();
    run = {
      lat: stop.lat,
      lng: stop.lng,
      days: new Set([stop.dayNumber]),
      acc: stop.kind === "accommodation" ? stop : null,
      act: stop.kind === "lastActivity" ? stop : null,
      last: stop,
    };
  }
  flush();

  return out;
}
