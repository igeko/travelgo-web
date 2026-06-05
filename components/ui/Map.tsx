"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { cn } from "@/lib/cn";
import { useGoogleMaps } from "@/lib/useGoogleMaps";
import { api } from "@/lib/client";
import {
  makeAdHocPin,
  makeNightPin,
  makePinIcon,
  INK,
  ORANGE,
  NEUTRAL,
  NIGHT,
  type StopRole,
} from "./mapPins";
import { SLOT_COLORS, type SlotKey as RouteSlot } from "@/features/activity/types";
import { decodePolyline } from "./mapRoute";

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
  /**
   * Pin style.
   *  - `"stop"`  → teardrop `makePinIcon` (itinerary day stops). Requires
   *               `stopRole`; optional `slot` colours the body.
   *  - `"night"` → indigo `makeNightPin` (Explore night-route layer).
   *  - default   → dot `makeAdHocPin` (Go suggestions, category results).
   */
  variant?: "stop" | "night";
  /** Role in the day sequence — drives start/mid/end shape (variant "stop"). */
  stopRole?: StopRole;
  /** Time-of-day slot — drives the pin body colour (variant "stop"). */
  slot?: RouteSlot;
  /**
   * If true, the marker is added to a shared `MarkerClusterer` instead of being
   * mounted directly on the map. Styling/icon path stays identical — only the
   * mounting strategy changes. Use for dense layers (category area-search);
   * keep low-cardinality semantic pins (Go suggestions, night route, itinerary
   * stops) regular so they remain individually visible at every zoom.
   */
  clustered?: boolean;
};

/**
 * Optional connecting route drawn through `points` in order (the night-route
 * polyline). The pins themselves are regular `markers` with variant "night", so
 * they keep full click/card/selection behaviour; this layer only adds the line.
 */
export type MapRouteLayer = {
  points: LatLng[];
  /** Google travel mode for the connecting route. Default "DRIVING". */
  travelMode?: string;
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
  /** Fired when the user clicks a Google POI label (placeId + position). */
  onPoiClick?: (placeId: string, latlng: LatLng) => void;
  /** Fired when the user clicks an existing marker (by its key). */
  onMarkerClick?: (id: string) => void;
  /** Fired (on idle) with the visible area's centre + radius in metres. */
  onViewportChange?: (viewport: { center: LatLng; radiusMeters: number }) => void;
  /**
   * Detail card for a pin. Map shows it on hover (with a small dwell) and for
   * the `selectedMarkerId`, anchored above the pin and kept open while hovered.
   * Content is the consumer's job (Map stays presentation-only); `close` hides it.
   * Return null to render no card for a given pin (e.g. a coordinate-only pin).
   */
  renderPinCard?: (id: string, close: () => void) => ReactNode;
  /** Fired when a pin's card is closed via its close affordance. */
  onMarkerClose?: (id: string) => void;
  /** Optional night-route overlay (dedicated pins + connecting polyline). */
  routeLayer?: MapRouteLayer | null;
  /**
   * Pixel offset of the visible viewport relative to the map container — use it
   * when UI panels (e.g. a left timeline) cover part of the map. The
   * `onViewportChange` centre/radius are computed against the *visible* area
   * (the container bounds minus the inset), so category area-searches stay
   * centred on what the user actually sees.
   */
  viewportInset?: { left?: number; right?: number; top?: number; bottom?: number };
};

/**
 * Imperative handle exposed by `Map` — gives wrapper components (e.g.
 * `RouteMap`) access to the underlying SDK instance for operations not covered
 * by props (drawing polylines, custom `fitBounds`, …) without duplicating the
 * init code.
 */
export type MapHandle = {
  /** The SDK map instance, or `null` until the SDK has loaded. */
  getMap: () => google.maps.Map | null;
  /** Fit the map to the given bounds, with optional padding. No-op when not ready. */
  fitBounds: (
    bounds: google.maps.LatLngBounds,
    padding?: number | google.maps.Padding,
  ) => void;
};

/** Hover dwell before a pin's card appears, and grace before it closes. */
const PIN_CARD_DWELL = 200;
const PIN_CARD_GRACE = 180;

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

