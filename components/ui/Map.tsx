"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useGoogleMaps } from "@/lib/useGoogleMaps";
import { makeAdHocPin, INK, ORANGE, NEUTRAL } from "./mapPins";

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

/** A simple point marker rendered on the basemap. */
export type MapMarker = {
  lat: number;
  lng: number;
  /** Tooltip shown on hover. */
  title?: string;
  /** Stable identity for lifecycle/dedupe. Defaults to "lat,lng". */
  id?: string;
  /** Inner SVG (from `iconGlyph`) to draw in the pin head instead of the dot. */
  glyph?: string;
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
  /** @deprecated No zoom UI is rendered (greedy gestures handle zoom); accepted for compatibility but ignored. */
  zoomControlPosition?: "RIGHT_BOTTOM" | "RIGHT_TOP" | "LEFT_BOTTOM" | "LEFT_TOP";
  /** Point markers to render. The map fits its bounds when new ones appear. */
  markers?: MapMarker[];
  /** Key of the selected marker — rendered orange, the rest ink. */
  selectedMarkerId?: string | null;
  /** Fired when the user clicks the basemap (empty area). */
  onMapClick?: (latlng: LatLng) => void;
  /** Fired when the user clicks an existing marker (by its key). */
  onMarkerClick?: (id: string) => void;
  /** Fired (on idle) with the visible area's centre + radius in metres. */
  onViewportChange?: (viewport: { center: LatLng; radiusMeters: number }) => void;
};

/** Great-circle distance in metres between two points. */
function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Travel-focused map styles — hides business clutter and minor administrative
 * labels, but keeps attractions, monuments, parks and transit visible so the
 * map is useful for trip planning. Shared with RouteMap so both surfaces look
 * identical. Only applies to raster maps (no vector mapId is configured).
 */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  // Hide commercial clutter — shops, restaurants, hotels, etc.
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  // Keep road network legible but quieter: no shield icons, no local street names.
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  // Drop minor administrative noise (neighborhood labels, country/region icons).
  { featureType: "administrative", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "off" }] },
];

/**
 * A decorative DOM overlay drawn on top of the selected marker: a pulsing
 * "hero" halo (like the Go logo) plus a name-label pill above the pin. Built
 * with OverlayView so it works on the raster map (no vector mapId needed) and
 * can be CSS-animated. pointer-events stay off so the underlying marker keeps
 * receiving clicks.
 */
type SelectedPinOverlay = google.maps.OverlayView & {
  setData: (lat: number, lng: number, label: string) => void;
};

function createSelectedPinOverlay(): SelectedPinOverlay {
  const overlay = new google.maps.OverlayView() as SelectedPinOverlay;
  let pos: google.maps.LatLng | null = null;

  const container = document.createElement("div");
  container.className = "map-selected-pin";
  container.style.cssText =
    "position:absolute;width:44px;height:46px;transform:translate(-50%,-100%);pointer-events:none;z-index:1000;";

  const halo = document.createElement("span");
  halo.className = "go-halo"; // stessa animazione dell'avatar GO (goPulseHalo)
  halo.style.cssText =
    "position:absolute;left:50%;top:24px;width:15px;height:15px;border-radius:9999px;transform:translate(-50%,-50%);pointer-events:none;";

  const label = document.createElement("div");
  label.style.cssText =
    "position:absolute;left:calc(50% + 14px);top:24px;transform:translateY(-50%);white-space:nowrap;" +
    "max-width:200px;overflow:hidden;text-overflow:ellipsis;pointer-events:none;" +
    "background:var(--color-ink,#0d2c3d);box-shadow:0 2px 10px rgba(13,44,61,0.22);" +
    "border-radius:9px 9px 9px 0;padding:3px 10px;font-size:12px;font-weight:500;line-height:1.3;" +
    "color:#fff;";

  container.append(label, halo);

  overlay.onAdd = function () {
    this.getPanes()?.floatPane.appendChild(container);
  };
  overlay.draw = function () {
    if (!pos) return;
    const p = this.getProjection()?.fromLatLngToDivPixel(pos);
    if (!p) return;
    container.style.left = `${p.x}px`;
    container.style.top = `${p.y}px`;
  };
  overlay.onRemove = function () {
    container.remove();
  };
  overlay.setData = (lat, lng, lbl) => {
    pos = new google.maps.LatLng(lat, lng);
    label.textContent = lbl;
    label.style.display = lbl ? "block" : "none";
    // Restart the entrance pop on each (re)selection.
    container.style.animation = "none";
    void container.offsetWidth;
    container.style.animation = "";
    overlay.draw();
  };

  return overlay;
}

