"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExploreMap } from "@/features/explore/ExploreMap";
import type { LatLng, MapMarker } from "@/components/ui/Map";
import { Timeline, type TimelineDayData } from "@/features/explore/Timeline";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import type { NightWaypoint } from "@/lib/explore/nightRoute";
import type { StopRole } from "@/components/ui/mapPins";

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
 * I marker dell'itinerario sono derivati dalle attività del giorno selezionato
 * nella Timeline — pin teardrop ("stop" variant) coloriti per slot.
 */
export function ExploreNextShell({ tripId, days, center, zoom, nightRoute }: Props) {
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
  const selectedDay = sortedDays.find((d) => d.id === selectedDayId) ?? null;
  const selectedDayStops = useMemo(() => {
    if (!selectedDay) return [];
    return [...selectedDay.activities]
      .sort((a, b) => a.position - b.position)
      .filter((a): a is typeof a & { location_lat: number; location_lng: number } =>
        a.location_lat != null && a.location_lng != null,
      );
  }, [selectedDay]);

  // Marker itinerario → pin teardrop coloriti per slot, con ruolo
  // start/mid/end. Gli stop senza coordinate sono già stati filtrati sopra.
  const itineraryMarkers = useMemo<MapMarker[]>(
    () =>
      selectedDayStops.map((stop, i, arr) => {
        const role: StopRole =
          i === 0 ? "start" : i === arr.length - 1 ? "end" : "mid";
        return {
          id: stop.id,
          lat: stop.location_lat,
          lng: stop.location_lng,
          title: stop.title,
          glyph: resolveGlyph({ iconKey: stop.icon, type: stop.type ?? null }),
          variant: "stop" as const,
          stopRole: role,
          slot: stop.slot ?? undefined,
        };
      }),
    [selectedDayStops],
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
      />

      {/* Panel sinistro — card arrotondata che contiene la Timeline. Il
          `border-border-strong` è coerente con l'ExploreToolbar (montata da
          ExploreMap) — mantenerlo per non rompere il rapporto visivo. */}
      <aside
        ref={panelRef}
        className="absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-float"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Timeline days={days} onSelectDay={setSelectedDayId} />
        </div>
      </aside>
    </div>
  );
}
