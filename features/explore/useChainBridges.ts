/**
 * features/explore/useChainBridges.ts
 * ─────────────────────────────────────────────────────────────────
 * Hook: dato il `chain: TripStop[]` mantiene una `Map<legKey, BridgeData>`
 * coi bridge calcolati via Google Routes per i leg consecutivi
 * (chain[i] → chain[i+1]) e usati dalla Timeline come fallback quando
 * non c'è un `bridge_*_json` salvato in DB.
 *
 * Comportamento (post Step 2):
 *   - **Cache di sessione chain-aware**. Una `Map` tenuta in stato locale,
 *     chiavata per `${prev.id}|${curr.id}|coords`. Il `coords` include un
 *     hash delle lat/lng (arrotondate ~1m) di prev e curr: se l'utente
 *     sposta il POI sotto a uno stop, la chiave non matcha più e il leg
 *     viene ricalcolato.
 *   - **Ricalcolo lazy per giorno in focus**. Al cambio di `focusedDayId`,
 *     calcola SOLO i leg che entrano nel giorno (curr.dayId === focused)
 *     e che non sono già nella cache. Riaprire un giorno già visitato =
 *     zero chiamate a Google. Niente focus = niente calcolo (la mappa
 *     disegna comunque le polyline indipendentemente).
 *   - **Persistenza opportunistica**. Per i leg appena calcolati che
 *     hanno entrambi gli endpoint kind="activity" (cioè scheduled.id su
 *     entrambi i lati, fuzzy o no — Step 3), salva fire-and-forget il
 *     `bridge_out_json` su DB col `target_id` esplicito. I leg che
 *     coinvolgono accommodation NON vengono persistiti (lo schema
 *     accommodation_stays oggi non porta bridge). Skippa i leg in
 *     `skipPersistFor`: hanno già un bridge salvato dall'utente e non
 *     vogliamo sovrascriverlo col DRIVING default.
 *   - **Map ritornato**. Costruito via useMemo filtrando la cache sui
 *     legKey adiacenti nel chain attuale: niente entry "fantasma" da
 *     chain passati (es. dopo drag&drop o inserimento di una fuzzy).
 *
 * Default mezzo: "car" (hardcoded — un selettore per-leg arriverà più
 * avanti).
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { BridgeData } from "@/lib/dal/domain";
import type { TripStop } from "./tripChain";

/** Mode hardcoded di default. Cambierà in user-selectable in un PR successivo. */
const DEFAULT_TRANSPORT: BridgeData["transport"] = "car";
const DEFAULT_TRAVEL_MODE = "DRIVING";

export function legKey(prevId: string, currId: string): string {
  return `${prevId}|${currId}`;
}

/** Hash coords ad ~1m di precisione — sufficiente per invalidare la cache
 *  quando l'utente sposta un POI, senza falsi positivi su float drift. */
function coordsTag(stop: TripStop): string {
  return `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`;
}

function cacheKey(prev: TripStop, curr: TripStop): string {
  return `${prev.id}|${curr.id}|${coordsTag(prev)}|${coordsTag(curr)}`;
}

type CacheEntry = { legKey: string; bridge: BridgeData };

export type UseChainBridgesOptions = {
  /**
   * Giorno in focus. Il calcolo è limitato ai leg che ENTRANO nel giorno
   * (curr.dayId === focusedDayId): è quello che l'utente sta vedendo in
   * dettaglio. `null` = nessun focus → nessun fetch (la cache resta com'è
   * e il Map ritornato riflette solo i leg già calcolati per il chain
   * attuale).
   */
  focusedDayId?: string | null;
  /**
   * Set di activity id (lato `prev` del leg) che hanno già un
   * `bridge_out_json` persistito. Per questi NON facciamo la
   * persistenza opportunistica del computed: sovrascriveremmo la
   * scelta dell'utente (es. transport "walk" salvato dal RouteVerifier
   * tornerebbe a "car" che useChainBridges calcola sempre in DRIVING).
   * Il computed resta comunque in cache per backfillare distance_m
   * dove serve.
   */
  skipPersistFor?: Set<string>;
};

