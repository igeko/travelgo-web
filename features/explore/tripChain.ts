/**
 * features/explore/tripChain.ts
 * ─────────────────────────────────────────────────────────────────
 * Una SOLA pipeline che traduce i `TimelineDayData[]` (snapshot del
 * trip + accommodation resolved per-day) in una lista lineare di
 * tappe (`TripStop[]`) deduplicata e ordinata, da cui la mappa deriva
 * sia pin che percorsi tramite trasformazioni triviali.
 *
 * La logica "dinamica" (multi-night dedup, transizioni cross-day,
 * activity→accommodation in posizione corretta) vive QUI E SOLO QUI.
 * Il consumer (mappa) non sa nulla di `accommodation_stays`,
 * `use_previous`, `night_index`. Riceve una lista canonica e basta.
 *
 * Regole di composizione (per giorno, in ordine di `day_number`):
 *   1. Append delle activity del giorno sortate per `position` (con
 *      coordinate valide).
 *   2. Append dell'accommodation del giorno (se ha coords), sempre —
 *      così il path del giorno termina davvero all'alloggio e quello
 *      del giorno successivo parte da lì. Dedup pin via `isPinHidden`:
 *      la prima notte di una stay è "pin visibile", le notti seguenti
 *      sono pin nascosti (`isPinHidden=true`) ma restano nel chain
 *      perché i ROUTE devono passare dall'alloggio ogni sera.
 *   3. Skip silenzioso quando coords mancano: l'algoritmo non
 *      sintetizza punti.
 *
 * Conseguenza:
 *   - `chainToMarkers` filtra `isPinHidden` → un solo pin per stay
 *     multi-notte (Hotel 5-notti = 1 pin).
 *   - `chainToRouteSpecs` consuma il chain pieno → ogni giorno della
 *     stay parte dall'hotel al mattino e ci rientra la sera.
 *   - Il cambio alloggio resta naturale: la sequenza `[Hotel, Camping]`
 *     produce il leg di transizione cross-day senza logiche speciali.
 * ─────────────────────────────────────────────────────────────────
 */

import type { MapMarker, RoutePoint, RouteSpec, TransportMode } from "@/components/ui/Map";
import { iconGlyph, INK, INK_LIGHT } from "@/components/ui/mapPins";
import { IconBed } from "@/components/ui/icons";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import type { TimelineDayData } from "@/features/explore/TimelineV2";
import type { BlockType } from "@/lib/dal/domain";

/** Tappa canonica del trip — atom di tutto il rendering mappa. */
export type TripStop = {
  /** Stable id. activity scheduled.id, oppure `acc:{stay_id|legacy-{dayId}}`. */
  id: string;
  kind: "activity" | "accommodation";
  /** Day a cui la tappa appartiene logicamente — guida dimming e gruppi. */
  dayId: string;
  /** Posizione 0-based nel chain del trip. */
  chainIndex: number;
  lat: number;
  lng: number;
  title: string;
  /**
   * Google Place ID dell'entità sottostante quando disponibile (activity →
   * `location_place_id`, accommodation → `place_id` via accommodation_stays).
   * Carry-through: oggi nessuno lo consuma per il routing, ma è propagato
   * fino a `MapMarker.placeId` e `RoutePoint.placeId` così click-handler,
   * cache server-side futura e dedup semantico possono usarlo senza
   * ri-derivare dai lat/lng.
   */
  placeId: string | null;
  /** Glyph come stringa SVG già pronta per `MapMarker.glyph`. */
  glyph: string;
  /**
   * `true` per le notti successive alla prima di una stay multi-notte.
   * Lo stop resta nel chain (così il path passa dall'hotel ogni sera
   * e ne parte ogni mattina), ma `chainToMarkers` lo filtra per non
   * disegnare un secondo pin sopra al primo.
   */
  isPinHidden?: boolean;
};

