/**
 * lib/planning/addToTrip/checkGeographicCoherence.ts
 * ─────────────────────────────────────────────────────────────────
 * Step 4 of the Add-to-Trip algorithm.
 *
 * Is the new stop "too far" from the rest of the day?
 *
 * Distance is measured from the new stop to the geographic CENTROID of the
 * day's existing stops (excluding accommodations — those bookend the day
 * geographically and would skew the centroid toward sleep spots, marking
 * dense in-city itineraries as incoherent).
 *
 * Returns `{ incoherent: false, distanceKm: 0 }` when the day has no
 * geolocated stops yet: there's nothing to be coherent WITH.
 * ─────────────────────────────────────────────────────────────────
 */

import type { PlanActivity, PlanCoord } from "./types";
import { DEFAULT_COHERENCE_THRESHOLD_KM } from "./types";

/** Haversine great-circle distance in kilometres. */
function haversineKm(a: PlanCoord, b: PlanCoord): number {
  const R = 6371; // mean Earth radius (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function checkGeographicCoherence(
  newPlace: PlanCoord,
  dayActivities: PlanActivity[],
  thresholdKm: number = DEFAULT_COHERENCE_THRESHOLD_KM,
): { incoherent: boolean; distanceKm: number } {
  const located = dayActivities.filter(
    (a): a is PlanActivity & { lat: number; lng: number } =>
      !a.isAccommodation && a.lat != null && a.lng != null,
  );

  if (located.length === 0) return { incoherent: false, distanceKm: 0 };

  const centroid: PlanCoord = {
    lat: located.reduce((sum, a) => sum + a.lat, 0) / located.length,
    lng: located.reduce((sum, a) => sum + a.lng, 0) / located.length,
  };

  const distanceKm = haversineKm(newPlace, centroid);
  return { incoherent: distanceKm > thresholdKm, distanceKm };
}
