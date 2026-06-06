/**
 * components/ui/mapRoute.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared route-polyline helpers for the Map surface (decoding the encoded
 * polyline format returned by the Google Routes API).
 * Pure geometry — no SDK objects are created here, so it is safe to import
 * anywhere; the actual google.maps.Polyline is built by the consumer.
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * Decode an encoded polyline (Google's algorithm) into LatLng pairs.
 * Returns the vertices of the route line received from /api/routes.
 */
export function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
