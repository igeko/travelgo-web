/**
 * lib/dal/entities/Airports.ts
 * ─────────────────────────────────────────────────────────────────
 * The Airports entity — read-only reference data (public-read RLS).
 * Backs the trip-edit airport autocomplete.
 *
 * Search is delegated to the `search_airports` SQL function (pg_trgm fuzzy
 * match on city/name + keyword/IATA match), so "Roma" still finds Rome and
 * large airports rank first. See the migrations.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { DalError, type DalResult, type DbAirport } from "../types";

export class Airports {
  constructor(private readonly db: SupabaseClient) {}

  /** Ranked airport matches for an autocomplete query. */
  async search(query: string, limit = 8): Promise<DalResult<DbAirport[]>> {
    const q = query.trim();
    if (!q) return { data: [], error: null };

    const { data, error } = await this.db.rpc("search_airports", { q, lim: limit });
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: (data ?? []) as DbAirport[], error: null };
  }
}
