"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreMap } from "@/features/explore/ExploreMap";
import type { LatLng, MapMarker } from "@/components/ui/Map";
import { Timeline, type TimelineDayData } from "@/features/explore/Timeline";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import type { NightWaypoint } from "@/lib/explore/nightRoute";
import { api } from "@/lib/client";

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
 */
export function ExploreNextShell({ tripId, days, center, zoom, nightRoute }: Props) {
  const router = useRouter();
  // Larghezza misurata del pannello sinistro — default ragionevole (360 panel +
  // left-4 margin = 376) usato finché il ResizeObserver non scrive il valore reale.
  const panelRef = useRef<HTMLElement>(null);
  const [panelWidth, setPanelWidth] = useState(376);

  // Giorno selezionato nella Timeline → guida il filtraggio dei marker
  // itinerario sulla mappa. Il default è il primo giorno cronologico; la
  // Timeline aggiorna la selezione via `onSelectDay` quando l'utente espande
  // un DayBadge (modello "ultimo aperto vince", non single-selection rigido).
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

  // Marker itinerario — spec /design/roadmap-pins.
  //   - dayFocused=false (avvio o reset)            → tutti i pin "default"
  //   - dayFocused=true e attività nel giorno       → "default"
  //   - dayFocused=true e attività in altro giorno  → "dimmed"
  // Lo stato "overflow" è un hook tipato pronto, non ancora cablato (arriverà
  // quando avremo la sorgente per timing/geo). Lo stato "selected" della spec
  // non viene mai applicato qui — la selezione del marker resta sul halo
  // overlay esistente, così il pin selezionato non cambia di forma.
  const itineraryMarkers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    for (const day of sortedDays) {
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
  }, [sortedDays, dayFocused, selectedDayId]);

  // Remove dell'attività dal dettaglio inline della Timeline. Chiamata
  // ottimistica? No: rispettiamo il pattern del resto dell'app — DELETE
  // server-side, poi router.refresh() ri-renderizza la timeline col snapshot
  // aggiornato. Se la DELETE fallisce, lasciamo che l'errore emerga in
  // console e la tappa rimanga visibile — niente toast per ora (brief 06b
  // copre la UX di errore).
  const handleRemoveActivity = useCallback(
    async (scheduledId: string) => {
      try {
        await api.activities.removeFromDay(scheduledId);
        router.refresh();
      } catch (err) {
        console.error("[ExploreNextShell] removeFromDay failed:", err);
      }
    },
    [router],
  );

  // ResizeObserver — il pannello sinistro è `w-[360px] left-4` (≈ 376 px), ma
  // si adatta su breakpoints/density. Misurare a runtime evita di hardcodare
  // un valore che dovrà essere mantenuto in sincrono col CSS.
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
        selectedDayId={selectedDayId}
        selectedActivityId={selectedActivityId}
      />

      {/* Panel sinistro — card arrotondata che contiene la Timeline. Il
          `border-border-strong` è coerente con l'ExploreToolbar (montata da
          ExploreMap) — mantenerlo per non rompere il rapporto visivo. */}
      <aside
        ref={panelRef}
        className="absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-float"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Timeline
            days={days}
            onSelectDay={handleSelectDay}
            onSelectActivity={setSelectedActivityId}
            onRemoveActivity={handleRemoveActivity}
          />
        </div>
      </aside>
    </div>
  );
}
