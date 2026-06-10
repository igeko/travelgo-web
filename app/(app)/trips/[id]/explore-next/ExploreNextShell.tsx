"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreMap, type AddToTripRequest } from "@/features/explore/ExploreMap";
import type { LatLng, MapHandle, MapMarker, RouteSpec } from "@/components/ui/Map";
import { type TimelineDayData } from "@/features/explore/Timeline";
import { TimelineV2 } from "@/features/explore/TimelineV2";
import { AddedPill, type AddedPillState } from "@/features/explore/AddedPill";
import { buildTripChain, chainToMarkers, chainToRouteSpecs } from "@/features/explore/tripChain";
import { useChainBridges } from "@/features/explore/useChainBridges";
import type { NightWaypoint } from "@/lib/explore/nightRoute";
import { api } from "@/lib/client";
import type { Activity } from "@/lib/dal/domain";
import {
  applyOptStayActions,
  type OptStayAction,
} from "@/features/explore/optStayActions";
import type { PlaceResult } from "@/components/ui/AddressField";

/**
 * Apply optimistic address edits onto a TimelineDayData[] projection. The
 * map is keyed by activity entity id; each entry overwrites location/
 * place_id/lat/lng on every scheduled occurrence AND on every accommodation
 * pointing to that entity, so the change is visible everywhere at once
 * before the server snapshot lands.
 */
function applyAddressEdits(
  days: TimelineDayData[],
  edits: Map<string, PlaceResult | null>,
): TimelineDayData[] {
  return days.map((day) => {
    let activities = day.activities;
    let mutated = false;
    activities = activities.map((act) => {
      const entityId = act.activity_id ?? act.entity_id ?? null;
      if (!entityId || !edits.has(entityId)) return act;
      mutated = true;
      const p = edits.get(entityId) ?? null;
      return {
        ...act,
        location: p?.formatted ?? null,
        location_place_id: p?.placeId ?? null,
        location_lat: p?.lat ?? null,
        location_lng: p?.lng ?? null,
      };
    });
    const acc = day.accommodation;
    if (acc?.activity_id && edits.has(acc.activity_id)) {
      const p = edits.get(acc.activity_id) ?? null;
      return {
        ...day,
        activities: mutated ? activities : day.activities,
        accommodation: {
          ...acc,
          address: p?.formatted ?? null,
          place_id: p?.placeId ?? null,
          lat: p?.lat ?? null,
          lng: p?.lng ?? null,
        },
      };
    }
    return mutated ? { ...day, activities } : day;
  });
}

/**
 * Apply optimistic time/duration edits onto a TimelineDayData[] projection.
 * Keyed by scheduled_activities.id (l'istanza, non l'entity): time e
 * duration_min sono campi dell'istanza pianificata, quindi una stessa
 * activity entity può avere orari diversi su giorni diversi senza
 * collisioni. Le entry undefined nei campi NON azzerano il valore (es. un
 * patch solo `time` lascia `duration_min` invariato).
 */
type ScheduledTimePatch = { time?: string | null; duration_min?: number | null };
function applyTimeEdits(
  days: TimelineDayData[],
  edits: Map<string, ScheduledTimePatch>,
): TimelineDayData[] {
  if (edits.size === 0) return days;
  return days.map((day) => {
    let mutated = false;
    const activities = day.activities.map((act) => {
      const patch = edits.get(act.id);
      if (!patch) return act;
      mutated = true;
      return {
        ...act,
        time: patch.time !== undefined ? patch.time : act.time,
        duration_min: patch.duration_min !== undefined ? patch.duration_min : act.duration_min,
      };
    });
    return mutated ? { ...day, activities } : day;
  });
}

/**
 * Apply optimistic icon edits onto a TimelineDayData[] projection. Keyed by
 * activity entity id; each entry overwrites `activity.icon` on every scheduled
 * occurrence. Per le accommodation V2 risale all'activity via accommodation.
 * activity_id e sovrascrive iconKey, così l'icona corrente nel pannello e nel
 * pin lodging si aggiornano subito senza attendere il server snapshot.
 */
function applyIconEdits(
  days: TimelineDayData[],
  edits: Map<string, string>,
): TimelineDayData[] {
  if (edits.size === 0) return days;
  return days.map((day) => {
    let mutated = false;
    const activities = day.activities.map((act) => {
      const entityId = act.activity_id ?? act.entity_id ?? null;
      if (!entityId || !edits.has(entityId)) return act;
      mutated = true;
      return { ...act, icon: edits.get(entityId)! };
    });
    const acc = day.accommodation;
    if (acc?.activity_id && edits.has(acc.activity_id)) {
      return {
        ...day,
        activities: mutated ? activities : day.activities,
        accommodation: { ...acc, iconKey: edits.get(acc.activity_id)! },
      };
    }
    return mutated ? { ...day, activities } : day;
  });
}

/**
 * Apply optimistic coordinate edits onto a TimelineDayData[] projection.
 * Keyed by activity entity id. Overwrites only lat/lng on every scheduled
 * occurrence AND on every accommodation pointing to that entity, leaving
 * `location` text and `place_id` untouched (the user can fix those via the
 * AddressField afterwards). Used after a pin drag&drop.
 */
