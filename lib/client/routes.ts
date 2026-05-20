/**
 * lib/client/routes.ts — frontend client for the Google Routes proxy.
 */
import { requestRaw } from "./http";

export type LatLng = { lat: number; lng: number };

export const routes = {
  /** POST /api/routes → { polyline }. */
  compute: (points: LatLng[], travelMode: string) =>
    requestRaw<{ polyline?: string }>("POST", "/api/routes", { points, travelMode }),
};
