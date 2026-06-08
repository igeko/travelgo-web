/**
 * features/explore/useChainBridges.ts
 * ─────────────────────────────────────────────────────────────────
 * Hook: dato il `chain: TripStop[]` calcola per ogni leg consecutivo
 * (chain[i] → chain[i+1]) la duration via Google Routes (mode DRIVING)
 * e ritorna una `Map<legKey, BridgeData>` consumabile dalla Timeline
 * come fallback quando un `bridge_*_json` salvato non esiste.
 *
 * Comportamento:
 *   - `legKey = ${prev.id}|${curr.id}` — stabile per coppia di tappe.
 *   - Cache localStorage 30gg condivisa con la mappa (`api.routes.compute`):
 *     primo render = 1 call Google per leg; rimount = cache hit.
 *   - Persistenza opportunistica: per leg activity→activity (entrambi
 *     `kind === "activity"`, quindi entrambi mappati su scheduled.id),
 *     dopo il compute fa fire-and-forget PATCH `bridge_out_json` su DB
 *     così la prossima sessione carica i bridge dal snapshot e non
 *     deve ricalcolare. Leg che coinvolgono accommodation NON vengono
 *     persistiti (lo schema accommodation_stays oggi non porta bridge).
 *   - Skip silenzioso quando un endpoint manca coords. Skip quando il
 *     bridge_out_json del prev è già salvato (lo legge la Timeline
 *     direttamente, niente bisogno di fallback).
 *
 * Default mezzo: "car". Hardcoded — un selettore per-leg arriverà più
 * avanti (vedi PR scope: Hardcoded 'car' ora).
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { BridgeData } from "@/lib/dal/domain";
import type { TripStop } from "./tripChain";

/** Mode hardcoded di default. Cambierà in user-selectable in un PR successivo. */
const DEFAULT_TRANSPORT: BridgeData["transport"] = "car";
const DEFAULT_TRAVEL_MODE = "DRIVING";

export function legKey(prevId: string, currId: string): string {
  return `${prevId}|${currId}`;
}

/**
 * `chain` deve essere stabile in identità per evitare re-fetch inutili —
 * passare l'output di `useMemo(buildTripChain(days), [days])`.
 *
 * Tutti i leg vengono ricomputati ad ogni mount del chain: la cache
 * localStorage (`api.routes.compute`) garantisce zero call Google quando
 * i punti non sono cambiati. Niente filtro su "bridge già salvato": il
 * dato persistito può essere stantio (un addPlace passato che puntava a
 * un'altra destinazione), quindi non possiamo fidarci come dedup. La
 * persistenza overwrite-sempre rimpiazza eventuali valori vecchi col
 * vero leg corrente del chain.
 */
export function useChainBridges(chain: TripStop[]): Map<string, BridgeData> {
  const [computed, setComputed] = useState<Map<string, BridgeData>>(new Map());

  useEffect(() => {
    if (chain.length < 2) return;
    let cancelled = false;

    // Raccogli i leg da calcolare: consecutivi con entrambi gli endpoint
    // geo-localizzati. La cache localStorage gestisce il dedup network.
    type Leg = { key: string; prev: TripStop; curr: TripStop };
    const todo: Leg[] = [];
    for (let i = 1; i < chain.length; i++) {
      const prev = chain[i - 1];
      const curr = chain[i];
      if (prev.lat == null || prev.lng == null || curr.lat == null || curr.lng == null) continue;
      todo.push({ key: legKey(prev.id, curr.id), prev, curr });
    }
    if (todo.length === 0) return;

    // Fetch in parallelo. Ogni leg è una call indipendente verso /api/routes
    // (con cache localStorage — la maggior parte sono cache-hit se la mappa
    // ha già reso il path su questa sessione).
    Promise.all(
      todo.map(async (leg) => {
        try {
          const res = await api.routes.compute(
            [
              { lat: leg.prev.lat, lng: leg.prev.lng },
              { lat: leg.curr.lat, lng: leg.curr.lng },
            ],
            DEFAULT_TRAVEL_MODE,
          );
          if (res.durationSec == null) return null;
          const bridge: BridgeData = {
            transport: DEFAULT_TRANSPORT,
            duration_min: Math.max(1, Math.round(res.durationSec / 60)),
            line: null,
            stops: null,
            note: null,
          };
          return { ...leg, bridge };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const settled = results.filter((r): r is Leg & { bridge: BridgeData } => r != null);
      if (settled.length === 0) return;
      setComputed((prev) => {
        const next = new Map(prev);
        for (const r of settled) next.set(r.key, r.bridge);
        return next;
      });

      // Persistenza opportunistica: act→act con scheduled.id su entrambi i
      // lati. accommodation legs vengono saltati (no posto naturale di
      // persistenza nello schema attuale). Fire-and-forget.
      for (const r of settled) {
        if (r.prev.kind !== "activity" || r.curr.kind !== "activity") continue;
        api.activities
          .setBridge(r.prev.id, "out", r.bridge as unknown as Record<string, unknown>)
          .catch((err) => console.warn("[useChainBridges] persist failed:", err));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chain]);

  return computed;
}
