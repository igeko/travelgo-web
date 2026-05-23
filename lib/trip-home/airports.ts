/**
 * lib/trip-home/airports.ts
 * ─────────────────────────────────────────────────────────────────
 * User-set departure / arrival airports for the trip, persisted on
 * `trips.departure_airport` / `trips.arrival_airport` (jsonb). They feed
 * the boarding pass: departure → the "From" leg, arrival → the "To" code.
 * ─────────────────────────────────────────────────────────────────
 */

export type TripAirport = {
  /** City / place shown large on the pass (e.g. "Rome"). */
  city: string;
  /** IATA code, 3 uppercase letters (e.g. "FCO"). */
  iata: string;
};

/** Narrow an untyped DB value to a TripAirport, or null when unusable. */
export function parseAirport(value: unknown): TripAirport | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const city = typeof v.city === "string" ? v.city.trim() : "";
  const iata = typeof v.iata === "string" ? v.iata.trim().toUpperCase() : "";
  if (!city && !iata) return null;
  return { city, iata };
}

/** Clean user input into a storable airport, or null when both fields are blank. */
export function cleanAirport(city: string, iata: string): TripAirport | null {
  const c = city.trim();
  const code = iata.trim().toUpperCase();
  if (!c && !code) return null;
  return { city: c, iata: code };
}
