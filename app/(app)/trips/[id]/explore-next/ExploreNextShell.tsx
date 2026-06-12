"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreMap, type AddToTripRequest } from "@/features/explore/ExploreMap";
import type { LatLng, MapHandle, MapMarker, RouteSpec } from "@/components/ui/Map";
import { TimelineV2, type TimelineDayData } from "@/features/explore/TimelineV2";
import { TimelineV2Mobile } from "@/features/explore/TimelineV2Mobile";
import { MobileSheet } from "@/features/explore/MobileSheet";
import { AddedPill, type AddedPillState } from "@/features/explore/AddedPill";
import { buildTripChain, chainToMarkers, chainToRouteSpecs } from "@/features/explore/tripChain";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import { useChainBridges } from "@/features/explore/useChainBridges";
import type { NightWaypoint } from "@/lib/explore/nightRoute";
import { api } from "@/lib/client";
import type { Activity, BlockType, BridgeData } from "@/lib/dal/domain";
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
 * Apply optimistic activity title edits onto a TimelineDayData[] projection.
 * Keyed by entity id; sovrascrive `activity.title` su ogni occorrenza
 * scheduled e `accommodation.name` quando la Property è la stessa entity.
 */
function applyTitleEdits(
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
      return { ...act, title: edits.get(entityId)! };
    });
    const acc = day.accommodation;
    if (acc?.activity_id && edits.has(acc.activity_id)) {
      return {
        ...day,
        activities: mutated ? activities : day.activities,
        accommodation: { ...acc, name: edits.get(acc.activity_id)! },
      };
    }
    return mutated ? { ...day, activities } : day;
  });
}

/**
 * Apply optimistic activity short_desc edits. Mirrors applyTitleEdits ma
 * sui campi description: `activity.short_desc` per gli stop e
 * `accommodation.short_desc` per il lodging (Property entity condivisa).
 */
function applyShortDescEdits(
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
      return { ...act, short_desc: edits.get(entityId)! };
    });
    const acc = day.accommodation;
    if (acc?.activity_id && edits.has(acc.activity_id)) {
      return {
        ...day,
        activities: mutated ? activities : day.activities,
        accommodation: { ...acc, short_desc: edits.get(acc.activity_id)! },
      };
    }
    return mutated ? { ...day, activities } : day;
  });
}

/**
 * Apply optimistic day notes edits. Keyed by day id; sovrascrive `day.notes`.
 */
