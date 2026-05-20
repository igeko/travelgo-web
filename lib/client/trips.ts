/**
 * lib/client/trips.ts — frontend client for trip endpoints.
 */
import type { TripSummary, TripSnapshot } from "@/lib/dal";
import { get, post } from "./http";

export type CreateTripPayload = {
  title: string;
  subtitle?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  currency?: string;
};

export const trips = {
  /** GET /api/trips */
  list: () => get<TripSummary[]>("/api/trips"),

  /** GET /api/trips/[id] — full snapshot */
  get: (id: string) => get<TripSnapshot>(`/api/trips/${id}`),

  /** POST /api/trips */
  create: (payload: CreateTripPayload) => post<{ id: string }>("/api/trips", payload),
};
