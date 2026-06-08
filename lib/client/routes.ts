/**
 * lib/client/routes.ts — frontend client for the Google Routes proxy.
 */
import { requestRaw } from "./http";
import { routeCacheKey, getCachedPolyline, getCachedDurationSec, setCachedPolyline } from "./routeCache";
import type { TransitOption } from "@/app/api/routes/transit/normalize";

export type LatLng = { lat: number; lng: number };
export type {
  TransitOption,
  TransitSegment,
  WalkSegment,
  RideSegment,
} from "@/app/api/routes/transit/normalize";

export type RouteComputeResult = { polyline?: string; durationSec?: number };

export const routes = {
  /**
   * POST /api/routes → { polyline, durationSec? }.
   * Client-cached (localStorage, ≤30d). Cache key = fingerprint(points + mode).
   * Cache hit ritorna polyline + durationSec quando presente (entries scritte
   * dalla v2 dell'endpoint); entries v1-only ritornano solo polyline e
   * forzano un re-fetch quando il consumer chiede la duration.
   */
  compute: async (points: LatLng[], travelMode: string): Promise<RouteComputeResult> => {
    const key = routeCacheKey(points, travelMode);
    const cachedPolyline = getCachedPolyline(key);
    const cachedDuration = getCachedDurationSec(key);
    // Cache hit "completo" (polyline + duration) → niente network.
    if (cachedPolyline && cachedDuration != null) {
      return { polyline: cachedPolyline, durationSec: cachedDuration };
    }

    const res = await requestRaw<RouteComputeResult>("POST", "/api/routes", { points, travelMode });
    if (res.polyline) setCachedPolyline(key, res.polyline, res.durationSec);
    return res;
  },

  /** POST /api/routes/transit → { options }. Public-transit alternatives between two points. */
  transit: (origin: LatLng, destination: LatLng, departureTime?: string) =>
    requestRaw<{ options: TransitOption[] }>("POST", "/api/routes/transit", {
      origin,
      destination,
      departureTime,
    }),
};
