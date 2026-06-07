"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreMap, type AddToTripRequest } from "@/features/explore/ExploreMap";
import type { LatLng, MapMarker, RouteSpec } from "@/components/ui/Map";
import { Timeline, type TimelineDayData } from "@/features/explore/Timeline";
import { AddedPill, type AddedPillState } from "@/features/explore/AddedPill";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import { iconGlyph, INK } from "@/components/ui/mapPins";
import { IconBed } from "@/components/ui/icons";
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
  const [dayFocused, setDayFocused] = useState(false);
  const handleSelectDay = useCallback((id: string) => {
    setSelectedDayId(id);
    setDayFocused(true);
  }, []);
  // Driven by Timeline's "open activity" (a stop expanded inline by click).
  // Fed to the Add-to-Trip algorithm via ExploreMap so the CTA on a place
  // card knows where (after which stop) the new place should land. Null
  // when no row is open — the algorithm falls back to selectedDayId, then
  // to "end of last populated day".
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

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
  const [lastDaysRef, setLastDaysRef] = useState(days);
  if (days !== lastDaysRef) {
    setLastDaysRef(days);
    if (optStayActions.length > 0) setOptStayActions([]);
    if (openOverride !== undefined) setOpenOverride(undefined);
    if (optAddressEdits.size > 0) setOptAddressEdits(new Map());
  }

  const effectiveDays = useMemo<TimelineDayData[]>(() => {
    const afterStays = optStayActions.length === 0
      ? visibleDays
      : applyOptStayActions(visibleDays, optStayActions);
    if (optAddressEdits.size === 0) return afterStays;
    return applyAddressEdits(afterStays, optAddressEdits);
  }, [visibleDays, optStayActions, optAddressEdits]);

  // Marker itinerario — spec /design/roadmap-pins.
  //   - dayFocused=false (avvio o reset)            → tutti i pin "default"
  //   - dayFocused=true e attività nel giorno       → "default"
  //   - dayFocused=true e attività in altro giorno  → "dimmed"
  // Lo stato "overflow" è un hook tipato pronto, non ancora cablato (arriverà
  // quando avremo la sorgente per timing/geo). Lo stato "selected" della spec
  // non viene mai applicato qui — la selezione del marker resta sul halo
  // overlay esistente, così il pin selezionato non cambia di forma.
  //
  // Sorgente: `visibleDays` (non `sortedDays`) — così le adds/removes
  // ottimistiche si riflettono anche sui pin a mappa, non solo sulla Timeline.
  const itineraryMarkers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    for (const day of effectiveDays) {
      const isFocusDay = dayFocused && day.id === selectedDayId;
      const state = !dayFocused || isFocusDay ? "default" : "dimmed";
      for (const stop of day.activities) {
        if (stop.location_lat == null || stop.location_lng == null) continue;
        out.push({
          id: stop.id,
          lat: stop.location_lat,
          lng: stop.location_lng,
          title: stop.title,
          glyph: resolveGlyph({ iconKey: stop.icon, type: stop.type ?? null }),
          variant: "roadmap" as const,
          roadmapState: state,
        });
      }
      // Accommodation pin — quando un'attività viene convertita in "sleep"
      // (Stop→Sleep), migra da `day.activities` a `day.accommodation`. Senza
      // questa branch il pin scomparirebbe completamente dalla mappa. Glyph
      // bed, stesso state di dimming del giorno. Su multi-night la stessa
      // accommodation appare con id distinto per ogni giorno: i marker
      // overlappano ma il reconcile gestisce le entry separate senza drift.
      const acc = day.accommodation;
      if (acc?.lat != null && acc?.lng != null) {
        out.push({
          id: `acc-${day.id}`,
          lat: acc.lat,
          lng: acc.lng,
          title: acc.name,
          glyph: iconGlyph("acc:bed", IconBed),
          variant: "roadmap" as const,
          roadmapState: state,
        });
      }
    }
    return out;
  }, [effectiveDays, dayFocused, selectedDayId]);

  // Percorso reale tra tappe consecutive — una RouteSpec per giorno, che
  // collega in ordine TUTTE le tappe del giorno con coordinate. Geometria
  // calcolata da Google Routes via `api.routes.compute` (con cache
  // localStorage 30gg implicita): la prima volta su un giorno scatena
  // 1 call (single-call uniforme), poi è cache hit finché i punti non
  // cambiano.
  //
  // Travel mode: DRIVING. Niente `perLegTransport` — il transport
  // salvato in `bridge_out_json` resta usato per duration/UI nel
  // Timeline, ma sulla mappa preferiamo una linea continua uniforme
  // (legStyle("walk") sarebbe dotted, "bus" dashed, ecc. — visivamente
  // rumoroso. Si decide di non encodare la modalità via stile qui).
  //
  // Quando `dayFocused`, il giorno in focus mantiene piena opacità, gli
  // altri vanno in dimmed, coerente con i roadmap-pin.
  const dayPathRoutes = useMemo<RouteSpec[]>(() => {
    const out: RouteSpec[] = [];
    for (const day of effectiveDays) {
      const stops = [...day.activities]
        .sort((a, b) => a.position - b.position)
        .filter((s): s is typeof s & { location_lat: number; location_lng: number } =>
          s.location_lat != null && s.location_lng != null,
        );

      const points: LatLng[] = stops.map((s) => ({ lat: s.location_lat, lng: s.location_lng }));
      // Append accommodation come ultimo nodo del giorno (check-in serale,
      // coerente col brief 06). Così il path racconta "wake up → places → bed".
      // Dedup banale: se l'ultima activity coincide con le coords
      // dell'accommodation (es. la sleep nasce DA un'activity convertita) la
      // saltiamo, altrimenti vedremmo un segmento di lunghezza zero.
      const acc = day.accommodation;
      if (acc?.lat != null && acc?.lng != null) {
        const last = points[points.length - 1];
        if (!last || last.lat !== acc.lat || last.lng !== acc.lng) {
          points.push({ lat: acc.lat, lng: acc.lng });
        }
      }
      if (points.length < 2) continue;

      const isFocusDay = dayFocused && day.id === selectedDayId;
      const opacity = !dayFocused || isFocusDay ? PATH_OPACITY_DEFAULT : PATH_OPACITY_DIMMED;

      out.push({
        id: `day-${day.id}`,
        points,
        travelMode: "DRIVING",
        style: { color: INK, weight: 3, opacity },
      });
    }
    return out;
  }, [effectiveDays, dayFocused, selectedDayId]);

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
          },
          selectedDayId,
          selectedActivityId,
        })
        .then((res) => {
          setPendingAdds((prev) => [...prev, res.scheduledActivity]);
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
        tripId={tripId}
        center={center}
        zoom={zoom}
        nightRoute={nightRoute}
        extraMarkers={itineraryMarkers}
        extraRoutes={dayPathRoutes}
        viewportInset={{ left: panelWidth }}
        onAddToTripRequest={handleAddToTripRequest}
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
          <Timeline
            days={effectiveDays}
            onSelectDay={handleSelectDay}
            onSelectActivity={setSelectedActivityId}
            onRemoveActivity={handleRemoveActivity}
            onConvertToSleep={handleConvertToSleep}
            onConvertToStop={handleConvertToStop}
            onExtendStay={handleExtendStay}
            onReduceStay={handleReduceStay}
            onAddressChange={handleAddressChange}
            openOverride={openOverride}
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