/**
 * Costruisce il chain canonico del trip. Pura, deterministica, no I/O.
 *
 * Multi-night handling: l'accommodation di OGNI giorno (che ne ha una)
 * viene sempre appesa al chain a fine giornata, così i path della
 * mappa terminano davvero all'alloggio e il giorno dopo ne parte —
 * anche durante una stay multi-notte (Hotel A per D1-D2-D3 → ogni
 * giorno ha il leg sera→hotel e mattina→hotel).
 *
 * Pin dedup: la prima notte di una stay è il pin "vero"; le notti
 * seguenti hanno lo stesso `id` ma `isPinHidden=true`. `chainToMarkers`
 * le filtra, quindi sulla mappa compare un solo pin per stay.
 */
export function buildTripChain(days: TimelineDayData[]): TripStop[] {
  const chain: TripStop[] = [];
  const ordered = [...days].sort((a, b) => a.day_number - b.day_number);
  const seenStays = new Set<string>();

  for (const day of ordered) {
    // 1) Activities ordinate, con coords valide. Le tappe `fuzzy` sono
    //    escluse dal chain: non hanno uno slot fisso nel routing e sulla
    //    mappa usano un marcatore dedicato (cerchio tratteggiato,
    //    `makeFuzzyPin`) gestito a parte dal consumer.
    const acts = [...day.activities].sort((a, b) => a.position - b.position);
    for (const a of acts) {
      if (a.fuzzy === true) continue;
      if (a.location_lat == null || a.location_lng == null) continue;
      chain.push({
        id: a.id,
        kind: "activity",
        dayId: day.id,
        chainIndex: chain.length,
        lat: a.location_lat,
        lng: a.location_lng,
        title: a.title,
        placeId: a.location_place_id ?? null,
        glyph: resolveGlyph({ iconKey: a.icon ?? null, type: (a.type ?? null) as BlockType | null }),
      });
    }

    // 2) Accommodation: appesa sempre quando ha coords; pin nascosto
    //    dalla seconda notte in poi della stessa stay.
    const acc = day.accommodation;
    if (acc?.lat != null && acc?.lng != null) {
      // stay_id quando disponibile (canonical resolver), altrimenti un
      // fallback per-day per il legacy resolver (che non ha stay).
      const stayKey = acc.stay_id ?? `legacy:${day.id}`;
      const isFirstNight = !seenStays.has(stayKey);
      chain.push({
        id: `acc:${stayKey}`,
        kind: "accommodation",
        dayId: day.id,
        chainIndex: chain.length,
        lat: acc.lat,
        lng: acc.lng,
        title: acc.name,
        placeId: acc.place_id ?? null,
        glyph: iconGlyph("acc:bed", IconBed),
        isPinHidden: !isFirstNight,
      });
      if (isFirstNight) seenStays.add(stayKey);
    }
  }

  return chain;
}

/**
 * Stato visivo per i roadmap pin — ricalcola dimming guardando solo il
 * giorno di appartenenza della tappa. Identica regola che usavamo prima
 * con `itineraryMarkers`, ma derivata in un solo punto.
 */
export type ChainStopState = (stop: TripStop) => "default" | "dimmed";

/** Trasforma il chain in `MapMarker[]` (un pin per tappa, accommodation
 *  inclusa, niente duplicati multi-night). Le notti "ripetute" della
 *  stessa stay (`isPinHidden`) restano nel chain per i route ma non
 *  vengono materializzate come marker. */
export function chainToMarkers(chain: TripStop[], stateOf: ChainStopState): MapMarker[] {
  const visible = chain.filter((s) => !s.isPinHidden);
  return visible.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    title: s.title,
    placeId: s.placeId,
    glyph: s.glyph,
    variant: "roadmap" as const,
    roadmapState: stateOf(s),
    // accommodation = arancione, activity = blu (icona bianca su entrambi).
    roadmapKind: s.kind,
    // Drag&drop: ExploreMap inoltra il dragend al host via onExtraMarkerDragEnd.
    draggable: true,
  }));
}

/** Stesso `sameCoord` usato in passato — confronto numerico esatto (i
 *  punti vengono dalle stesse fonti, quindi no float drift). */
function sameCoord(a: { lat: number; lng: number } | null, b: { lat: number; lng: number } | null): boolean {
  return !!a && !!b && a.lat === b.lat && a.lng === b.lng;
}

