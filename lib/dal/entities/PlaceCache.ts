/**
 * lib/dal/entities/PlaceCache.ts
 * ─────────────────────────────────────────────────────────────────
 * Cache server-side dei dettagli `PlaceEnriched` di Google Places v1.
 *
 * Scopo: evitare di richiamare Places ad ogni hover sui pin pianificati.
 * I dati identici si servono dal DB; le miss (entry assente o scaduta)
 * triggerano una fresh call lato route handler.
 *
 * TTL: 30 giorni, applicato qui via filtro su `updated_at` — in pieno
 * rispetto dell'art. 5.4 dei Google Maps Platform Terms ("up to 30 days").
 * L'invalidazione è LAZY: una entry "scaduta" risulta `null` al `get` ma
 * non viene cancellata immediatamente. Quando il route ricomputerà e
 * scriverà via `set`, l'UPSERT aggiornerà la stessa riga.
 *
 * Read: qualsiasi authenticated (RLS).
 * Write: solo service_role (RLS senza policy INSERT/UPDATE per
 * `authenticated`), quindi il DAL va costruito via `serviceDal()` quando
 * deve scrivere — i route handler già lo fanno per la persistenza
 * cache, mentre `serverDal()` basta per le letture.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { CacheTable } from "../tables";
import { DalError, type DalResult } from "../types";

/** TTL della cache in millisecondi (30 giorni — Google ToS art. 5.4). */
export const PLACE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type DbPlaceCacheRow = {
  place_id: string;
  payload: unknown;
  updated_at: string;
};

export class PlaceCache {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * Restituisce il payload se la entry esiste E non è scaduta (TTL 30gg),
   * altrimenti `null`. Il typing del payload è demandato al chiamante
   * (è jsonb opaco lato DAL — la route conosce la propria PlaceEnriched).
   */
  async get<T>(placeId: string): Promise<T | null> {
    const minUpdatedAt = new Date(Date.now() - PLACE_CACHE_TTL_MS).toISOString();
    const { data } = await this.db
      .from(CacheTable.Places)
      .select("payload")
      .eq("place_id", placeId)
      .gte("updated_at", minUpdatedAt)
      .maybeSingle();
    if (!data) return null;
    return (data as { payload: T }).payload;
  }

  /**
   * UPSERT della entry. Aggiorna `updated_at` a `now()` (default colonna),
   * rinfrescando di fatto la TTL. Errori loggati e ingoiati: la cache è
   * un'ottimizzazione, una scrittura fallita non deve rompere il flusso
   * della route (che ha già la response Google pronta da servire).
   */
  async set(placeId: string, payload: unknown): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(CacheTable.Places)
      .upsert(
        { place_id: placeId, payload, updated_at: new Date().toISOString() },
        { onConflict: "place_id" },
      );
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