function applyCoordEdits(
  days: TimelineDayData[],
  edits: Map<string, { lat: number; lng: number }>,
): TimelineDayData[] {
  return days.map((day) => {
    let activities = day.activities;
    let mutated = false;
    activities = activities.map((act) => {
      const entityId = act.activity_id ?? act.entity_id ?? null;
      if (!entityId || !edits.has(entityId)) return act;
      mutated = true;
      const p = edits.get(entityId)!;
      return { ...act, location_lat: p.lat, location_lng: p.lng };
    });
    const acc = day.accommodation;
    if (acc?.activity_id && edits.has(acc.activity_id)) {
      const p = edits.get(acc.activity_id)!;
      return {
        ...day,
        activities: mutated ? activities : day.activities,
        accommodation: { ...acc, lat: p.lat, lng: p.lng },
      };
    }
    return mutated ? { ...day, activities } : day;
  });
}

/**
 * Optimistic Move actions. Two variants:
 *  - `direction: "up"|"down"` — used by the ↑↓ buttons in the detail footer;
 *    intra-day swap or cross-day jump on border.
 *  - `targetDayId + targetIndex` — used by the timeline drag&drop; the
 *    activity lands at the exact requested 0-based index on the target day.
 * Applied as a left-fold on visibleDays so multiple moves can stack before
 * the server snapshot lands.
 */
type OptMoveAction =
  | { id: string; scheduledId: string; direction: "up" | "down" }
  | { id: string; scheduledId: string; targetDayId: string; targetIndex: number };

function applyMoveActions(
  days: TimelineDayData[],
  actions: readonly OptMoveAction[],
): TimelineDayData[] {
  let out = days;
  for (const action of actions) out = applyOneMove(out, action);
  return out;
}

function applyOneMove(
  days: TimelineDayData[],
  action: OptMoveAction,
): TimelineDayData[] {
  if ("targetDayId" in action) return applyMoveToPosition(days, action);
  return applyMoveDirection(days, action);
}

/** Drag&drop projection: place the activity at the explicit (dayId, index). */
function applyMoveToPosition(
  days: TimelineDayData[],
  action: { scheduledId: string; targetDayId: string; targetIndex: number },
): TimelineDayData[] {
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);
  // Locate source
  const fromIdx = sortedDays.findIndex((d) =>
    d.activities.some((x) => x.id === action.scheduledId),
  );
  if (fromIdx === -1) return days;
  const fromDay = sortedDays[fromIdx];
  const target = fromDay.activities.find((x) => x.id === action.scheduledId);
  if (!target) return days;

  // Locate destination (clamp index against destination size)
  const toIdx = sortedDays.findIndex((d) => d.id === action.targetDayId);
  if (toIdx === -1) return days;
  const toDay = sortedDays[toIdx];

  const sourceActs = fromDay.activities.filter((a) => a.id !== target.id);
  const destBase =
    fromDay.id === toDay.id
      ? sourceActs
      : [...toDay.activities].sort((a, b) => a.position - b.position);
  const moved = { ...target, day_id: toDay.id };
  const idx = Math.max(0, Math.min(action.targetIndex, destBase.length));
  const newDest = [
    ...destBase.slice(0, idx),
    moved,
    ...destBase.slice(idx),
  ].map((a, i) => ({ ...a, position: i + 1 }));

  return sortedDays.map((d) => {
    if (d.id === toDay.id) return { ...d, activities: newDest };
    if (d.id === fromDay.id && fromDay.id !== toDay.id) {
      return { ...d, activities: sourceActs.map((a, i) => ({ ...a, position: i + 1 })) };
    }
    return d;
  });
}

/** Footer ↑↓ projection (original behaviour). */
function applyMoveDirection(
  days: TimelineDayData[],
  action: { scheduledId: string; direction: "up" | "down" },
): TimelineDayData[] {
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);
  const dayIdx = sortedDays.findIndex((d) =>
    d.activities.some((x) => x.id === action.scheduledId),
  );
  if (dayIdx === -1) return days;
  const day = sortedDays[dayIdx];
  const acts = [...day.activities].sort((a, b) => a.position - b.position);
  const idx = acts.findIndex((x) => x.id === action.scheduledId);
  if (idx === -1) return days;
  const target = acts[idx];

  // Intra-day swap
  const swapIdx = action.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx >= 0 && swapIdx < acts.length) {
    const other = acts[swapIdx];
    const newActs = acts.map((a) => {
      if (a.id === target.id) return { ...a, position: other.position };
      if (a.id === other.id)  return { ...a, position: target.position };
      return a;
    });
    return sortedDays.map((d) => (d.id === day.id ? { ...d, activities: newActs } : d));
  }

  // Cross-day boundary
  const destDayIdx = action.direction === "up" ? dayIdx - 1 : dayIdx + 1;
  if (destDayIdx < 0 || destDayIdx >= sortedDays.length) return days;
  const destDay = sortedDays[destDayIdx];
  const sourceActs = acts.filter((a) => a.id !== target.id);
  const destActs = [...destDay.activities].sort((a, b) => a.position - b.position);
  const moved = { ...target, day_id: destDay.id };
  const newDest =
    action.direction === "up"
      ? [...destActs, moved].map((a, i) => ({ ...a, position: i + 1 }))
      : [moved, ...destActs].map((a, i) => ({ ...a, position: i + 1 }));
  return sortedDays.map((d) => {
    if (d.id === day.id) return { ...d, activities: sourceActs };
    if (d.id === destDay.id) return { ...d, activities: newDest };
    return d;
  });
}

