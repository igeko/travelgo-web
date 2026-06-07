"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreMap, type AddToTripRequest } from "@/features/explore/ExploreMap";
import type { LatLng, MapMarker } from "@/components/ui/Map";
import { Timeline, type TimelineDayData } from "@/features/explore/Timeline";
import { AddedPill, type AddedPillState } from "@/features/explore/AddedPill";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import type { NightWaypoint } from "@/lib/explore/nightRoute";
import { api } from "@/lib/client";
import type { Activity } from "@/lib/dal/domain";

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
    for (const day of visibleDays) {
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
    }
    return out;
  }, [visibleDays, dayFocused, selectedDayId]);

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
        viewportInset={{ left: panelWidth }}
        onAddToTripRequest={handleAddToTripRequest}
        // Night-route off: la Timeline a sinistra mostra già l'alloggio
        // giorno-per-giorno, l'overlay diventava solo rumore.
        enableNightRoute={false}
      />

      {/* Panel sinistro — card arrotondata che contiene la Timeline. */}
      <aside
        ref={panelRef}
        className="absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-float"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Timeline
            days={visibleDays}
            onSelectDay={handleSelectDay}
            onSelectActivity={setSelectedActivityId}
            onRemoveActivity={handleRemoveActivity}
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
