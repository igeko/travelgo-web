/**
 * lib/client/airports.ts — frontend client for the airport reference search.
 */
import type { DbAirport } from "@/lib/dal";
import { get } from "./http";

export const airports = {
  /** GET /api/airports?q= — ranked airport matches (IATA / name / city). */
  search: (q: string) => get<DbAirport[]>(`/api/airports?q=${encodeURIComponent(q)}`),
};
