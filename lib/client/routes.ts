/**
 * lib/client/routes.ts — frontend client for the Google Routes proxy.
 */
import { requestRaw } from "./http";
import type { TransitOption } from "@/app/api/routes/transit/normalize";

export type LatLng = { lat: number; lng: number };
export type {
  TransitOption,
  TransitSegment,
  WalkSegment,
  RideSegment,
} from "@/app/api/routes/transit/normalize";

export const routes = {
  /** POST /api/routes → { polyline }. */
  compute: (points: LatLng[], travelMode: string) =>
    requestRaw<{ polyline?: string }>("POST", "/api/routes", { points, travelMode }),

  /** POST /api/routes/transit → { options }. Public-transit alternatives between two points. */
  transit: (origin: LatLng, destination: LatLng, departureTime?: string) =>
    requestRaw<{ options: TransitOption[] }>("POST", "/api/routes/transit", {
      origin,
      destination,
      departureTime,
    }),
};