export function Map({
  center,
  zoom = 13,
  className,
  style,
  mapTypeId = "roadmap",
  controls = {},
  markers,
  selectedMarkerId,
  onMapClick,
  onMarkerClick,
  onViewportChange,
}: MapProps) {
  const status = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersByKey = useRef<Record<string, google.maps.Marker>>({});
  const selectedOverlayRef = useRef<SelectedPinOverlay | null>(null);
  // Latest handlers — kept in refs so listeners need not be re-bound.
  const onMapClickRef = useRef(onMapClick);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onViewportChangeRef = useRef(onViewportChange);
  onMapClickRef.current = onMapClick;
  onMarkerClickRef.current = onMarkerClick;
  onViewportChangeRef.current = onViewportChange;

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
      // Native zoom control is replaced by our token-styled MapZoomControls.
      zoomControl:        false,
      fullscreenControl:  controls.fullscreenControl  ?? false,
      mapTypeControl:     controls.mapTypeControl     ?? false,
      streetViewControl:  controls.streetViewControl  ?? false,
      scaleControl:       controls.scaleControl       ?? false,
      // Greedy: scroll/drag zoom directly — no "use Ctrl + scroll" overlay.
      gestureHandling: "greedy",
    });

    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onMapClickRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });

    mapRef.current.addListener("idle", () => {
      const cb = onViewportChangeRef.current;
      if (!cb || !mapRef.current) return;
      const b = mapRef.current.getBounds();
      if (!b) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      const center = { lat: (ne.lat() + sw.lat()) / 2, lng: (ne.lng() + sw.lng()) / 2 };
      cb({ center, radiusMeters: metersBetween(center, { lat: ne.lat(), lng: ne.lng() }) });
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

  // Reconcile markers: add new ones, drop those no longer present, and reframe
  // the viewport when fresh markers appear.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;
    const desired = markers ?? [];
    const keyOf = (m: MapMarker) => m.id ?? `${m.lat},${m.lng}`;
    const desiredKeys = new Set(desired.map(keyOf));

    for (const key of Object.keys(markersByKey.current)) {
      if (!desiredKeys.has(key)) {
        markersByKey.current[key].setMap(null);
        delete markersByKey.current[key];
      }
    }

    let added = false;
    for (const m of desired) {
      const key = keyOf(m);
      if (markersByKey.current[key]) continue;
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map,
        title: m.title,
      });
      marker.addListener("click", () => onMarkerClickRef.current?.(key));
      markersByKey.current[key] = marker;
      added = true;
    }

    // (Re)style every marker by selection: selected → blue (on top), rest
    // neutral slate. A category glyph replaces the dot when present.
    for (const m of desired) {
      const key = keyOf(m);
      const marker = markersByKey.current[key];
      if (!marker) continue;
      const isSelected = selectedMarkerId != null && key === selectedMarkerId;
      marker.setIcon(makeAdHocPin(isSelected ? INK : NEUTRAL, isSelected ? ORANGE : "#fff", m.glyph));
      marker.setZIndex(isSelected ? 1000 : 1);
    }

    if (added) {
      if (desired.length === 1) {
        map.setCenter({ lat: desired[0].lat, lng: desired[0].lng });
        map.setZoom(15);
      } else if (desired.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        desired.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
        map.fitBounds(bounds, 64);
      }
    }
  }, [markers, status, selectedMarkerId]);

  // Decorate the selected marker with the hero halo + name label overlay.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;
    const sel = selectedMarkerId
      ? (markers ?? []).find((m) => (m.id ?? `${m.lat},${m.lng}`) === selectedMarkerId)
      : undefined;
    if (!sel) {
      selectedOverlayRef.current?.setMap(null);
      return;
    }
    if (!selectedOverlayRef.current) selectedOverlayRef.current = createSelectedPinOverlay();
    const ov = selectedOverlayRef.current;
    ov.setData(sel.lat, sel.lng, sel.title ?? "");
    if (ov.getMap() !== map) ov.setMap(map);
  }, [markers, status, selectedMarkerId]);

  // Tear down the overlay on unmount.
  useEffect(() => () => { selectedOverlayRef.current?.setMap(null); }, []);

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