/** Opacità della polyline percorso: piena per il giorno in focus (o quando
 *  nessun giorno è focused), ridotta per gli altri quando un giorno è focused. */
const PATH_OPACITY_DEFAULT = 0.8;
const PATH_OPACITY_DIMMED = 0.18;

type Props = {
  tripId: string;
  days: TimelineDayData[];
  /** Trip-level fallback centre (used by the underlying ExploreMap). */
  center: LatLng;
  /** Trip-level fallback zoom. */
  zoom: number;
  /** Pre-computed night-route waypoints (last activity + sleep spot, by day). */
  nightRoute: NightWaypoint[];
};

/**
 * Composizione di layout della Explore (next):
 *   ─ ExploreMap full-bleed (sfondo, con tutte le feature reali)
 *   ─ Panel sinistro: Timeline in card arrotondata
 *
 * Il pannello copre i ~376 px sinistri della mappa: l'inset del viewport
 * viene misurato a runtime con ResizeObserver e propagato a ExploreMap così
 * che la ricerca per categoria si centri sull'area effettivamente visibile.
 *
 * I marker dell'itinerario sono pin "roadmap" (spec /design/roadmap-pins):
 * una pin per ogni attività di qualsiasi giorno con coordinate. Quando un
 * giorno è esplicitamente in focus (l'utente l'ha espanso nella Timeline),
 * le sue attività restano in stato "default" e quelle degli altri giorni
 * passano a "dimmed".
 *
 * Owner UNICO dello stato ottimistico di add/remove e della pill di
 * feedback: ExploreMap richiede l'azione, ExploreNextShell la esegue.
 * Le attività appaiono/scompaiono dalla Timeline (e dai pin sulla mappa)
 * subito; il server cattura via router.refresh().
 */
