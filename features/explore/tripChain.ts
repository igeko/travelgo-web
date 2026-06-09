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
 *   2. Append dell'accommodation del giorno SE differente dalla stay
 *      registrata l'ultima volta — dedup per `stay_id` (o per
 *      `dayId-legacy-{...}` come fallback per i record senza stay).
 *   3. Skip silenzioso quando coords mancano: l'algoritmo non
 *      sintetizza punti.
 *
 * Conseguenza diretta: per Hotel 5-notti compare UN solo `TripStop`
 * (alla check-in date); per il successivo cambio alloggio compare un
 * nuovo `TripStop`, e la sequenza `[Hotel, Camping]` produce
 * naturalmente il percorso di transizione cross-day senza logiche
 * speciali a valle.
 * ─────────────────────────────────────────────────────────────────
 */

import type { MapMarker, RoutePoint, RouteSpec } from "@/components/ui/Map";
import { iconGlyph, INK, ORANGE } from "@/components/ui/mapPins";
import { IconBed } from "@/components/ui/icons";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import type { TimelineDayData } from "@/features/explore/Timeline";
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
};

/**
 * Costruisce il chain canonico del trip. Pura, deterministica, no I/O.
 *
 * Dedup multi-night: traccia l'ultima `stayKey` aggiunta. Quando il
 * giorno corrente ha la stessa stay, l'accommodation NON viene ri-
 * appesa al chain — la sua identità (e quindi posizione spaziale) è
 * già nel chain dal giorno di check-in. Quando cambia, viene aggiunta
 * di nuovo e diventa il next-stop spaziale.
 */
export function buildTripChain(days: TimelineDayData[]): TripStop[] {
  const chain: TripStop[] = [];
  const ordered = [...days].sort((a, b) => a.day_number - b.day_number);
  let lastStayKey: string | null = null;

  for (const day of ordered) {
    // 1) Activities ordinate, con coords valide.
    const acts = [...day.activities].sort((a, b) => a.position - b.position);
    for (const a of acts) {
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

    // 2) Accommodation, dedup per stay.
    const acc = day.accommodation;
    if (acc?.lat != null && acc?.lng != null) {
      // stay_id quando disponibile (canonical resolver), altrimenti un
      // fallback per-day per il legacy resolver (che non ha stay).
      const stayKey = acc.stay_id ?? `legacy:${day.id}`;
      if (stayKey !== lastStayKey) {
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
        });
        lastStayKey = stayKey;
      }
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
 *  inclusa, niente duplicati multi-night). */
export function chainToMarkers(chain: TripStop[], stateOf: ChainStopState): MapMarker[] {
  return chain.map((s) => ({
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
): RouteSpec[] {
  if (chain.length < 2) return [];

  // Walk the chain, raggruppando per dayId della destinazione.
  // groups: { [dayId]: { firstIdx, points } }
  // `RoutePoint` porta opzionalmente il placeId — propagato dal TripStop
  // di provenienza così downstream (cache server-side, switch a Google
  // Routes con `{placeId}`) può consumarlo senza ri-derivare dai latlng.
  type Group = { firstIdx: number; points: RoutePoint[]; dayId: string };
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
      };
      groups.set(dayId, g);
    }
    g.points.push({ lat: curr.lat, lng: curr.lng, placeId: curr.placeId });
  }

  // Costruisci RouteSpec, scartando quelli degeneri (es. zero-length).
  const out: RouteSpec[] = [];
  for (const g of groups.values()) {
    // Dedup zero-length leg in apertura: se prev (head) == primo punto
    // del giorno, skippa la head.
    const head = g.points[0];
    const firstReal = g.points[1] ?? null;
    const trimmed = sameCoord(head, firstReal) ? g.points.slice(1) : g.points;
    if (trimmed.length < 2) continue;
    out.push({
      id: `day-${g.dayId}`,
      points: trimmed,
      travelMode: "DRIVING",
      style: {
        color: INK,
        weight: DAY_PATH_LINE_WEIGHT,
        opacity: opacityFor(g.dayId),
        casing: { color: ORANGE, weight: DAY_PATH_CASING_WEIGHT },
      },
    });
  }
  return out;
}