function applyDayNotesEdits(
  days: TimelineDayData[],
  edits: Map<string, string>,
): TimelineDayData[] {
  if (edits.size === 0) return days;
  return days.map((day) => (edits.has(day.id) ? { ...day, notes: edits.get(day.id)! } : day));
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
  // Altezza del bottom sheet mobile: contribuisce al `viewportInset.bottom`
  // della mappa (così la ricerca per categoria si centra sull'area
  // effettivamente visibile, esattamente come per il pannello sinistro
  // desktop). Notificata da MobileSheet via onHeightChange — include
  // l'altezza live durante il drag.
  const [mobileSheetHeight, setMobileSheetHeight] = useState(0);
  // Quando la viewport sale a ≥ lg il MobileSheet è `display: none` ma
  // continua a calcolare la sua altezza target (non sa di essere nascosto).
  // Usiamo un media query JS per azzerare il contributo bottom della mappa
  // su desktop. SSR-safe: starts undefined → treated as mobile finché il
  // primo effect non corregge.
  const [isMobileSheetActive, setIsMobileSheetActive] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobileSheetActive(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  const effectiveSheetHeight = isMobileSheetActive ? mobileSheetHeight : 0;

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
  // Transfer aperto nella timeline → evidenziato in arancione brand sulla
  // mappa. L'id è quello sintetico emesso da TimelineV2 (`-br` / `-in` /
  // `-sample`); la decodifica in (from, to) chain stop avviene sotto.
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  // Transfer in preview: dwell di ~150ms di hover sulla riga del Transfer,
  // senza apertura della card. Vince sul selected quando attivo (mouse
  // dentro), torna a selected appena il cursore esce.
  const [hoveredTransferId, setHoveredTransferId] = useState<string | null>(null);
  // Row Timeline evidenziata come "selezionata ma non aperta" durante
  // l'hover sul pin corrispondente. Per activity è lo scheduled.id; per
  // accommodation traduciamo `acc:${stayKey}` in `lodging-${dayId}` (la
  // Timeline non sa nulla del formato pin → mantiene il proprio id).
  // Convivenza con l'open: la Timeline ignora l'hover sulla row già aperta.
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  // Hover su una row della Timeline → traduciamo l'id row in pin id e
  // lo passiamo alla Map (sync row → pin, opposto di handleItineraryPinHover).
  const [hoveredPinFromList, setHoveredPinFromList] = useState<string | null>(null);

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
  // Optimistic title edits keyed by activity entity id. Propaga a ogni
  // occorrenza scheduled e all'accommodation che usa la stessa Property.
  const [optTitleEdits, setOptTitleEdits] = useState<Map<string, string>>(
    () => new Map(),
  );
  // Optimistic short_desc edits keyed by activity entity id. Stessa
  // propagazione di optTitleEdits — l'entity è condivisa fra stop e lodging.
  const [optShortDescEdits, setOptShortDescEdits] = useState<Map<string, string>>(
    () => new Map(),
  );
  // Optimistic day notes edits keyed by day id. days.notes è dato del giorno,
  // non dell'entity: niente propagazione cross-day.
  const [optDayNotesEdits, setOptDayNotesEdits] = useState<Map<string, string>>(
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
    if (optTitleEdits.size > 0) setOptTitleEdits(new Map());
    if (optShortDescEdits.size > 0) setOptShortDescEdits(new Map());
    if (optDayNotesEdits.size > 0) setOptDayNotesEdits(new Map());
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
    if (optTitleEdits.size > 0) out = applyTitleEdits(out, optTitleEdits);
    if (optShortDescEdits.size > 0) out = applyShortDescEdits(out, optShortDescEdits);
    if (optDayNotesEdits.size > 0) out = applyDayNotesEdits(out, optDayNotesEdits);
    return out;
  }, [visibleDays, optStayActions, optAddressEdits, optCoordEdits, optMoveActions, optTimeEdits, optIconEdits, optTitleEdits, optShortDescEdits, optDayNotesEdits]);

  // Chain canonico del trip — ordinato, dedup multi-night, sa già dove
  // mettere l'accommodation (ultimo nodo del giorno di check-in, mai
  // ripetuto sui notti successive). Da qui derivano marker e route in
  // due trasformazioni triviali; la mappa NON conosce più la logica
  // accommodation/stays/use_previous. Vedi `features/explore/tripChain.ts`.
  const chain = useMemo(() => buildTripChain(effectiveDays), [effectiveDays]);

  // Activity ids con bridge_out_json già salvato. Passati a useChainBridges
  // per impedire la persistenza opportunistica del computed (DRIVING default)
  // sopra una scelta esplicita dell'utente — es. quando applica "A piedi" nel
  // RouteVerifier, il transport "walk" persiste e non viene riscritto a "car".
  const savedOutActIds = useMemo<Set<string>>(() => {
    const ids = new Set<string>();
    for (const d of effectiveDays) {
      for (const a of d.activities) {
        if (a.bridge_out_json) ids.add(a.id);
      }
    }
    return ids;
  }, [effectiveDays]);

  // Bridge calcolati LAZY: solo per i leg che entrano nel giorno
  // attualmente in focus (`curr.dayId === focusedDayId`). La cache di
  // sessione del hook (chain-aware, coords-tagged) garantisce che
  // riaprire un giorno già visitato sia gratis. Niente focus = niente
  // fetch — la mappa disegna comunque le polyline dei giorni non
  // focused indipendentemente (vedi `dayPathRoutes`). Per i leg che
  // già hanno un bridge salvato saltiamo la persistenza opportunistica,
  // così la scelta dell'utente non viene clobbered (vedi savedOutActIds).
  const computedBridges = useChainBridges(chain, {
    focusedDayId: dayFocused ? selectedDayId : null,
    skipPersistFor: savedOutActIds,
  });

  // Effective bridges per leg, keyed by `${prevId}|${currId}`. Stessa
  // priorità di TimelineV2.buildItems: saved (bridge_out_json sulla
  // activity di partenza) vince per i campi editabili (transport, line,
  // stops, note, duration_min); computed (useChainBridges) backfilla
  // distance_m e fa da fallback se il salvato manca. Le accommodation
  // hanno solo computed (lo schema non persiste bridge sulle stays).
  const effectiveBridges = useMemo<Map<string, BridgeData>>(() => {
    const out = new Map<string, BridgeData>();
    const savedOutByActId = new Map<string, BridgeData>();
    const savedInByActId = new Map<string, BridgeData>();
    for (const d of effectiveDays) {
      for (const a of d.activities) {
        if (a.bridge_out_json) savedOutByActId.set(a.id, a.bridge_out_json);
        if (a.bridge_in_json) savedInByActId.set(a.id, a.bridge_in_json);
      }
    }
    for (let i = 1; i < chain.length; i++) {
      const prev = chain[i - 1];
      const curr = chain[i];
      const key = `${prev.id}|${curr.id}`;
      // Priorità: bridge_out_json del prev (saved sull'activity di partenza)
      // → bridge_in_json del curr (saved sull'activity ricevente) → computed.
      // Il leg cross-day da accommodation → first activity NON ha out (stays
      // non persistono bridge_out_json), quindi il transport scelto
      // dall'utente vive solo nel bridge_in_json della prima activity. Senza
      // questo fallback la mappa rendeva walk come car (default Google
      // Routes DRIVING).
      const savedOutRaw = savedOutByActId.get(prev.id);
      const savedInRaw = savedInByActId.get(curr.id);
      // Un saved è "valido" per questo leg solo se il suo target_id matcha
      // l'other endpoint, oppure se è legacy (target_id assente → best-effort).
      // Un saved stantio (es. fuzzy inserita in mezzo) viene scartato così
      // la mappa NON applica il transport sbagliato a un leg che non
      // descrive più. Vedi `isBridgeValid` in TimelineV2.tsx.
      const savedOut = savedOutRaw && (savedOutRaw.target_id == null || savedOutRaw.target_id === curr.id)
        ? savedOutRaw
        : undefined;
      const savedIn = savedInRaw && (savedInRaw.target_id == null || savedInRaw.target_id === prev.id)
        ? savedInRaw
        : undefined;
      const saved = savedOut ?? savedIn;
      const c = computedBridges.get(key);
      const merged = saved && c
        ? { ...saved, distance_m: saved.distance_m ?? c.distance_m ?? null }
        : saved ?? c ?? null;
      if (merged) out.set(key, merged);
    }
    return out;
  }, [chain, effectiveDays, computedBridges]);

  // Lookup transport-per-leg per il rendering mappa: walk → puntinato,
  // bus → tratteggiato, car/taxi → solido spesso (vedi legStyle in Map.tsx).
  const getLegTransport = useCallback(
    (fromId: string, toId: string) =>
      effectiveBridges.get(`${fromId}|${toId}`)?.transport ?? null,
    [effectiveBridges],
  );

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

  // Fuzzy markers — derivati a parte (i fuzzy non sono nel chain, vedi
  // buildTripChain). Visibili SOLO quando un giorno è in focus e solo
  // per quel giorno (spec /design/timeline-readability it.17): sono
  // indicatori "soft" del giorno selezionato, non parte del percorso.
  // L'id usato = scheduled_activities.id, coincide con hoveredRowId in
  // TimelineV2 → hover-sync row↔pin gratis con il meccanismo esistente.
  const fuzzyMarkers = useMemo<MapMarker[]>(() => {
    if (!dayFocused || !selectedDayId) return [];
    const day = effectiveDays.find((d) => d.id === selectedDayId);
    if (!day) return [];
    const out: MapMarker[] = [];
    for (const a of day.activities) {
      if (a.fuzzy !== true) continue;
      if (a.location_lat == null || a.location_lng == null) continue;
      out.push({
        id: a.id,
        lat: a.location_lat,
        lng: a.location_lng,
        title: a.title,
        placeId: a.location_place_id ?? null,
        glyph: resolveGlyph({
          iconKey: a.icon ?? null,
          type: (a.type ?? null) as BlockType | null,
        }),
        variant: "fuzzy",
        draggable: true,
      });
    }
    return out;
  }, [dayFocused, selectedDayId, effectiveDays]);

  const allItineraryMarkers = useMemo<MapMarker[]>(
    () => (fuzzyMarkers.length > 0 ? [...itineraryMarkers, ...fuzzyMarkers] : itineraryMarkers),
    [itineraryMarkers, fuzzyMarkers],
  );

  // Percorso reale lungo il chain — RouteSpec per giorno, leg "di
  // pertinenza" della tappa di destinazione (per il dimming). Geometria
  // via Google Routes (`api.routes.compute`, cache localStorage 30gg).
  // Travel mode DRIVING di default; quando un leg ha un transport noto
  // dal bridge effettivo (walk/bus/car/…), `perLegTransport` fa scattare
  // il rendering per-leg con `legStyle` dedicato (walk → puntinato).
  const dayPathRoutes = useMemo<RouteSpec[]>(
    () => chainToRouteSpecs(chain, opacityOf, getLegTransport, dayFocused ? selectedDayId : null),
    [chain, opacityOf, getLegTransport, dayFocused, selectedDayId],
  );

  /**
   * Overlay arancione brand per il transfer selezionato nella timeline.
   *
   * Decodifica `selectedTransferId` (id sintetico di TimelineV2) in una
   * coppia (from, to) di chain stop:
   *   - `${aId}-in`  → to = chain.find(aId);   from = chain[idx-1]
   *   - `${aId}-br`  → from = chain.find(aId); to   = chain[idx+1]
   *   - `${aId}-sample` → null (mock dev-only, niente geometria reale)
   *
   * Il segmento viene aggiunto come `RouteSpec` separato a valle del
   * `dayPathRoutes` così, per ordine di insert sulla mappa, l'arancione
   * vince visivamente sopra la linea base (stesso `zIndex: 2` di default,
   * later insert wins).
   */
  const selectedTransferRoute = useMemo<RouteSpec | null>(() => {
    // Hover (preview) vince sul selected (click commit) finché il mouse è
    // dentro la riga. Quando l'hover finisce, l'highlight torna sul
    // selected o sparisce se nessuno dei due è attivo.
    const transferId = hoveredTransferId ?? selectedTransferId;
    if (!transferId) return null;
    const decode = (id: string): { from: typeof chain[number]; to: typeof chain[number] } | null => {
      if (id.endsWith("-in")) {
        const toId = id.slice(0, -3);
        const idx = chain.findIndex((s) => s.id === toId);
        return idx > 0 ? { from: chain[idx - 1], to: chain[idx] } : null;
      }
      if (id.endsWith("-br")) {
        const fromId = id.slice(0, -3);
        const idx = chain.findIndex((s) => s.id === fromId);
        return idx >= 0 && idx < chain.length - 1
          ? { from: chain[idx], to: chain[idx + 1] }
          : null;
      }
      // Outgoing fine giornata: `${lastActivityId}-out-lodging` →
      // from = quell'activity nel chain, to = chain[idx+1] (l'accommodation
      // appesa subito dopo in buildTripChain).
      if (id.endsWith("-out-lodging")) {
        const fromId = id.slice(0, -"-out-lodging".length);
        const idx = chain.findIndex((s) => s.id === fromId);
        return idx >= 0 && idx < chain.length - 1
          ? { from: chain[idx], to: chain[idx + 1] }
          : null;
      }
      return null;
    };
    const seg = decode(transferId);
    if (!seg) return null;
    // Transport del leg: se "walk", l'overlay viene disegnato puntinato
    // via legStyle (no casing); la travelMode WALKING garantisce che la
    // geometria fetched da Google segua il path pedonale, non quello auto.
    const transport = getLegTransport(seg.from.id, seg.to.id);
    return {
      id: `transfer-hl:${seg.from.id}->${seg.to.id}`,
      points: [
        { lat: seg.from.lat, lng: seg.from.lng, placeId: seg.from.placeId },
        { lat: seg.to.lat, lng: seg.to.lng, placeId: seg.to.placeId },
      ],
      travelMode: "DRIVING",
      ...(transport ? { perLegTransport: [transport] } : {}),
      style: {
        color: "#f47b3a", // --color-primary (brand orange) — vedi globals.css
        weight: 4,        // più spesso del 2.5px base così "pop" sulle solide
        opacity: 1,
        // Bumpiamo sopra la linea base (default 2) per vincere la race
        // visiva sui pattern dotted (walk/bike) e dashed (bus), dove i
        // dots/dashes dell'overlay e della base cadono agli stessi
        // offset e l'ordine dei polyline da solo non basta.
        zIndex: 3,
      },
    };
  }, [hoveredTransferId, selectedTransferId, chain, getLegTransport]);

  // Pacchetto routes per la mappa: day-path + (opzionale) overlay del
  // transfer selezionato. L'ordine è significativo: il transfer viene
  // dopo così l'arancione si dipinge sopra la linea base nello stesso
  // tier di zIndex.
  const mapRoutes = useMemo<RouteSpec[]>(
    () =>
      selectedTransferRoute ? [...dayPathRoutes, selectedTransferRoute] : dayPathRoutes,
    [dayPathRoutes, selectedTransferRoute],
  );

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

  /**
   * Editing inline del titolo activity/accommodation. Stesso pattern di
   * handleIconChange: optimistic Map per entity id, PATCH entity, rollback
   * + pill on error. Title nullo non è valido — la lasciamo passare al
   * server che applicherà la propria validazione (typicamente: ignora o
   * 400). UI: il SoftField mostra subito il valore committato.
   */
  const handleTitleChange = useCallback(
    async (activityId: string, title: string) => {
      setOptTitleEdits((prev) => {
        const next = new Map(prev);
        next.set(activityId, title);
        return next;
      });
      try {
        await api.activities.updateEntity(activityId, { title });
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] updateTitle failed:", err);
        setOptTitleEdits((prev) => {
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
   * Editing inline della descrizione (activities.short_desc). Stringa vuota
   * salvata come null per coerenza con il resto del modello.
   */
  const handleShortDescChange = useCallback(
    async (activityId: string, shortDesc: string) => {
      const value = shortDesc.length > 0 ? shortDesc : "";
      setOptShortDescEdits((prev) => {
        const next = new Map(prev);
        next.set(activityId, value);
        return next;
      });
      try {
        await api.activities.updateEntity(activityId, {
          short_desc: shortDesc.length > 0 ? shortDesc : null,
        });
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] updateShortDesc failed:", err);
        setOptShortDescEdits((prev) => {
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
   * Editing inline delle note del giorno (days.notes). Stringa vuota →
   * null (clear esplicito). Stesso pattern di handleTitleChange ma keyed
   * by day id.
   */
  const handleDayNotesChange = useCallback(
    async (dayId: string, notes: string) => {
      setOptDayNotesEdits((prev) => {
        const next = new Map(prev);
        next.set(dayId, notes);
        return next;
      });
      try {
        await api.days.update(dayId, { notes: notes.length > 0 ? notes : null });
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] updateDayNotes failed:", err);
        setOptDayNotesEdits((prev) => {
          const next = new Map(prev);
          next.delete(dayId);
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
  // Mapping inverso row → pin: per accommodation `lodging-${dayId}` →
  // pin `acc:${stayKey}`; per activity/fuzzy l'id row coincide col pin id.
  const handleRowHover = useCallback(
    (rowId: string | null) => {
      if (rowId === null) { setHoveredPinFromList(null); return; }
      if (rowId.startsWith("lodging-")) {
        const dayId = rowId.slice("lodging-".length);
        const d = effectiveDays.find((x) => x.id === dayId);
        const acc = d?.accommodation;
        if (!acc) { setHoveredPinFromList(null); return; }
        const stayKey = acc.stay_id ?? `legacy:${dayId}`;
        setHoveredPinFromList(`acc:${stayKey}`);
        return;
      }
      setHoveredPinFromList(rowId);
    },
    [effectiveDays],
  );

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


  return (
    <div className="relative h-full w-full lg:flex lg:gap-2 lg:p-2">
      {/* Panel sinistro — su desktop sta nel flex row accanto alla mappa
          (niente più overlay/shadow). Mobile resta hidden. */}
      <aside
        className="hidden w-[380px] flex-col overflow-hidden rounded-lg border border-border bg-surface lg:flex"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TimelineV2
            days={effectiveDays}
            chain={chain}
            computedBridges={computedBridges}
            onSelectDay={handleSelectDay}
            onSelectActivity={setSelectedActivityId}
            onSelectTransfer={setSelectedTransferId}
            onHoverTransfer={setHoveredTransferId}
            onHoverRow={handleRowHover}
            onRemoveActivity={handleRemoveActivity}
            onMoveActivity={handleMoveActivity}
            onDragMove={handleDragMove}
            onConvertToSleep={handleConvertToSleep}
            onConvertToStop={handleConvertToStop}
            onExtendStay={handleExtendStay}
            onReduceStay={handleReduceStay}
            onAddressChange={handleAddressChange}
            onIconChange={handleIconChange}
            onTitleChange={handleTitleChange}
            onShortDescChange={handleShortDescChange}
            onDayNotesChange={handleDayNotesChange}
            onUpdateActivityInstance={handleUpdateActivityInstance}
            openOverride={openOverride}
            hoveredRowId={hoveredRowId}
          />
        </div>
      </aside>

      {/* Map container — full-bleed su mobile (assoluto dentro il relative
          outer), card flex-1 con angoli arrotondati su desktop. La
          ExploreToolbar resta dentro ExploreMap e si posiziona absolute
          relativamente al suo container interno (rounded-clip safe). */}
      <div className="absolute inset-0 lg:relative lg:inset-auto lg:flex-1 lg:rounded-lg lg:border lg:border-border lg:overflow-hidden">
        <ExploreMap
          ref={mapRef}
          tripId={tripId}
          center={center}
          zoom={zoom}
          nightRoute={nightRoute}
          extraMarkers={allItineraryMarkers}
          hoveredPinId={hoveredPinFromList}
          extraRoutes={mapRoutes}
          viewportInset={{ bottom: effectiveSheetHeight }}
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
      </div>

      {/* Bottom sheet mobile (< lg) — drag-to-snap a 3 stati: peek/half/full.
          Il MobileSheet ha grip handle, snap, animazione e notifica
          l'altezza al parent (per viewportInset.bottom della mappa). */}
      <MobileSheet
        defaultState="half"
        onHeightChange={setMobileSheetHeight}
        className="lg:hidden"
      >
        <TimelineV2Mobile
          days={effectiveDays}
          chain={chain}
          computedBridges={computedBridges}
          onSelectDay={handleSelectDay}
          onSelectActivity={setSelectedActivityId}
          onSelectTransfer={setSelectedTransferId}
          onRemoveActivity={handleRemoveActivity}
          onMoveActivity={handleMoveActivity}
          onDragMove={handleDragMove}
          onConvertToSleep={handleConvertToSleep}
          onConvertToStop={handleConvertToStop}
          onExtendStay={handleExtendStay}
          onReduceStay={handleReduceStay}
          onAddressChange={handleAddressChange}
          onIconChange={handleIconChange}
          onTitleChange={handleTitleChange}
          onShortDescChange={handleShortDescChange}
          onDayNotesChange={handleDayNotesChange}
          onUpdateActivityInstance={handleUpdateActivityInstance}
          openOverride={openOverride}
          hoveredRowId={hoveredRowId}
        />
      </MobileSheet>

      {/* Pill di feedback — unica per add / remove. */}
      {pillState && (
        <AddedPill state={pillState} onDismiss={() => setPillState(null)} />
      )}
    </div>
  );
}