/**
 * Trasforma il chain in `RouteSpec[]` per la mappa.
 *
 * Modello: ogni leg `chain[i] → chain[i+1]` è "di pertinenza" del
 * `dayId` della tappa di destinazione (chain[i+1]). Così quando
 * l'utente focalizza un giorno, le polyline che ARRIVANO nelle sue
 * tappe restano piene, le altre dimmed — coerente con i pin.
 *
 * Output: una `RouteSpec` per ogni giorno che ha almeno una tappa nel
 * chain, con `points = [stop_di_partenza_dal_giorno_prima, ...tappe_di_oggi]`.
 * Lo stop di partenza è il chain entry IMMEDIATAMENTE precedente al
 * primo del giorno (di solito l'accommodation del giorno prima, o
 * l'ultima activity di quel giorno se senza alloggio). Saltato quando
 * coincide col primo del giorno (zero-length leg).
 */
/**
 * Stile brand del day-path: linea ORANGE 2.5px su casing INK 5px (spec
 * /design/route-casing). Esposto come costante così il dev debug e
 * ExploreNextShell restano in sync senza tramandare colori per parametro.
 */
const DAY_PATH_LINE_WEIGHT = 2.5;
const DAY_PATH_CASING_WEIGHT = 5;

export function chainToRouteSpecs(
  chain: TripStop[],
  opacityFor: (dayId: string) => number,
  /**
   * Lookup opzionale del transport per ogni leg (`prev.id → curr.id`).
   * Quando passato, il RouteSpec del giorno porta `perLegTransport[]` e
   * la mappa applica `legStyle` per-leg: walking → puntinato (no casing),
   * bus → tratteggiato, car/taxi → solido spesso. Senza, l'intera
   * polyline resta uniforme DRIVING.
   */
  getLegTransport?: (fromId: string, toId: string) => TransportMode | null,
): RouteSpec[] {
  if (chain.length < 2) return [];

  // Walk the chain, raggruppando per dayId della destinazione.
  // groups: { [dayId]: { firstIdx, points } }
  // `RoutePoint` porta opzionalmente il placeId — propagato dal TripStop
  // di provenienza così downstream (cache server-side, switch a Google
  // Routes con `{placeId}`) può consumarlo senza ri-derivare dai latlng.
  type Group = {
    firstIdx: number;
    points: RoutePoint[];
    dayId: string;
    transports: (TransportMode | null)[];
  };
  const groups = new Map<string, Group>();
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1];
    const curr = chain[i];
    const dayId = curr.dayId;
    let g = groups.get(dayId);
    if (!g) {
      g = {
        firstIdx: i,
        dayId,
        points: [{ lat: prev.lat, lng: prev.lng, placeId: prev.placeId }],
        transports: [],
      };
      groups.set(dayId, g);
    }
    g.points.push({ lat: curr.lat, lng: curr.lng, placeId: curr.placeId });
    g.transports.push(getLegTransport?.(prev.id, curr.id) ?? null);
  }

  // Costruisci RouteSpec, scartando quelli degeneri (es. zero-length).
  const out: RouteSpec[] = [];
  for (const g of groups.values()) {
    // Dedup zero-length leg in apertura: se prev (head) == primo punto
    // del giorno, skippa la head.
    const head = g.points[0];
    const firstReal = g.points[1] ?? null;
    const dropHead = sameCoord(head, firstReal);
    const trimmed = dropHead ? g.points.slice(1) : g.points;
    if (trimmed.length < 2) continue;
    // Allinea i transport quando dropHead taglia il primo punto.
    const trimmedTransports = dropHead ? g.transports.slice(1) : g.transports;
    const hasAnyTransport = trimmedTransports.some((t) => t !== null);
    out.push({
      id: `day-${g.dayId}`,
      points: trimmed,
      travelMode: "DRIVING",
      // Solo se almeno un transport è noto: senza, lascia indefinito così
      // il Map riconosce uniformità e fa una sola call (cheap path).
      ...(hasAnyTransport ? { perLegTransport: trimmedTransports } : {}),
      style: {
        color: INK_LIGHT,
        weight: DAY_PATH_LINE_WEIGHT,
        opacity: opacityFor(g.dayId),
        casing: { color: INK, weight: DAY_PATH_CASING_WEIGHT },
      },
    });
  }
  return out;
}
