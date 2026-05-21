"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useGoogleMaps } from "@/lib/useGoogleMaps";
import { api } from "@/lib/client";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import {
  IconMapPin, IconSoup, IconTree, IconKey, IconTrain,
} from "@/components/ui/icons";
import type { BlockType, BridgeData } from "@/lib/dal/domain";
import type { PlaceResult } from "./AddressField";
import { MAP_STYLES, type MapControls } from "./Map";

/* ─────────────────────────────────────────────────────────────────
   RouteMap · Google Maps with numbered orange markers and a
   route polyline fetched from /api/routes (Google Routes API).

   Usage:
     <RouteMap
       points={[placeA, placeB, placeC]}
       travelMode="WALKING"
       className="w-full h-[320px]"
     />

   - Accepts an array of PlaceResult (lat/lng/name already resolved).
   - Fits the map bounds to all points automatically.
   - Fetches the route from the server-side route handler (key stays safe).
   - If routing fails, falls back to markers only — no polyline.
   - Orange numbered markers consistent with ActivityRow pin style.
───────────────────────────────────────────────────────────────── */

export type TravelMode = "WALKING" | "DRIVING" | "BICYCLING" | "TRANSIT";

export type TransportMode = BridgeData["transport"];

/**
 * A stop on the map. Extends PlaceResult (pure geometry) with optional
 * semantics so the marker can show a type icon and the route can be
 * styled per leg. Callers passing plain PlaceResult[] keep the old
 * behaviour (numbered orange pins, single polyline).
 */
export type RouteStop = PlaceResult & {
  /** Stop icon key (STOP_ICONS) — usually activity.icon */
  iconKey?: string | null;
  /** Activity type — fallback icon when iconKey is absent */
  type?: BlockType | null;
  /** Transport used to LEAVE this stop toward the next one */
  transportOut?: TransportMode | null;
};

export type RouteMapProps = {
  /** Ordered list of places to visit */
  points: RouteStop[];
  /** Routing mode — default WALKING. Used when stops carry no per-leg transport. */
  travelMode?: TravelMode;
  /** Map type: roadmap | satellite | hybrid | terrain. Default "roadmap". */
  mapTypeId?: "roadmap" | "satellite" | "hybrid" | "terrain";
  /** Extra classes on the wrapper (use for width/height) */
  className?: string;
  /** Inline styles on the wrapper (e.g. dynamic height) */
  style?: React.CSSProperties;
  /** UI controls to show on the map. Zoom is on by default. */
  controls?: MapControls;
};

/**
 * Imperative handle — lets a parent drive the map via a ref.
 *   const ref = useRef<RouteMapHandle>(null);
 *   ref.current?.focusPoint(2);   // zoom/centre on the 3rd stop
 *   ref.current?.fitAll();        // back to the overview framing
 */
export type RouteMapHandle = {
  /** Pan + zoom onto the stop at `index` (default zoom 16). No-op if out of range. */
  focusPoint: (index: number, zoom?: number) => void;
  /** Re-frame all stops + route geometry (the default overview). */
  fitAll: () => void;
};

/* ─────────────────────────────────────────────────────────────────
   Encoded polyline decoder (Google's algorithm)
   Converts the encoded string from Routes API into LatLng pairs.
───────────────────────────────────────────────────────────────── */
function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/* ─────────────────────────────────────────────────────────────────
   Marker glyphs — reuse the same Tabler icons as Timeline / ActivityRow.
   Tabler components render to <svg viewBox="0 0 24 24">…</svg>; we strip
   the wrapper and re-embed the inner paths (which inherit stroke from a
   wrapping <g>) so the marker is the icon itself — no circle, no number —
   with a white halo for legibility on the map. Memoised per cache key.
───────────────────────────────────────────────────────────────── */
const INK = "#0d2c3d"; // brand blue — markers + route line

const TYPE_CMP: Record<string, React.ComponentType<{ size?: number; stroke?: number }>> = {
  place:  IconMapPin,
  meal:   IconSoup,
  pause:  IconTree,
  action: IconKey,
  move:   IconTrain,
};