/**
 * `chain` deve essere stabile in identità per evitare re-fetch inutili —
 * passare l'output di `useMemo(buildTripChain(days), [days])`.
 */
export function useChainBridges(
  chain: TripStop[],
  options?: UseChainBridgesOptions,
): Map<string, BridgeData> {
  const { focusedDayId = null, skipPersistFor } = options ?? {};

  // Cache cumulativa di sessione. State (non ref) così il useMemo che
  // produce il Map ritornato può dipenderne in modo lint-pulito.
  // Le mutazioni avvengono solo nel `then` async dell'effect.
  const [cache, setCache] = useState<Map<string, CacheEntry>>(() => new Map());

  // Refs per leggere il valore corrente di skipPersistFor nel .then
  // del fetch (che può risolversi dopo che skipPersistFor è cambiato):
  // così non sovrascriviamo un bridge che l'utente ha appena salvato.
  const skipPersistRef = useRef(skipPersistFor);
  skipPersistRef.current = skipPersistFor;

  useEffect(() => {
    if (chain.length < 2) return;
    if (!focusedDayId) return; // niente focus = niente fetch
    let cancelled = false;

    // Lazy: calcola SOLO i leg che entrano nel giorno focused e NON sono
    // già in cache. Il dedup network resta gestito anche dalla cache
    // localStorage di `api.routes.compute` (30gg).
    type Leg = { key: string; cKey: string; prev: TripStop; curr: TripStop };
    const todo: Leg[] = [];
    for (let i = 1; i < chain.length; i++) {
      const prev = chain[i - 1];
      const curr = chain[i];
      if (curr.dayId !== focusedDayId) continue;
      if (prev.lat == null || prev.lng == null || curr.lat == null || curr.lng == null) continue;
      const cKey = cacheKey(prev, curr);
      if (cache.has(cKey)) continue;
      todo.push({ key: legKey(prev.id, curr.id), cKey, prev, curr });
    }
    if (todo.length === 0) return;

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
            distance_m: typeof res.distanceMeters === "number" ? res.distanceMeters : null,
            line: null,
            stops: null,
            note: null,
            // Address esplicito del leg: il render usa target_id+coords
            // per decidere se il bridge salvato è ancora valido (Step 4).
            target_id: leg.curr.id,
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
      setCache((prev) => {
        const next = new Map(prev);
        for (const r of settled) next.set(r.cKey, { legKey: r.key, bridge: r.bridge });
        return next;
      });

      // Persistenza opportunistica: solo leg "vivi" — entrambi gli endpoint
      // sono scheduled_activities (kind === "activity"), fuzzy o no.
      // Saltiamo i leg per cui esiste già un bridge salvato (vedi
      // `skipPersistFor`): la scelta dell'utente vince sul computed
      // DRIVING-default. Fire-and-forget.
      for (const r of settled) {
        if (r.prev.kind !== "activity" || r.curr.kind !== "activity") continue;
        if (skipPersistRef.current?.has(r.prev.id)) continue;
        api.activities
          .setBridge(r.prev.id, "out", r.bridge as unknown as Record<string, unknown>)
          .catch((err) => console.warn("[useChainBridges] persist failed:", err));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chain, focusedDayId, cache]);

  // Map ritornato al consumer: ricostruito filtrando la cache sui legKey
  // adiacenti nel chain attuale. Cumulativa nella sessione, ma il Map
  // ritornato include solo i leg "vivi" — niente entry "fantasma" da
  // chain passati.
  return useMemo(() => buildComputedFromCache(cache, chain), [chain, cache]);
}

/** Costruisce la Map ritornata al consumer filtrando la cache cumulativa
 *  sui soli legKey adiacenti nel chain attuale. */
function buildComputedFromCache(
  cache: Map<string, CacheEntry>,
  chain: TripStop[],
): Map<string, BridgeData> {
  const alive = new Set<string>();
  for (let i = 1; i < chain.length; i++) {
    alive.add(legKey(chain[i - 1].id, chain[i].id));
  }
  const out = new Map<string, BridgeData>();
  for (const entry of cache.values()) {
    if (alive.has(entry.legKey)) out.set(entry.legKey, entry.bridge);
  }
  return out;
}
