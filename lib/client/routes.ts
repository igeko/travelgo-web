/**
 * lib/client/routes.ts — frontend client for the Google Routes proxy.
 */
import { requestRaw } from "./http";
import {
  routeCacheKey,
  getCachedPolyline,
  getCachedDurationSec,
  getCachedDistanceMeters,
  setCachedPolyline,
} from "./routeCache";
import type { TransitOption } from "@/app/api/routes/transit/normalize";

export type LatLng = { lat: number; lng: number };
export type {
  TransitOption,
  TransitSegment,
  WalkSegment,
  RideSegment,
} from "@/app/api/routes/transit/normalize";

export type RouteComputeResult = {
  polyline?: string;
  durationSec?: number;
  /** Distanza in metri del percorso completo (Google Routes
   *  `routes.distanceMeters`). Usata dal RouteVerifier per la chip
   *  distanza nelle modalità walk/car/bike. */
  distanceMeters?: number | null;
};

export const routes = {
  /**
   * POST /api/routes → { polyline, durationSec?, distanceMeters? }.
   * Client-cached (localStorage, ≤30d). Cache key = fingerprint(points + mode).
   * Cache hit ritorna polyline + durationSec + distanceMeters quando presenti;
   * entries scritte da versioni precedenti possono mancare distanceMeters e
   * forzano un re-fetch quando il consumer chiede la distanza.
   */
  compute: async (points: LatLng[], travelMode: string): Promise<RouteComputeResult> => {
    const key = routeCacheKey(points, travelMode);
    const cachedPolyline = getCachedPolyline(key);
    const cachedDuration = getCachedDurationSec(key);
    const cachedDistance = getCachedDistanceMeters(key);
    // Cache hit "completo" (polyline + duration + distance) → niente network.
    if (cachedPolyline && cachedDuration != null && cachedDistance != null) {
      return {
        polyline: cachedPolyline,
        durationSec: cachedDuration,
        distanceMeters: cachedDistance,
      };
    }

    const res = await requestRaw<RouteComputeResult>("POST", "/api/routes", { points, travelMode });
    if (res.polyline) setCachedPolyline(key, res.polyline, res.durationSec, res.distanceMeters);
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
