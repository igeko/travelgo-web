"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useGoogleMaps } from "@/lib/useGoogleMaps";

/* ─────────────────────────────────────────────────────────────────
   Map · Google Maps JS SDK wrapper.
   Renders an interactive map centered on `center` at `zoom`.
   No markers in v1 — just the basemap.

   Usage:
     <Map center={{ lat: 35.6762, lng: 139.6503 }} zoom={13} />

   - Fills its container (no hardcoded width/height).
     The consumer is responsible for sizing (className or inline style).
   - Shows a soft placeholder while the SDK loads.
   - Graceful error state when the API key is missing or wrong.
   - Re-centers smoothly when `center` prop changes.
   - Controlled-only: no internal position state.
───────────────────────────────────────────────────────────────── */

export type LatLng = {
  lat: number;
  lng: number;
};

/**
 * Optional map UI controls. All default to false except zoomControl.
 * Pass only what you need — the rest stays hidden.
 */
export type MapControls = {
  /** +/- zoom buttons. Default true. */
  zoomControl?: boolean;
  /** Fullscreen toggle button. Default false. */
  fullscreenControl?: boolean;
  /** Roadmap / Satellite switcher. Default false. */
  mapTypeControl?: boolean;
  /** Street View pegman. Default false. */
  streetViewControl?: boolean;
  /** Scale bar. Default false. */
  scaleControl?: boolean;
};

export type MapProps = {
  /** Map center coordinates */
  center: LatLng;
  /** Zoom level 1–20. Default 13. */
  zoom?: number;
  /** Extra classes on the outer wrapper (use to set width/height) */
  className?: string;
  /** Inline styles on the outer wrapper (e.g. dynamic height) */
  style?: React.CSSProperties;
  /** Map type: roadmap | satellite | hybrid | terrain. Default "roadmap". */
  mapTypeId?: google.maps.MapTypeId | "roadmap" | "satellite" | "hybrid" | "terrain";
  /** UI controls to show on the map. Zoom is on by default. */
  controls?: MapControls;
};

/**
 * Minimal map styles — strips POI/transit/business clutter and most label
 * icons for a clean travel context, keeping geography legible. Shared with
 * RouteMap so both surfaces look identical. Only applies to raster maps
 * (no vector mapId is configured).
 */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "labels.text", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "off" }] },
];

export function Map({
  center,
  zoom = 13,
  className,
  style,
  mapTypeId = "roadmap",
  controls = {},
}: MapProps) {
  const status = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Initialize the map once the SDK is ready and the container is mounted.
  useEffect(() => {
    if (status !== "ready" || !containerRef.current) return;
    if (mapRef.current) return; // already initialized

    mapRef.current = new google.maps.Map(containerRef.current, {
      center,
      zoom,
      mapTypeId,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl:        controls.zoomControl        ?? true,
      fullscreenControl:  controls.fullscreenControl  ?? false,
      mapTypeControl:     controls.mapTypeControl     ?? false,
      streetViewControl:  controls.streetViewControl  ?? false,
      scaleControl:       controls.scaleControl       ?? false,
      gestureHandling: "cooperative",
    });
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  // center/zoom intentionally excluded: handled by the effects below

  // Pan smoothly when center changes after init.
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.panTo(center);
  }, [center.lat, center.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update zoom when it changes.
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setZoom(zoom);
  }, [zoom]);

  // Update map type when it changes.
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(mapTypeId ?? "roadmap");
  }, [mapTypeId]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-surface-soft", className)} style={style}>
      {/* Map container — always in DOM so Google can attach to it */}
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          status === "ready" ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Loading placeholder */}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-border border-t-orange animate-spin" />
            <span className="text-tiny text-ink-faint">Loading map…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-meta font-medium text-ink mb-1">Map unavailable</div>
            <div className="text-tiny text-ink-faint">
              Set{" "}
              <code className="bg-surface-soft px-1 rounded text-micro">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              </code>{" "}
              in .env.local
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