export function ExploreNextShell({ tripId, days, center, zoom, nightRoute }: Props) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const [panelWidth, setPanelWidth] = useState(376);

  // Giorno selezionato nella Timeline (last opened wins).
  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.day_number - b.day_number),
    [days],
  );
  const [selectedDayId, setSelectedDayId] = useState<string | null>(
    sortedDays[0]?.id ?? null,
  );
  // Cooperazione con il roadmap-pin: la mappa entra in "day-focus mode" solo
  // dopo che l'utente ha esplicitamente espanso un giorno dalla Timeline.
  // Finché nessun giorno è stato focused, tutti i pin sono in stato default;
  // dopo, i pin del giorno selezionato restano default e gli altri diventano
  // dimmed. Il default-id all'avvio (primo giorno cronologico) NON conta come
  // focus esplicito — è solo il preselect logico per la Timeline.
  // Su deselezione (id === null), torniamo allo stato "tutto in evidenza":
  // dayFocused=false rispegne il dimming su pin e path.
  const [dayFocused, setDayFocused] = useState(false);
  const handleSelectDay = useCallback((id: string | null) => {
    if (id === null) {
      setDayFocused(false);
      return;
    }
    setSelectedDayId(id);
    setDayFocused(true);
  }, []);

  // Ref al ExploreMap → expone gli imperativi del Map sottostante per la
  // sync row↔pin (panToMarker su row-click) e per il focus-day (fitMarkers).
  // I due useEffect che la usano vivono più in basso, dopo `chain` e
  // `selectedActivityId`, per evitare TDZ errors.
  const mapRef = useRef<MapHandle | null>(null);
  // Driven by Timeline's "open activity" (a stop expanded inline by click).
  // Fed to the Add-to-Trip algorithm via ExploreMap so the CTA on a place
  // card knows where (after which stop) the new place should land. Null
  // when no row is open — the algorithm falls back to selectedDayId, then
  // to "end of last populated day".
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  // Row Timeline evidenziata come "selezionata ma non aperta" durante
  // l'hover sul pin corrispondente. Per activity è lo scheduled.id; per
  // accommodation traduciamo `acc:${stayKey}` in `lodging-${dayId}` (la
  // Timeline non sa nulla del formato pin → mantiene il proprio id).
  // Convivenza con l'open: la Timeline ignora l'hover sulla row già aperta.
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Stato ottimistico:
  //  - pendingAdds: activity restituite dall'addPlace, già visibili in Timeline
  //    prima che il server snapshot le rimpalla via router.refresh().
  //  - pendingRemoves: id di attività che il client ha "tolto" subito; il DELETE
  //    server viaggia in background. Filtrano l'array `days` dell'SSR finché il
  //    refresh non porta lo stato allineato.
  const [pendingAdds, setPendingAdds] = useState<Activity[]>([]);
  const [pendingRemoves, setPendingRemoves] = useState<Set<string>>(new Set());
  const [pillState, setPillState] = useState<AddedPillState | null>(null);

  // Vista effettiva: SSR + adds - removes, ordinato per position. Sostituisce
  // l'array `days` puro sia nella Timeline sia nel calcolo dei pin roadmap.
  //
  // Dedup contro `day.activities`: una volta che il server snapshot rimpalla
  // un'attività precedentemente "ottimistica", la riga reale prevale e quella
  // pending viene ignorata. Niente useEffect di reconcile — `pendingAdds`
  // accumula durante la sessione, ma le entry stale non producono duplicati.
  const visibleDays = useMemo<TimelineDayData[]>(() => {
    if (pendingAdds.length === 0 && pendingRemoves.size === 0) return days;
    const addsByDay = new Map<string, Activity[]>();
    for (const a of pendingAdds) {
      const list = addsByDay.get(a.day_id) ?? [];
      list.push(a);
      addsByDay.set(a.day_id, list);
    }
    return days.map((d) => {
      const realIds = new Set(d.activities.map((a) => a.id));
      const filtered = d.activities.filter((a) => !pendingRemoves.has(a.id));
      const extras = (addsByDay.get(d.id) ?? []).filter(
        (a) => !realIds.has(a.id) && !pendingRemoves.has(a.id),
      );
      if (extras.length === 0) return { ...d, activities: filtered };
      return {
        ...d,
        activities: [...filtered, ...extras].sort((a, b) => a.position - b.position),
      };
    });
  }, [days, pendingAdds, pendingRemoves]);

  // Optimistic Stop↔Sleep / stepper overlay: applied on top of visibleDays
  // so both the Timeline and the map pins / day-path routes downstream all
  // see the same projected state. Cleared during render when the server
  // snapshot lands via router.refresh() (pattern: "adjusting state when
  // props change", https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  const [optStayActions, setOptStayActions] = useState<OptStayAction[]>([]);
  const [openOverride, setOpenOverride] = useState<string | null | undefined>(undefined);
  // Optimistic address edits keyed by activity entity id. An entity edit
  // propagates to every scheduled occurrence and every accommodation that
  // points to it, so we apply the map on a second projection pass.
  const [optAddressEdits, setOptAddressEdits] = useState<Map<string, PlaceResult | null>>(
    () => new Map(),
  );
  // Optimistic pin-drag coords (lat/lng only, by activity entity id). Cleared
  // by the same snapshot-arrival check below.
  const [optCoordEdits, setOptCoordEdits] = useState<Map<string, { lat: number; lng: number }>>(
    () => new Map(),
  );
  // Optimistic move actions (intra-day swap or cross-day jump). Stacked in
  // order so multiple rapid clicks compose correctly.
  const [optMoveActions, setOptMoveActions] = useState<OptMoveAction[]>([]);
  // Optimistic time/duration edits keyed by scheduled_activities.id. Le
  // chip Arrivo/Partenza + Duration picker scrivono prima qui (UI
  // istantanea), poi la PATCH va in background; al refresh del snapshot
  // l'edit viene scartato dal check su `days` qui sotto.
  const [optTimeEdits, setOptTimeEdits] = useState<Map<string, ScheduledTimePatch>>(
    () => new Map(),
  );
  // Optimistic icon edits keyed by activity entity id. L'icona è dato di
  // entità (activities.icon), quindi propaga a ogni occorrenza scheduled e
  // all'accommodation che la usa come Property. Cleared come gli altri overlay
  // al rientro del snapshot.
  const [optIconEdits, setOptIconEdits] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [lastDaysRef, setLastDaysRef] = useState(days);
  if (days !== lastDaysRef) {
    setLastDaysRef(days);
    if (optStayActions.length > 0) setOptStayActions([]);
    if (openOverride !== undefined) setOpenOverride(undefined);
    if (optAddressEdits.size > 0) setOptAddressEdits(new Map());
    if (optCoordEdits.size > 0) setOptCoordEdits(new Map());
    if (optMoveActions.length > 0) setOptMoveActions([]);
    if (optTimeEdits.size > 0) setOptTimeEdits(new Map());
    if (optIconEdits.size > 0) setOptIconEdits(new Map());
  }

  const effectiveDays = useMemo<TimelineDayData[]>(() => {
    let out = optStayActions.length === 0
      ? visibleDays
      : applyOptStayActions(visibleDays, optStayActions);
    if (optAddressEdits.size > 0) out = applyAddressEdits(out, optAddressEdits);
    if (optCoordEdits.size > 0) out = applyCoordEdits(out, optCoordEdits);
    if (optMoveActions.length > 0) out = applyMoveActions(out, optMoveActions);
    if (optTimeEdits.size > 0) out = applyTimeEdits(out, optTimeEdits);
    if (optIconEdits.size > 0) out = applyIconEdits(out, optIconEdits);
    return out;
  }, [visibleDays, optStayActions, optAddressEdits, optCoordEdits, optMoveActions, optTimeEdits, optIconEdits]);

  // Chain canonico del trip — ordinato, dedup multi-night, sa già dove
  // mettere l'accommodation (ultimo nodo del giorno di check-in, mai
  // ripetuto sui notti successive). Da qui derivano marker e route in
  // due trasformazioni triviali; la mappa NON conosce più la logica
  // accommodation/stays/use_previous. Vedi `features/explore/tripChain.ts`.
  const chain = useMemo(() => buildTripChain(effectiveDays), [effectiveDays]);

  // Stato di dimming per stop — regola identica al passato:
  //   - nessun giorno focused → tutto "default"
  //   - un giorno focused → stop di QUEL giorno "default", gli altri "dimmed"
  const stateOf = useCallback(
    (stop: { dayId: string }): "default" | "dimmed" =>
      !dayFocused || stop.dayId === selectedDayId ? "default" : "dimmed",
    [dayFocused, selectedDayId],
  );
  const opacityOf = useCallback(
    (dayId: string) =>
      !dayFocused || dayId === selectedDayId ? PATH_OPACITY_DEFAULT : PATH_OPACITY_DIMMED,
    [dayFocused, selectedDayId],
  );

  const itineraryMarkers = useMemo<MapMarker[]>(
    () => chainToMarkers(chain, stateOf),
    [chain, stateOf],
  );

  // Percorso reale lungo il chain — RouteSpec per giorno, leg "di
  // pertinenza" della tappa di destinazione (per il dimming). Geometria
  // via Google Routes (`api.routes.compute`, cache localStorage 30gg).
  // Travel mode DRIVING uniforme, niente `perLegTransport` — la linea
  // resta continua e leggibile (legStyle("walk") sarebbe dotted, ecc.).
  const dayPathRoutes = useMemo<RouteSpec[]>(
    () => chainToRouteSpecs(chain, opacityOf),
    [chain, opacityOf],
  );

  // Bridge calcolati lazy per i leg del chain: ad ogni mount, ogni coppia
  // consecutiva viene ricomputata via Google Routes (mode DRIVING). La
  // cache localStorage 30gg condivisa con la mappa gestisce il dedup
  // network — punti uguali → cache hit, zero call. Il valore eventualmente
  // persistito su `bridge_out_json` può essere stantio (un addPlace passato
  // su un chain diverso), quindi non lo usiamo come dedup; piuttosto la
  // persistenza overwrite-sempre aggiorna il DB alla verità corrente.
  const computedBridges = useChainBridges(chain);

  // Sync row→pin: quando l'utente seleziona una row in Timeline (o l'host
  // setta selectedActivityId da altre vie, incluso il click su un pin), pan
  // verso il marker corrispondente senza cambiare zoom. panTo è idempotente
  // (no-op se già nel viewport).
  useEffect(() => {
    if (!selectedActivityId) return;
    mapRef.current?.panToMarker(selectedActivityId);
  }, [selectedActivityId]);

  // Sync day-focus → fit dei pin di quel giorno (zoom incluso: l'utente ha
  // esplicitamente chiesto il focus). Saltato quando il giorno non ha pin
  // (es. nessuna activity geo-localizzata).
  useEffect(() => {
    if (!dayFocused || !selectedDayId) return;
    const ids = chain.filter((s) => s.dayId === selectedDayId).map((s) => s.id);
    if (ids.length === 0) return;
    mapRef.current?.fitMarkers(ids, { padding: 80, maxZoom: 15 });
  }, [dayFocused, selectedDayId, chain]);

  // Latch per evitare doppi-fire ravvicinati (es. il bottone risponde in
  // rapida sequenza al click ma React non ha ancora unmountato la card).
  const addingRef = useRef(false);

  /**
   * Wired su ExploreMap. Esegue la POST, mostra la pill e — appena la
   * risposta arriva — inietta la riga ottimistica così la Timeline si
   * aggiorna SUBITO, senza attendere il `router.refresh()` server-side.
   */
  const handleAddToTripRequest = useCallback(
    (input: AddToTripRequest) => {
      if (addingRef.current) return;
      addingRef.current = true;
      setPillState({ kind: "pending" });
      api.trips
        .addPlace(tripId, {
          place: {
            placeId: input.placeId,
            title: input.title,
            lat: input.lat,
            lng: input.lng,
            categories: input.categories,
            icon: input.icon,
            fuzzy: input.fuzzy,
            isAccommodation: input.isAccommodation,
          },
          selectedDayId,
          selectedActivityId,
        })
        .then((res) => {
          setPendingAdds((prev) => [...prev, res.scheduledActivity]);
          // Apri + porta in vista la row appena aggiunta. TimelineV2 riusa
          // lo stesso helper di scroll del pin hover, e l'effect su
          // openId → onSelectActivity bubble fa selezionare automaticamente
          // il pin corrispondente sulla mappa.
          setOpenOverride(res.scheduledActivity.id);
          setPillState({
            kind: "success",
            dayNumber: res.position.dayNumber,
            afterTitle: res.position.afterTitle,
            warnings: res.warnings,
          });
          router.refresh();
        })
        .catch((err) => {
          console.error("[ExploreNextShell] addPlace failed:", err);
          setPillState({ kind: "error", action: "add" });
        })
        .finally(() => {
          addingRef.current = false;
        });
    },
    [tripId, selectedDayId, selectedActivityId, router],
  );

  /**
   * Remove ottimistico: la riga sparisce subito da Timeline. Se il DELETE
   * fallisce, ripristiniamo lo stato e mostriamo la pill di errore.
   * Se la riga era anche in `pendingAdds` (la stiamo rimuovendo subito dopo
   * un add ottimistico non ancora rispalmato dal server), la togliamo da
   * lì pure — altrimenti riapparirebbe come "extra" in visibleDays.
   */
  const handleRemoveActivity = useCallback(
    async (scheduledId: string) => {
      setPendingRemoves((prev) => {
        const next = new Set(prev);
        next.add(scheduledId);
        return next;
      });
      setPendingAdds((prev) => prev.filter((a) => a.id !== scheduledId));
      try {
        await api.activities.removeFromDay(scheduledId);
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] removeFromDay failed:", err);
        setPendingRemoves((prev) => {
          const next = new Set(prev);
          next.delete(scheduledId);
          return next;
        });
        setPillState({ kind: "error", action: "remove" });
      }
    },
    [router],
  );

  const popOptAction = useCallback((id: string) => {
    setOptStayActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const fireStayOp = useCallback(
    async (
      action: OptStayAction,
      op: () => Promise<unknown>,
      label: string,
    ) => {
      setOptStayActions((prev) => [...prev, action]);
      try {
        await op();
        router.refresh();
      } catch (err) {
        console.error(`[ExploreNextShell] ${label} failed:`, err);
        popOptAction(action.id);
        setOpenOverride(undefined);
        setPillState({ kind: "error", action: "remove" });
      }
    },
    [router, popOptAction],
  );

  /** Lightweight unique id for queued actions. crypto.randomUUID is widely
   *  available in modern browsers; falling back to Math.random keeps SSR &
   *  older environments happy. */
  const newActionId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const handleConvertToSleep = useCallback(
    (scheduledId: string) => {
      const day = visibleDays.find((d) =>
        d.activities.some((a) => a.id === scheduledId),
      );
      if (day) setOpenOverride(`lodging-${day.id}`);
      return fireStayOp(
        { id: newActionId(), kind: "convertToSleep", scheduledId },
        () => api.accommodations.convertFromScheduled(scheduledId),
        "convertToSleep",
      );
    },
    [visibleDays, fireStayOp],
  );

  const handleConvertToStop = useCallback(
    (stayId: string) => {
      // Find the check-in day; the synthesized scheduled-activity placeholder
      // uses `opt:${stayId}` as its id — match that so the popover follows.
      setOpenOverride(`opt:${stayId}`);
      return fireStayOp(
        { id: newActionId(), kind: "convertToStop", stayId },
        () => api.accommodations.convertToStop(stayId),
        "convertToStop",
      );
    },
    [fireStayOp],
  );

  const handleExtendStay = useCallback(
    (stayId: string) => {
      // Keep the popover where it was — the active row is the one the user
      // clicked the "+" on, which still exists in the projection.
      return fireStayOp(
        { id: newActionId(), kind: "extend", stayId },
        () => api.accommodations.extend(stayId),
        "extendStay",
      );
    },
    [fireStayOp],
  );

  /**
   * Patch del record scheduled_activities — chiamata dalle chip Arrivo/
   * Partenza e dal Duration picker nel pannello Activity.
   *
   * Optimistic: applica subito sull'overlay locale (`optTimeEdits`), poi
   * PATCH in background e router.refresh. Il check su `days` qui sopra
   * scarta l'overlay al rientro del snapshot fresco. In caso di errore
   * rolliamo back rimuovendo l'entry e mostriamo l'error pill.
   */
  const handleUpdateActivityInstance = useCallback(
    async (
      scheduledId: string,
      patch: { time?: string | null; duration_min?: number | null },
    ) => {
      // Optimistic apply: l'utente vede l'orario/durata nuovi in chip
      // istantaneamente. Merge col patch precedente (se chiamiamo prima
      // time e poi duration_min stessa istanza), così entrambe le
      // modifiche rimangono visibili finché il snapshot non arriva.
      setOptTimeEdits((prev) => {
        const next = new Map(prev);
        const merged = { ...(next.get(scheduledId) ?? {}), ...patch };
        next.set(scheduledId, merged);
        return next;
      });
      try {
        await api.activities.updateInstance(scheduledId, patch);
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] updateActivityInstance failed:", err);
        // Rollback: drop dell'entry intera. Se l'utente aveva due
        // modifiche pendenti sulla stessa istanza, scartiamo entrambe
        // (più semplice e prevedibile del rollback parziale).
        setOptTimeEdits((prev) => {
          const next = new Map(prev);
          next.delete(scheduledId);
          return next;
        });
        setPillState({ kind: "error", action: "remove" });
      }
    },
    [router],
  );

  /**
   * Cambio icona dal IconPicker (StopIconBadge nell'open card). Optimistic:
   * applichiamo subito sull'overlay `optIconEdits` (chiave = activity entity
   * id), poi PATCH /api/activities/[id] e router.refresh. Su errore: rollback.
   * Riusa lo schema entity-level dell'updateEntity esistente.
   */
  const handleIconChange = useCallback(
    async (activityId: string, iconKey: string) => {
      setOptIconEdits((prev) => {
        const next = new Map(prev);
        next.set(activityId, iconKey);
        return next;
      });
      try {
        await api.activities.updateEntity(activityId, { icon: iconKey });
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] updateIcon failed:", err);
        setOptIconEdits((prev) => {
          const next = new Map(prev);
          next.delete(activityId);
          return next;
        });
        setPillState({ kind: "error", action: "remove" });
      }
    },
    [router],
  );

  const handleAddressChange = useCallback(
    async (activityId: string, place: PlaceResult | null) => {
      // Optimistic: apply locally first so the AddressField shows the new
      // pick instantly and every occurrence (scheduled rows + lodging) reflects
      // it. On success the server snapshot replaces the overlay via the
      // useEffect on `days`. On failure we drop the entry and show the pill.
      setOptAddressEdits((prev) => {
        const next = new Map(prev);
        next.set(activityId, place);
        return next;
      });
      try {
        await api.activities.updateEntity(activityId, {
          location: place?.formatted ?? null,
          location_place_id: place?.placeId ?? null,
          location_lat: place?.lat ?? null,
          location_lng: place?.lng ?? null,
        });
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] updateAddress failed:", err);
        setOptAddressEdits((prev) => {
          const next = new Map(prev);
          next.delete(activityId);
          return next;
        });
        setPillState({ kind: "error", action: "remove" });
      }
    },
    [router],
  );

  /**
   * Move up/down nel dettaglio attività. Coda di azioni ottimistiche:
   * la UI mostra subito il nuovo ordine, poi la POST viene replicata
   * lato server (intra-day swap o jump cross-day; ricalcolo bridges
   * dei vicini). Su errore: pop dell'azione + pill di errore.
   */
  const handleMoveActivity = useCallback(
    async (scheduledId: string, direction: "up" | "down") => {
      const actionId = newActionId();
      setOptMoveActions((prev) => [...prev, { id: actionId, scheduledId, direction }]);
      try {
        await api.activities.move(scheduledId, direction);
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] move failed:", err);
        setOptMoveActions((prev) => prev.filter((a) => a.id !== actionId));
        setPillState({ kind: "error", action: "remove" });
      }
    },
    [router],
  );

  /**
   * Drag&drop: l'utente trascina un'attività e la rilascia su un day/index
   * specifici (anche cross-day). Stesso pattern di handleMoveActivity:
   * azione optimistic accodata, POST in background, rollback su errore.
   */
  const handleDragMove = useCallback(
    async (scheduledId: string, targetDayId: string, targetIndex: number) => {
      const actionId = newActionId();
      setOptMoveActions((prev) => [
        ...prev,
        { id: actionId, scheduledId, targetDayId, targetIndex },
      ]);
      try {
        await api.activities.moveTo(scheduledId, targetDayId, targetIndex);
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] drag move failed:", err);
        setOptMoveActions((prev) => prev.filter((a) => a.id !== actionId));
        setPillState({ kind: "error", action: "remove" });
      }
    },
    [router],
  );

  const handleReduceStay = useCallback(
    (stayId: string) => {
      // If reducing from a single-night stay, the lodging row disappears
      // entirely — close the popover. Otherwise leave it where it was.
      const stayDays = effectiveDays.filter(
        (d) => d.accommodation?.stay_id === stayId,
      );
      if (stayDays.length <= 1) setOpenOverride(null);
      return fireStayOp(
        { id: newActionId(), kind: "reduce", stayId },
        () => api.accommodations.reduce(stayId),
        "reduceStay",
      );
    },
    [effectiveDays, fireStayOp],
  );

  // Drag&drop su un pin dell'itinerario. ExploreMap inoltra l'id del marker
  // (= TripStop.id) e la nuova posizione; risaliamo all'activity entity id
  // (Property dietro l'occorrenza scheduled o dietro lo stay), applichiamo
  // l'overlay ottimistico sulle coords e patchiamo l'entità sul server.
  // location/place_id non vengono toccati — l'utente potrà correggerli via
  // AddressField se necessario (o reverse-geocodare in un upgrade futuro).
  const handlePinDragEnd = useCallback(
    async (pinId: string, latlng: LatLng) => {
      // Risoluzione activity entity id dal pin id.
      let activityId: string | null = null;
      if (pinId.startsWith("acc:")) {
        // Accommodation: trova un day la cui accommodation.stay_id (o legacy
        // key) corrisponde, e leggi accommodation.activity_id.
        const stayKey = pinId.slice("acc:".length);
        for (const d of effectiveDays) {
          const acc = d.accommodation;
          if (!acc?.activity_id) continue;
          const k = acc.stay_id ?? `legacy:${d.id}`;
          if (k === stayKey) { activityId = acc.activity_id; break; }
        }
      } else {
        // Activity: pinId = scheduled_activity.id, l'entity id sta su .activity_id.
        for (const d of effectiveDays) {
          const a = d.activities.find((x) => x.id === pinId);
          if (a) { activityId = a.activity_id ?? a.entity_id ?? null; break; }
        }
      }
      if (!activityId) {
        console.warn("[ExploreNextShell] pin drag: activity entity not resolved", pinId);
        return;
      }

      // Optimistic
      setOptCoordEdits((prev) => {
        const next = new Map(prev);
        next.set(activityId!, latlng);
        return next;
      });

      try {
        await api.activities.updateEntity(activityId, {
          location_lat: latlng.lat,
          location_lng: latlng.lng,
        });
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] pin drag persist failed:", err);
        setOptCoordEdits((prev) => {
          const next = new Map(prev);
          next.delete(activityId!);
          return next;
        });
        setPillState({ kind: "error", action: "remove" });
      }
    },
    [effectiveDays, router],
  );

  // Hover su un pin dell'itinerario → evidenzia la row corrispondente in
  // Timeline come "selezionata" (no apertura). Traduce il formato pin
  // (`acc:${stayKey}` per accommodation) nell'id row usato dalla Timeline
  // (`lodging-${dayId}` per il lodging). Activity: pinId = scheduled.id,
  // coincide direttamente con l'id row. Su out (`null`) reset.
  const handleItineraryPinHover = useCallback(
    (pinId: string | null) => {
      if (pinId === null) { setHoveredRowId(null); return; }
      if (pinId.startsWith("acc:")) {
        const stayKey = pinId.slice("acc:".length);
        for (const d of effectiveDays) {
          const acc = d.accommodation;
          if (!acc) continue;
          const k = acc.stay_id ?? `legacy:${d.id}`;
          if (k === stayKey) { setHoveredRowId(`lodging-${d.id}`); return; }
        }
        setHoveredRowId(null);
        return;
      }
      setHoveredRowId(pinId);
    },
    [effectiveDays],
  );

  // ResizeObserver per il pannello sinistro.
  useEffect(() => {
    if (!panelRef.current) return;
    const ro = new ResizeObserver(() =>
      setPanelWidth(panelRef.current?.offsetWidth ?? 376),
    );
    ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative h-full w-full">
      <ExploreMap
        ref={mapRef}
        tripId={tripId}
        center={center}
        zoom={zoom}
        nightRoute={nightRoute}
        extraMarkers={itineraryMarkers}
        extraRoutes={dayPathRoutes}
        viewportInset={{ left: panelWidth }}
        onAddToTripRequest={handleAddToTripRequest}
        onExtraMarkerDragEnd={handlePinDragEnd}
        // Sync row↔pin: lo stato selezionato del pin segue selectedActivityId,
        // un click sul pin apre la row corrispondente (openOverride) E setta
        // il selected (per il bordo bianco del pin).
        selectedItineraryId={selectedActivityId}
        onItineraryPinClick={(id) => {
          setSelectedActivityId(id);
          setOpenOverride(id);
          // Il click apre la row → l'highlight di hover (riga in stato
          // "selected ma non aperta") non serve più; la card aperta
          // prende il sopravvento visivo.
          setHoveredRowId(null);
        }}
        onItineraryPinHover={handleItineraryPinHover}
        // Night-route off: la Timeline a sinistra mostra già l'alloggio
        // giorno-per-giorno, l'overlay diventava solo rumore.
        enableNightRoute={false}
        // All'apertura del trip, inquadra l'intero percorso pianificato
        // (markers + polyline) così l'utente vede tutto in un colpo. Una
        // sola volta — dopo, lo zoom resta dell'utente.
        fitAllOnMount
      />

      {/* Panel sinistro — card arrotondata che contiene la Timeline. */}
      <aside
        ref={panelRef}
        className="absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-float"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TimelineV2
            days={effectiveDays}
            chain={chain}
            computedBridges={computedBridges}
            onSelectDay={handleSelectDay}
            onSelectActivity={setSelectedActivityId}
            onRemoveActivity={handleRemoveActivity}
            onMoveActivity={handleMoveActivity}
            onDragMove={handleDragMove}
            onConvertToSleep={handleConvertToSleep}
            onConvertToStop={handleConvertToStop}
            onExtendStay={handleExtendStay}
            onReduceStay={handleReduceStay}
            onAddressChange={handleAddressChange}
            onIconChange={handleIconChange}
            onUpdateActivityInstance={handleUpdateActivityInstance}
            openOverride={openOverride}
            hoveredRowId={hoveredRowId}
          />
        </div>
      </aside>

      {/* Pill di feedback — unica per add / remove. */}
      {pillState && (
        <AddedPill state={pillState} onDismiss={() => setPillState(null)} />
      )}
    </div>
  );
}
