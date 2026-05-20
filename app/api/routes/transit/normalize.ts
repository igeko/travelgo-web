/**
 * Normalizes the Google Routes API (computeRoutes, TRANSIT mode) response
 * into the public TransitOption contract consumed by the frontend.
 *
 * Shared by the proxy (app/api/routes/transit/route.ts) and the client
 * (lib/client/routes.ts) so the shape stays in sync.
 *
 * Google splits walking into many turn-by-turn micro-steps; we merge
 * consecutive walk steps into a single segment so the journey reads like
 * the Google Maps directions card (walk → ride → walk).
 */

import type { BridgeData } from "@/lib/dal/domain";

export type TransitTransport = BridgeData["transport"];

export type WalkSegment = {
  kind: "walk";
  durationMin: number;
  distanceM: number;
};

export type RideSegment = {
  kind: "ride";
  transport: TransitTransport;
  /** Line short name / number (e.g. "B", "72"). */
  line: string | null;
  /** Localized vehicle label from Google (e.g. "RER", "Bus", "Metro"). */
  vehicleLabel: string | null;
  /** Direction / terminus of the line. */
  headsign: string | null;
  departureStop: string | null;
  arrivalStop: string | null;
  /** Localized departure time text (e.g. "22:20"). */
  departureTime: string | null;
  stopCount: number | null;
  durationMin: number;
};

export type TransitSegment = WalkSegment | RideSegment;

/** A complete origin→destination transit alternative. */
export type TransitOption = {
  durationMin: number;
  distanceM: number;
  /** Encoded polyline of the whole route (for an optional map preview). */
  polyline: string | null;
  /** Dominant transit mode of the option (longest ride leg, else walk). */
  transport: TransitTransport;
  /** Line of the dominant ride leg (e.g. "B"), null if walk-only. */
  line: string | null;
  /** Total stops across ride segments, null if none. */
  stopCount: number | null;
  /** Ordered journey breakdown: walk / ride segments. */
  segments: TransitSegment[];
};

export type TransitResponse = { options: TransitOption[] };

/**
 * Google `transitDetails.transitLine.vehicle.type` → internal transport enum.
 * Full list: https://developers.google.com/maps/documentation/routes/reference/rest/v2/TransitVehicle
 */
function mapVehicleType(type: string | undefined): TransitTransport {
  switch (type) {
    case "BUS":
    case "INTERCITY_BUS":
    case "TROLLEYBUS":
    case "SHARE_TAXI":
      return "bus";
    case "SUBWAY":
    case "METRO_RAIL":
    case "MONORAIL":
    case "TRAM":
    case "LIGHT_RAIL":
    case "GONDOLA_LIFT":
    case "FUNICULAR":
      return "metro";
    case "RAIL":
    case "HEAVY_RAIL":
    case "COMMUTER_TRAIN":
    case "HIGH_SPEED_TRAIN":
    case "LONG_DISTANCE_TRAIN":
      return "train";
    default:
      // FERRY, CABLE_CAR, OTHER and unknowns fall back to a generic ride.
      return "bus";
  }
}

/** Parse Google duration ("1234s") to whole minutes (min 1 if positive). */
function parseDurationMin(value: unknown): number {
  if (typeof value !== "string") return 0;
  const seconds = Number.parseInt(value.replace(/s$/, ""), 10);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function rideFromStep(step: Record<string, unknown>): RideSegment | null {
  const details = asRecord(step.transitDetails);
  if (Object.keys(details).length === 0) return null;

  const transitLine = asRecord(details.transitLine);
  const vehicle = asRecord(transitLine.vehicle);
  const vehicleType = typeof vehicle.type === "string" ? vehicle.type : undefined;
  const stopDetails = asRecord(details.stopDetails);
  const localized = asRecord(asRecord(details.localizedValues).departureTime);

  return {
    kind: "ride",
    transport: mapVehicleType(vehicleType),
    line: str(transitLine.nameShort) ?? str(transitLine.name),
    vehicleLabel: str(asRecord(vehicle.name).text),
    headsign: str(details.headsign),
    departureStop: str(asRecord(stopDetails.departureStop).name),
    arrivalStop: str(asRecord(stopDetails.arrivalStop).name),
    departureTime: str(asRecord(localized.time).text),
    stopCount: typeof details.stopCount === "number" ? details.stopCount : null,
    durationMin: parseDurationMin(step.staticDuration),
  };
}

/** Collapse consecutive WALK steps into single walk segments. */
function buildSegments(steps: unknown[]): TransitSegment[] {
  const segments: TransitSegment[] = [];

  for (const raw of steps) {
    const step = asRecord(raw);
    if (step.travelMode === "WALK") {
      const durationMin = parseDurationMin(step.staticDuration);
      const distanceM = typeof step.distanceMeters === "number" ? step.distanceMeters : 0;
      const prev = segments[segments.length - 1];
      if (prev && prev.kind === "walk") {
        prev.durationMin += durationMin;
        prev.distanceM += distanceM;
      } else {
        segments.push({ kind: "walk", durationMin, distanceM });
      }
      continue;
    }
    const ride = rideFromStep(step);
    if (ride) segments.push(ride);
  }

  // Drop leading/trailing zero-minute walk noise.
  return segments.filter((s) => !(s.kind === "walk" && s.durationMin === 0));
}

function normalizeRoute(route: Record<string, unknown>): TransitOption | null {
  const legs = Array.isArray(route.legs) ? route.legs : [];
  const allSteps: unknown[] = [];
  for (const leg of legs) {
    const steps = asRecord(leg).steps;
    if (Array.isArray(steps)) allSteps.push(...steps);
  }

  const segments = buildSegments(allSteps);
  const rides = segments.filter((s): s is RideSegment => s.kind === "ride");
  if (rides.length === 0) return null;

  // Dominant leg = the ride with the most stops, else the first ride.
  const dominant = rides.slice().sort((a, b) => (b.stopCount ?? 0) - (a.stopCount ?? 0))[0];

  const stopCount = rides.reduce<number | null>((acc, r) => {
    if (r.stopCount == null) return acc;
    return (acc ?? 0) + r.stopCount;
  }, null);

  const polyline = asRecord(route.polyline).encodedPolyline;

  return {
    durationMin: parseDurationMin(route.duration),
    distanceM: typeof route.distanceMeters === "number" ? route.distanceMeters : 0,
    polyline: typeof polyline === "string" ? polyline : null,
    transport: dominant.transport,
    line: dominant.line,
    stopCount,
    segments,
  };
}

export function normalizeTransitResponse(data: unknown): TransitOption[] {
  const routes = Array.isArray(asRecord(data).routes) ? (asRecord(data).routes as unknown[]) : [];
  return routes
    .map((r) => normalizeRoute(asRecord(r)))
    .filter((o): o is TransitOption => o !== null);
}
