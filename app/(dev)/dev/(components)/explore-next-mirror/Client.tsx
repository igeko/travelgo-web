"use client";

/**
 * Mirror client di Explore Next per debug visivo:
 * Timeline V2 a sinistra + ExploreMap a destra, stessa pipeline chain.
 *
 * Niente mutazioni: i callback di add/move/remove/icon-change non sono
 * cablati. Solo selezione giorno/activity per esercitare il dimming
 * dei path e l'apertura delle row, così possiamo verificare che il
 * path di un giorno selezionato termini sull'accommodation come
 * previsto da buildTripChain.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { LatLng } from "@/components/ui/Map";
import { ExploreMap, type AddToTripRequest } from "@/features/explore/ExploreMap";
import type { MapHandle, TransportMode } from "@/components/ui/Map";
import type { NightWaypoint } from "@/lib/explore/nightRoute";
import { TimelineV2, type TimelineV2DayData } from "@/features/explore/TimelineV2";
import {
  buildTripChain,
  chainToMarkers,
  chainToRouteSpecs,
  type TripStop,
} from "@/features/explore/tripChain";
import { useChainBridges } from "@/features/explore/useChainBridges";

const PATH_OPACITY_DEFAULT = 0.8;
const PATH_OPACITY_DIMMED = 0.18;

export function ExploreNextMirrorClient({
  tripId,
  days,
  center,
  zoom,
  nightRoute,
}: {
  tripId: string;
  days: TimelineV2DayData[];
  center: LatLng;
  zoom: number;
  nightRoute: NightWaypoint[];
}) {
  const mapRef = useRef<MapHandle>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const chain = useMemo(() => buildTripChain(days), [days]);
  const computedBridges = useChainBridges(chain);

  const dayFocused = selectedDayId != null;
  const opacityOf = useCallback(
    (dayId: string) =>
      !dayFocused || dayId === selectedDayId ? PATH_OPACITY_DEFAULT : PATH_OPACITY_DIMMED,
    [dayFocused, selectedDayId],
  );

  // Risolutore del transport per leg (mirror del comportamento reale):
  // chain leg → bridge corrispondente → bridge.transport. Quando il bridge
  // non è ancora computato, ritorna null e il path resta uniforme.
  const getLegTransport = useCallback(
    (fromId: string, toId: string): TransportMode | null => {
      const b = computedBridges.get(`${fromId}|${toId}`);
      return (b?.transport as TransportMode | null) ?? null;
    },
    [computedBridges],
  );

  const stateOf = useCallback(
    (stop: TripStop): "default" | "dimmed" =>
      !dayFocused || stop.dayId === selectedDayId ? "default" : "dimmed",
    [dayFocused, selectedDayId],
  );

  const markers = useMemo(() => chainToMarkers(chain, stateOf), [chain, stateOf]);
  const routes = useMemo(
    () => chainToRouteSpecs(chain, opacityOf, getLegTransport),
    [chain, opacityOf, getLegTransport],
  );

  // Niente add-to-trip in mirror, ma teniamo la callback in modo da
  // tipare correttamente le PlaceHoverCard interne.
  const handleAddToTrip = useCallback((_req: AddToTripRequest) => {
    /* no-op */
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Map sotto, full-bleed */}
      <ExploreMap
        ref={mapRef}
        tripId={tripId}
        center={center}
        zoom={zoom}
        nightRoute={nightRoute}
        enableNightRoute={false}
        extraMarkers={markers}
        extraRoutes={routes}
        fitAllOnMount
        selectedItineraryId={selectedActivityId}
        onItineraryPinClick={(id) => setSelectedActivityId(id)}
        onAddToTripRequest={handleAddToTrip}
        viewportInset={{ left: 380 }}
      />

      {/* Pannello sinistro con Timeline */}
      <aside className="absolute left-4 top-4 z-overlay flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-float">
        <div className="border-b border-border bg-surface-soft px-3 py-2 text-tiny text-ink-soft">
          Read-only · selezione giorno/activity esercita dimming path
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TimelineV2
            days={days}
            chain={chain}
            computedBridges={computedBridges}
            onSelectDay={setSelectedDayId}
            onSelectActivity={setSelectedActivityId}
          />
        </div>
      </aside>
    </div>
  );
}