export const Map = forwardRef<MapHandle, MapProps>(function Map(
  {
    center,
    zoom = 13,
    className,
    style,
    mapTypeId = "roadmap",
    controls = {},
    markers,
    selectedMarkerId,
    onMapClick,
    onPoiClick,
    onMarkerClick,
    onViewportChange,
    renderPinCard,
    onMarkerClose,
    routeLayer,
    viewportInset,
  },
  ref,
) {
  const status = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersByKey = useRef<Record<string, google.maps.Marker>>({});
  // Shared clusterer for markers flagged `clustered: true`. Lazily created on
  // first use and torn down on unmount. Re-synced on every reconcile cycle
  // (clearMarkers + addMarkers): incremental clusterer maintenance is more
  // intricate than the gains for the cardinalities Explore handles today.
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const selectedOverlayRef = useRef<SelectedPinOverlay | null>(null);
  const cardOverlayRef = useRef<google.maps.OverlayView | null>(null);
  // Pin under the cursor (after a dwell). The card shows for `hoverId ?? selectedMarkerId`.
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [cardPixel, setCardPixel] = useState<{ x: number; y: number } | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest handlers — kept in refs so listeners need not be re-bound.
  const onMapClickRef = useRef(onMapClick);
  const onPoiClickRef = useRef(onPoiClick);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onViewportChangeRef = useRef(onViewportChange);
  // viewportInset lives in a ref too — the `idle` listener reads it on every
  // emission and we don't want a panel-width tick to re-bind the listener.
  const viewportInsetRef = useRef(viewportInset);
  onMapClickRef.current = onMapClick;
  onPoiClickRef.current = onPoiClick;
  onMarkerClickRef.current = onMarkerClick;
  onViewportChangeRef.current = onViewportChange;
  viewportInsetRef.current = viewportInset;

  // Imperative escape hatch for wrapper components that need the SDK instance
  // (e.g. drawing polylines from RouteMap). Identity is stable — the handle
  // closes over `mapRef`, which itself is a ref.
  useImperativeHandle(
    ref,
    () => ({
      getMap: () => mapRef.current,
      fitBounds: (bounds, padding) => mapRef.current?.fitBounds(bounds, padding),
    }),
    [],
  );

  // The pin whose card is currently shown (hover preview wins over selection).
  const activeCardId = hoverId ?? selectedMarkerId ?? null;
  const activeAnchor = activeCardId
    ? (markers ?? []).find((m) => (m.id ?? `${m.lat},${m.lng}`) === activeCardId) ?? null
    : null;
  const activeAnchorRef = useRef(activeAnchor);
  activeAnchorRef.current = activeAnchor;

  // Hover lifecycle for a pin: dwell before showing, grace before hiding so the
  // cursor can travel from the pin onto the card without it closing.
  const hoverPin = useCallback((id: string) => {
    if (graceTimer.current) { clearTimeout(graceTimer.current); graceTimer.current = null; }
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = setTimeout(() => setHoverId(id), PIN_CARD_DWELL);
  }, []);
  const unhoverPin = useCallback(() => {
    if (dwellTimer.current) { clearTimeout(dwellTimer.current); dwellTimer.current = null; }
    if (graceTimer.current) clearTimeout(graceTimer.current);
    graceTimer.current = setTimeout(() => setHoverId(null), PIN_CARD_GRACE);
  }, []);
  useEffect(() => () => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    if (graceTimer.current) clearTimeout(graceTimer.current);
  }, []);

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

    mapRef.current.addListener("click", (e: google.maps.IconMouseEvent) => {
      if (!e.latLng) return;
      const latlng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      // Click on a Google POI (Tokyo Budokan, …): select that place, don't drop
      // an ad-hoc pin, and suppress Google's default info window.
      if (e.placeId) {
        e.stop();
        onPoiClickRef.current?.(e.placeId, latlng);
        return;
      }
      onMapClickRef.current?.(latlng);
    });

    mapRef.current.addListener("idle", () => {
      const cb = onViewportChangeRef.current;
      if (!cb || !mapRef.current) return;
      const b = mapRef.current.getBounds();
      if (!b) return;

      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      const inset = viewportInsetRef.current ?? {};

      // No inset → keep the legacy fast-path (centre = bounds centre, radius =
      // corner distance). Otherwise compute the visible rectangle by removing
      // the panel-covered pixels from each side.
      const hasInset =
        (inset.left ?? 0) > 0 ||
        (inset.right ?? 0) > 0 ||
        (inset.top ?? 0) > 0 ||
        (inset.bottom ?? 0) > 0;

      if (!hasInset) {
        const center = {
          lat: (ne.lat() + sw.lat()) / 2,
          lng: (ne.lng() + sw.lng()) / 2,
        };
        cb({
          center,
          radiusMeters: metersBetween(center, { lat: ne.lat(), lng: ne.lng() }),
        });
        return;
      }

      const mapDiv = mapRef.current.getDiv();
      const mapW = mapDiv.offsetWidth || 1;
      const mapH = mapDiv.offsetHeight || 1;
      const lngPerPx = (ne.lng() - sw.lng()) / mapW;
      const latPerPx = (ne.lat() - sw.lat()) / mapH;

      // Visible-area bounds (container bounds minus the inset rectangles).
      const visWest  = sw.lng() + lngPerPx * (inset.left   ?? 0);
      const visEast  = ne.lng() - lngPerPx * (inset.right  ?? 0);
      const visSouth = sw.lat() + latPerPx * (inset.bottom ?? 0);
      const visNorth = ne.lat() - latPerPx * (inset.top    ?? 0);

      const center = {
        lat: (visSouth + visNorth) / 2,
        lng: (visWest + visEast) / 2,
      };
      cb({
        center,
        radiusMeters: metersBetween(center, { lat: visNorth, lng: visEast }),
      });
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
      // Clustered markers are mounted by `MarkerClusterer` (see below) — passing
      // `map` here would double-mount them. Regular markers attach directly.
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: m.clustered ? null : map,
        title: m.title,
      });
      marker.addListener("click", () => onMarkerClickRef.current?.(key));
      marker.addListener("mouseover", () => hoverPin(key));
      marker.addListener("mouseout", () => unhoverPin());
      markersByKey.current[key] = marker;
      added = true;
    }

    // Bucket existing marker instances into regular vs clustered for this
    // cycle. `clustered` toggling on an existing marker is uncommon but
    // supported: the marker is in the right bucket here, and the clusterer is
    // re-synced wholesale below so the membership always matches `desired`.
    const clusteredMarkers: google.maps.Marker[] = [];
    for (const m of desired) {
      const marker = markersByKey.current[keyOf(m)];
      if (!marker) continue;
      if (m.clustered) clusteredMarkers.push(marker);
    }

    // (Re)style every marker by selection: selected → blue (on top), rest
    // neutral slate. A category glyph replaces the dot when present.
    for (const m of desired) {
      const key = keyOf(m);
      const marker = markersByKey.current[key];
      if (!marker) continue;
      const isSelected = selectedMarkerId != null && key === selectedMarkerId;
      if (m.variant === "stop") {
        // Itinerary stop: teardrop pin coloured by slot (defaults to ink) and
        // shaped by role (start/mid/end → flag for end). Selection just
        // promotes it to the top of the stack — colour stays semantic.
        const color = m.slot ? SLOT_COLORS[m.slot] : INK;
        marker.setIcon(makePinIcon(m.stopRole ?? "mid", m.glyph ?? "", color));
        marker.setZIndex(isSelected ? 1000 : 5);
      } else if (m.variant === "night") {
        // Night pins keep their indigo identity regardless of selection; the
        // halo overlay still marks the selected one.
        marker.setIcon(makeNightPin(m.glyph ?? ""));
        marker.setZIndex(isSelected ? 1000 : 500);
      } else {
        marker.setIcon(makeAdHocPin(isSelected ? INK : NEUTRAL, isSelected ? ORANGE : "#fff", m.glyph));
        marker.setZIndex(isSelected ? 1000 : 1);
      }
    }

    // Sync the clusterer with this cycle's clustered marker set. We rebuild it
    // wholesale every reconcile — fine for the cardinalities Explore handles,
    // and immune to drift between marker keys and clusterer membership.
    if (clusteredMarkers.length > 0) {
      clustererRef.current ??= new MarkerClusterer({ map });
      clustererRef.current.clearMarkers();
      clustererRef.current.addMarkers(clusteredMarkers);
    } else {
      clustererRef.current?.clearMarkers();
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
  }, [markers, status, selectedMarkerId, hoverPin, unhoverPin]);

  // Night-route polyline: connects the night pins (regular markers with variant
  // "night") in order. Clears + redraws when the layer changes, and tears itself
  // down when the layer is removed (toggle off). The pins live in `markers`.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;

    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;

    const points = routeLayer?.points ?? [];
    if (points.length < 2) return;

    let cancelled = false;
    api.routes
      .compute(points, routeLayer?.travelMode ?? "DRIVING")
      .then((data) => {
        if (cancelled || !data.polyline) return;
        const path = decodePolyline(data.polyline);
        routePolylineRef.current = new google.maps.Polyline({
          path,
          map,
          strokeColor: NIGHT,
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });
        const bounds = new google.maps.LatLngBounds();
        points.forEach((p) => bounds.extend(p));
        path.forEach((ll) => bounds.extend(ll));
        map.fitBounds(bounds, 80);
      })
      .catch(() => { /* routing failed — keep the pins, skip the line */ });

    return () => { cancelled = true; };
  }, [routeLayer, status]);

  // Tear down the night-route polyline on unmount.
  useEffect(() => () => {
    routePolylineRef.current?.setMap(null);
  }, []);

  // Tear down the shared MarkerClusterer on unmount. Clustered marker
  // instances live in `markersByKey` and are dropped by the standard reconcile
  // path; the clusterer just needs its internal references released.
  useEffect(() => () => {
    clustererRef.current?.clearMarkers();
    clustererRef.current = null;
  }, []);

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
    // Hide the name pill when the richer card is shown for this same pin.
    const cardShown = !!renderPinCard && activeCardId === selectedMarkerId;
    ov.setData(sel.lat, sel.lng, cardShown ? "" : (sel.title ?? ""));
    if (ov.getMap() !== map) ov.setMap(map);
  }, [markers, status, selectedMarkerId, activeCardId, renderPinCard]);

  // Project the active pin's coords to a container pixel on every map move, so
  // the card renders as a plain React element in this wrapper (OUTSIDE the map
  // DOM — clicks on it never reach the map). OverlayView is for projection only.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const ov = new google.maps.OverlayView();
    const div = document.createElement("div"); // required container; stays empty
    div.style.display = "none";
    ov.onAdd = function () { this.getPanes()?.overlayLayer.appendChild(div); };
    ov.draw = function () {
      const a = activeAnchorRef.current;
      if (!a) { setCardPixel(null); return; }
      const p = this.getProjection()?.fromLatLngToContainerPixel(new google.maps.LatLng(a.lat, a.lng));
      setCardPixel(p ? { x: p.x, y: p.y } : null);
    };
    ov.onRemove = function () { div.remove(); };
    ov.setMap(mapRef.current);
    cardOverlayRef.current = ov;
    return () => { ov.setMap(null); cardOverlayRef.current = null; };
  }, [status]);

  // Recompute the pixel when the active pin (its coords) changes.
  useEffect(() => { cardOverlayRef.current?.draw(); }, [activeAnchor?.lat, activeAnchor?.lng]);

  // Tear down the overlay on unmount.
  useEffect(() => () => { selectedOverlayRef.current?.setMap(null); }, []);

  const pinCard = activeCardId && renderPinCard
    ? renderPinCard(activeCardId, () => {
        setHoverId(null);
        onMarkerClose?.(activeCardId);
      })
    : null;

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-surface-soft", className)} style={style}>
      {/* Pin detail card — plain React node above the active pin (hover/select),
          kept open while hovered. Outside the map DOM so its clicks never hit the map. */}
      {pinCard && cardPixel && (
        <div
          className="absolute"
          style={{ left: cardPixel.x, top: cardPixel.y, transform: "translate(-50%, calc(-100% - 48px))", zIndex: 1000 }}
          onMouseEnter={() => activeCardId && hoverPin(activeCardId)}
          onMouseLeave={unhoverPin}
        >
          {pinCard}
        </div>
      )}

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
});