const glyphCache = new Map<string, string>();

type GlyphCmp = React.ComponentType<{ size?: number; stroke?: number }>;
type SvgChild = { type?: unknown; props?: Record<string, unknown> };

/** camelCase React prop → kebab-case SVG attribute (strokeWidth → stroke-width). */
function attrName(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Serialize one SVG child element (path/circle/line/…) to a self-closing tag. */
function serializeChild(child: SvgChild): string {
  if (!child || typeof child.type !== "string") return "";
  const props = child.props ?? {};
  const attrs = Object.entries(props)
    .filter(([k, v]) => k !== "children" && k !== "className" && v != null && typeof v !== "object" && typeof v !== "function")
    .map(([k, v]) => `${attrName(k)}="${String(v)}"`)
    .join(" ");
  return `<${child.type}${attrs ? ` ${attrs}` : ""} />`;
}

/**
 * Inner geometry of a Tabler icon (uncoloured — stroke inherited from the
 * marker's wrapping <g>). We invoke the component to get its React element
 * tree and serialize the child shapes by hand, so neither react-dom/server
 * nor the client reconciler is pulled in. Cached per icon.
 */
function glyphInner(cacheKey: string, Cmp: GlyphCmp): string {
  const cached = glyphCache.get(cacheKey);
  if (cached !== undefined) return cached;
  // Tabler icons are forwardRef components (`.render`); fall back to calling
  // a plain function component if that ever changes.
  const ref = (Cmp as { render?: (p: object, r: null) => unknown }).render;
  const element = typeof ref === "function"
    ? ref({ size: 24, stroke: 2 }, null)
    : (Cmp as (p: object) => unknown)({ size: 24, stroke: 2 });
  const kids = (element as SvgChild | null)?.props?.children;
  const list: SvgChild[] = Array.isArray(kids) ? kids.filter(Boolean) : kids ? [kids as SvgChild] : [];
  const inner = list.map(serializeChild).join("");
  glyphCache.set(cacheKey, inner);
  return inner;
}

/** Resolve a stop to its icon paths, falling back to a generic map pin. */
function resolveGlyph(stop: RouteStop): string {
  if (stop.iconKey) {
    const Cmp = getStopIcon(stop.iconKey);
    if (Cmp) return glyphInner(`stop:${stop.iconKey}`, Cmp);
  }
  if (stop.type && TYPE_CMP[stop.type]) {
    return glyphInner(`type:${stop.type}`, TYPE_CMP[stop.type]);
  }
  return glyphInner("type:place", IconMapPin);
}

type StopRole = "start" | "mid" | "end";

/** Origin flag inner paths (inline; not in the icon barrel). */
const FLAG_INNER = `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 5v16"/><path d="M5 5c3 -1.5 6 -1.5 9 0s6 1.5 9 0v9c-3 1.5 -6 1.5 -9 0s-6 -1.5 -9 0"/>`;

/**
 * Build an icon-only marker (32×32): blue (ink) glyph over a white halo
 * for contrast. No circle, no number. The last stop uses a flag.
 * Layers (back→front): white halo, ink glyph.
 */
function makePinIcon(role: StopRole, glyph: string): google.maps.Icon {
  const inner = role === "end" ? FLAG_INNER : glyph;
  const transform = `transform="translate(4 4) scale(0.96)"`;
  const layer = (color: string, width: number) =>
    `<g ${transform} fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${layer("#fff", 6)}${layer(INK, 2.2)}</svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 16),
  };
}

/* ─────────────────────────────────────────────────────────────────
   Transport → routing mode + polyline style.
   Pins stay orange; legs are distinguished by stroke pattern/weight.
───────────────────────────────────────────────────────────────── */
function transportToTravelMode(t: TransportMode): TravelMode {
  switch (t) {
    case "walk":  return "WALKING";
    case "bike":  return "BICYCLING";
    case "car":
    case "taxi":  return "DRIVING";
    case "metro":
    case "bus":
    case "train": return "TRANSIT";
    default:      return "WALKING";
  }
}

/** PolylineOptions (minus path/map) for a transport mode. */
function legStyle(t: TransportMode | null | undefined): google.maps.PolylineOptions {
  const dot = (repeat: string): google.maps.PolylineOptions => ({
    strokeColor: INK,
    strokeOpacity: 0,
    icons: [{
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2.2, fillColor: INK, fillOpacity: 0.9, strokeOpacity: 0 },
      offset: "0",
      repeat,
    }],
  });
  switch (t) {
    case "walk":
    case "bike":
      return dot("9px");                                                  // dotted
    case "bus":
      return { strokeColor: INK, strokeOpacity: 0,                        // dashed
        icons: [{ icon: { path: "M 0,-1 0,1", strokeColor: INK, strokeOpacity: 1, strokeWeight: 3, scale: 3 }, offset: "0", repeat: "14px" }],
      };
    case "car":
    case "taxi":
      return { strokeColor: INK, strokeOpacity: 0.95, strokeWeight: 4 };   // solid thick
    case "metro":
    case "train":
    default:
      return { strokeColor: INK, strokeOpacity: 0.9, strokeWeight: 3 };    // solid
  }
}

export const RouteMap = forwardRef<RouteMapHandle, RouteMapProps>(function RouteMap({
  points,
  travelMode = "WALKING",
  mapTypeId = "roadmap",
  className,
  style,
  controls = {},
}, ref) {
  const status = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  // A focus request queued until the map (SDK) is ready. Survives the async
  // route fetch so its late re-frame doesn't snap the camera back.
  const pendingFocusRef = useRef<{ index: number; zoom: number } | null>(null);
  const prevPointsRef = useRef(points);
  const [routeError, setRouteError] = useState(false);

  // ── Camera controls (stable across renders) ─────────────────────
  const frameAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    polylinesRef.current.forEach((pl) =>
      pl.getPath().forEach((ll) => bounds.extend(ll)),
    );
    // Padding leaves room for the 32px markers; extra on top for the halo.
    map.fitBounds(bounds, { top: 56, right: 44, bottom: 44, left: 44 });
    google.maps.event.addListenerOnce(map, "idle", () => {
      const z = map.getZoom();
      if (z != null && z > 16) map.setZoom(16);
    });
  }, [points]);

  // Apply a queued focus if both the map and target stop are available.
  // Returns whether it ran, so auto-framing can defer to an explicit focus.
  const applyFocus = useCallback(() => {
    const map = mapRef.current;
    const req = pendingFocusRef.current;
    const p = req ? points[req.index] : undefined;
    if (!map || !req || !p) return false;
    map.panTo({ lat: p.lat, lng: p.lng });
    map.setZoom(req.zoom);
    return true;
  }, [points]);

  // Internal framing after markers/route render: a queued focus wins.
  const autoFit = useCallback(() => {
    if (!applyFocus()) frameAll();
  }, [applyFocus, frameAll]);

  const focusPoint = useCallback((index: number, zoom = 16) => {
    // Queue first; if the SDK is still loading, the markers effect re-applies
    // it once the map mounts (instead of silently dropping the request).
    pendingFocusRef.current = { index, zoom };
    applyFocus();
  }, [applyFocus]);

  const fitAll = useCallback(() => {
    pendingFocusRef.current = null; // explicit overview clears focus intent
    frameAll();
  }, [frameAll]);

  useImperativeHandle(ref, () => ({ focusPoint, fitAll }), [focusPoint, fitAll]);

  // ── Initialize map ──────────────────────────────────────────────
  useEffect(() => {
    if (status !== "ready" || !containerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 35.6762, lng: 139.6503 },
      zoom: 13,
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
  }, [status]);

  // ── Update map type when prop changes ──────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(mapTypeId);
  }, [mapTypeId]);

  // ── Redraw markers + fetch route whenever points/travelMode change
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;

    // Drop a stale focus intent when the stop set changes (e.g. day switch),
    // so we don't snap onto the wrong activity. A focus queued for the current
    // stops (reference unchanged) survives until the SDK is ready.
    if (prevPointsRef.current !== points) {
      pendingFocusRef.current = null;
      prevPointsRef.current = points;
    }

    // This run owns the latest async work; later runs flip it to abort.
    let cancelled = false;

    // Clear previous markers + polylines
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    setRouteError(false);

    if (points.length === 0) return;

    // Place markers — icon by type, role for start/end
    points.forEach((point, i) => {
      const role: StopRole =
        i === 0 ? "start" : i === points.length - 1 ? "end" : "mid";
      const marker = new google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map,
        icon: makePinIcon(role, resolveGlyph(point)),
        title: point.name || point.formatted,
        zIndex: 10 + i,
      });
      markersRef.current.push(marker);
    });

    autoFit();

    if (points.length < 2) return;

    const drawPolyline = (encoded: string, style: google.maps.PolylineOptions) => {
      if (cancelled) return;
      polylinesRef.current.push(
        new google.maps.Polyline({ path: decodePolyline(encoded), map, ...style }),
      );
    };

    // Per-leg geometry is only needed when adjacent legs use *different*
    // transports (each leg styled separately). When every leg shares one
    // transport — or none carry transport at all — a single computeRoutes
    // call covers the whole route, saving N−1 Google calls. The exception
    // is multi-leg TRANSIT: Google's Routes API rejects intermediates in
    // TRANSIT mode, so that case must stay per-leg (two points each).
    const legTransports = points.slice(0, -1).map((p) => p.transportOut ?? null);
    const uniform = new Set(legTransports).size <= 1;
    const sharedTransport = uniform ? legTransports[0] ?? null : null;
    const sharedMode = sharedTransport ? transportToTravelMode(sharedTransport) : travelMode;
    const singleCall = uniform && !(sharedMode === "TRANSIT" && points.length > 2);

    if (singleCall) {
      const style = sharedTransport
        ? legStyle(sharedTransport)
        : { strokeColor: INK, strokeWeight: 3, strokeOpacity: 0.85 };
      api.routes
        .compute(points.map((p) => ({ lat: p.lat, lng: p.lng })), sharedMode)
        .then((data) => {
          if (cancelled) return;
          if (!data.polyline) { setRouteError(true); return; }
          drawPolyline(data.polyline, style);
          autoFit();
        })
        .catch(() => { if (!cancelled) setRouteError(true); });
    } else {
      Promise.all(
        points.slice(0, -1).map((from, i) => {
          const to = points[i + 1];
          const transport = from.transportOut ?? null;
          const mode = transport ? transportToTravelMode(transport) : travelMode;
          return api.routes
            .compute([{ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }], mode)
            .then((data) => (data.polyline ? { encoded: data.polyline, transport } : null))
            .catch(() => null);
        }),
      ).then((legs) => {
        if (cancelled) return;
        const ok = legs.filter((l): l is { encoded: string; transport: TransportMode | null } => l != null);
        // Only flag an error when nothing drew — a partial route still reads.
        if (ok.length === 0) { setRouteError(true); return; }
        ok.forEach((l) => drawPolyline(l.encoded, legStyle(l.transport)));
        autoFit();
      });
    }

    return () => { cancelled = true; };
  }, [status, points, travelMode, autoFit]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      polylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, []);

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg bg-surface-soft", className)}
      style={style}
    >
      {/* Map container */}
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          status === "ready" ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Loading */}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-border border-t-orange animate-spin" />
            <span className="text-tiny text-ink-faint">Loading map…</span>
          </div>
        </div>
      )}

      {/* SDK error */}
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

      {/* Route error badge — non-blocking, markers still visible */}
      {routeError && status === "ready" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-sm border border-border rounded-pill px-3 py-1.5 text-tiny text-ink-soft">
          Route unavailable — showing stops only
        </div>
      )}
    </div>
  );
});
