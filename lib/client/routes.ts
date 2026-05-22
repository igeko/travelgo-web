/**
 * lib/client/routes.ts — frontend client for the Google Routes proxy.
 */
import { requestRaw } from "./http";
import { routeCacheKey, getCachedPolyline, setCachedPolyline } from "./routeCache";
import type { TransitOption } from "@/app/api/routes/transit/normalize";

export type LatLng = { lat: number; lng: number };
export type {
  TransitOption,
  TransitSegment,
  WalkSegment,
  RideSegment,
} from "@/app/api/routes/transit/normalize";

export const routes = {
  /**
   * POST /api/routes → { polyline }.
   * Client-cached (localStorage, ≤30d) so returning to a day's map doesn't
   * re-hit Google. Cache key is a fingerprint of the points + travelMode, so
   * any stop/order/mode change misses the cache and refetches. See routeCache.
   */
  compute: async (points: LatLng[], travelMode: string): Promise<{ polyline?: string }> => {
    const key = routeCacheKey(points, travelMode);
    const cached = getCachedPolyline(key);
    if (cached) return { polyline: cached };

    const res = await requestRaw<{ polyline?: string }>("POST", "/api/routes", { points, travelMode });
    if (res.polyline) setCachedPolyline(key, res.polyline);
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
