"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useGoogleMaps } from "@/lib/useGoogleMaps";
import { api } from "@/lib/client";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import type { BlockType, BridgeData } from "@/lib/dal/domain";
import { SLOT_COLORS, type SlotKey } from "@/features/activity/types";
import type { PlaceResult } from "./AddressField";
import { Map, type MapControls, type MapHandle, type MapMarker } from "./Map";
import { INK, makeAdHocPin, type StopRole } from "./mapPins";
import { decodePolyline } from "./mapRoute";

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
   - Stop markers and lifecycle are delegated to `<Map />`; this wrapper
     only manages polylines, framing, and the ad-hoc focus pin via the
     `MapHandle.getMap()` imperative escape hatch.
───────────────────────────────────────────────────────────────── */

export type TravelMode = "WALKING" | "DRIVING" | "BICYCLING" | "TRANSIT";

export type TransportMode = BridgeData["transport"];

/** Time-of-day slot a stop belongs to. Re-exported from the activity domain so
 *  the map and the activity list share one slot palette. */
export type RouteSlot = SlotKey;

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
  /** Time-of-day slot — colours the marker and incoming leg when set */
  slot?: RouteSlot | null;
};

export type RouteMapProps = {
  /** Ordered list of places to visit */
  points: RouteStop[];
  /** Routing mode — default WALKING. Used when stops carry no per-leg transport. */
  travelMode?: TravelMode;
  /**
   * Per-leg colour matrix: index `i` colours the leg from `points[i]` to
   * `points[i+1]` (so length is `points.length - 1`). A null/undefined entry
   * falls back to the brand ink. Providing any colour forces per-leg drawing
   * so each segment can be styled independently.
   */
  legColors?: Array<string | null | undefined>;
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
  /**
   * Drop a temporary ad-hoc orange pin at arbitrary coordinates (a place that
   * isn't one of the route stops) and pan + zoom onto it. The pin persists
   * until `fitAll()` or a stop-set change clears it.
   */
  focusCoord: (lat: number, lng: number, opts?: { label?: string; zoom?: number }) => void;
  /** Re-frame all stops + route geometry (the default overview). */
  fitAll: () => void;
};

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

/**
 * PolylineOptions (minus path/map) for a transport mode. The pattern
 * (dotted/dashed/solid/thick) encodes the mode; `color` overrides the
 * default brand ink so callers can colour each leg independently.
 */
function legStyle(t: TransportMode | null | undefined, color: string = INK): google.maps.PolylineOptions {
  const dot = (repeat: string): google.maps.PolylineOptions => ({
    strokeColor: color,
    strokeOpacity: 0,
    icons: [{
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2.2, fillColor: color, fillOpacity: 0.9, strokeOpacity: 0 },
      offset: "0",
      repeat,
    }],
  });
  switch (t) {
    case "walk":
    case "bike":
      return dot("9px");                                                  // dotted
    case "bus":
      return { strokeColor: color, strokeOpacity: 0,                      // dashed
        icons: [{ icon: { path: "M 0,-1 0,1", strokeColor: color, strokeOpacity: 1, strokeWeight: 3, scale: 3 }, offset: "0", repeat: "14px" }],
      };
    case "car":
    case "taxi":
      return { strokeColor: color, strokeOpacity: 0.95, strokeWeight: 4 }; // solid thick
    case "metro":
    case "train":
    default:
      return { strokeColor: color, strokeOpacity: 0.9, strokeWeight: 3 };  // solid
  }
}

/** Stable initial centre for the inner <Map /> — superseded by fitBounds as
 *  soon as markers/polylines are placed. Tokyo is the historic default. */
const INITIAL_CENTER = { lat: 35.6762, lng: 139.6503 };

/** Stable per-point id used both for the inner <Map /> marker key and for
 *  `focusPoint`/`fitAll` so stale focus intents drop when points change. */
function stopKey(p: RouteStop, i: number): string {
  return `${i}:${p.placeId ?? `${p.lat},${p.lng}`}`;
}

export const RouteMap = forwardRef<RouteMapHandle, RouteMapProps>(function RouteMap({
  points,
  travelMode = "WALKING",
  legColors,
  mapTypeId = "roadmap",
  className,
  style,
  controls = {},
}, ref) {
  const status = useGoogleMaps();
  const mapHandle = useRef<MapHandle>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  // A focus request queued until the map (SDK) is ready. Survives the async
  // route fetch so its late re-frame doesn't snap the camera back.
  const pendingFocusRef = useRef<{ index: number; zoom: number } | null>(null);
  // Ad-hoc pin (a place outside the route) + its queued coord focus, applied
  // once the SDK is ready.
  const adHocMarkerRef = useRef<google.maps.Marker | null>(null);
  const pendingCoordRef = useRef<{ lat: number; lng: number; label?: string; zoom: number } | null>(null);
  const prevPointsRef = useRef(points);
  const [routeError, setRouteError] = useState(false);

  // Stop markers in the `<Map />` shape — variant "stop" + role + slot colour.
  // Memoised on `points` so identity changes (and re-fires the polyline effect)
  // only when the stop set actually changes.
  const stopMarkers = useMemo<MapMarker[]>(
    () =>
      points.map((p, i) => {
        const role: StopRole =
          i === 0 ? "start" : i === points.length - 1 ? "end" : "mid";
        return {
          id: stopKey(p, i),
          lat: p.lat,
          lng: p.lng,
          title: p.name || p.formatted,
          variant: "stop",
          stopRole: role,
          slot: p.slot ?? undefined,
          glyph: resolveGlyph(p),
        };
      }),
    [points],
  );

  // ── Camera controls (stable across renders) ─────────────────────
  const frameAll = useCallback(() => {
    const map = mapHandle.current?.getMap();
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
    mapHandle.current?.fitBounds(bounds, { top: 56, right: 44, bottom: 44, left: 44 });
    google.maps.event.addListenerOnce(map, "idle", () => {
      const z = map.getZoom();
      if (z != null && z > 16) map.setZoom(16);
    });
  }, [points]);

  // Apply a queued focus if both the map and target stop are available.
  // Returns whether it ran, so auto-framing can defer to an explicit focus.
  const applyFocus = useCallback(() => {
    const map = mapHandle.current?.getMap();
    const req = pendingFocusRef.current;
    const p = req ? points[req.index] : undefined;
    if (!map || !req || !p) return false;
    map.panTo({ lat: p.lat, lng: p.lng });
    map.setZoom(req.zoom);
    return true;
  }, [points]);

  const clearAdHoc = useCallback(() => {
    adHocMarkerRef.current?.setMap(null);
    adHocMarkerRef.current = null;
    pendingCoordRef.current = null;
  }, []);

  // Place/move the ad-hoc pin and pan onto it. No-op until the SDK is ready —
  // the request stays queued and the markers effect replays it via autoFit.
  const applyCoordFocus = useCallback(() => {
    const map = mapHandle.current?.getMap();
    const req = pendingCoordRef.current;
    if (!map || !req) return false;
    const position = { lat: req.lat, lng: req.lng };
    if (adHocMarkerRef.current) {
      adHocMarkerRef.current.setPosition(position);
      if (req.label) adHocMarkerRef.current.setTitle(req.label);
    } else {
      adHocMarkerRef.current = new google.maps.Marker({
        position,
        map,
        icon: makeAdHocPin(),
        title: req.label,
        zIndex: 1000,
      });
    }
    map.panTo(position);
    map.setZoom(req.zoom);
    return true;
  }, []);

  // Internal framing after markers/route render. Priority: an ad-hoc coord
  // focus wins, then a queued stop focus, otherwise the overview.
  const autoFit = useCallback(() => {
    if (applyCoordFocus()) return;
    if (!applyFocus()) frameAll();
  }, [applyCoordFocus, applyFocus, frameAll]);

  const focusPoint = useCallback((index: number, zoom = 16) => {
    // Queue first; if the SDK is still loading, the markers effect re-applies
    // it once the map mounts (instead of silently dropping the request).
    clearAdHoc(); // a stop focus supersedes any ad-hoc pin
    pendingFocusRef.current = { index, zoom };
    applyFocus();
  }, [applyFocus, clearAdHoc]);

  const focusCoord = useCallback((lat: number, lng: number, opts?: { label?: string; zoom?: number }) => {
    pendingFocusRef.current = null; // an ad-hoc focus supersedes a stop focus
    pendingCoordRef.current = { lat, lng, label: opts?.label, zoom: opts?.zoom ?? 16 };
    applyCoordFocus();
  }, [applyCoordFocus]);

  const fitAll = useCallback(() => {
    pendingFocusRef.current = null; // explicit overview clears focus intent
    clearAdHoc();
    frameAll();
  }, [frameAll, clearAdHoc]);

  useImperativeHandle(ref, () => ({ focusPoint, focusCoord, fitAll }), [focusPoint, focusCoord, fitAll]);

  // Replay an ad-hoc pin queued before the SDK was ready. The polyline effect
  // below only fires for routes with ≥2 stops, so a queued Go pin on an empty
  // route would otherwise stay dropped.
  useEffect(() => {
    if (status !== "ready") return;
    applyCoordFocus();
  }, [status, applyCoordFocus]);

  // ── Redraw polylines + apply autoFit whenever points/travelMode change ──
  // Marker lifecycle (creation/removal/styling) is handled by `<Map />` from
  // `stopMarkers`. This effect owns only the route polylines and re-framing.
  useEffect(() => {
    if (status !== "ready") return;
    const map = mapHandle.current?.getMap();
    if (!map) return;

    // Drop a stale focus intent when the stop set changes (e.g. day switch),
    // so we don't snap onto the wrong activity. A focus queued for the current
    // stops (reference unchanged) survives until the SDK is ready.
    if (prevPointsRef.current !== points) {
      pendingFocusRef.current = null;
      clearAdHoc(); // a Go-suggested pin is stale once the stop set changes
      prevPointsRef.current = points;
    }

    // This run owns the latest async work; later runs flip it to abort.
    let cancelled = false;

    // Clear previous polylines — markers are reconciled by `<Map />`.
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    setRouteError(false);

    if (points.length === 0) return;

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
    // Effective per-leg colour: an explicit `legColors` override wins, else the
    // colour is derived from the destination stop's slot — so the route "turns
    // into" the new time-of-day colour as it reaches each stop.
    const effectiveLegColors = points.slice(0, -1).map((_, i) => {
      const override = legColors?.[i];
      if (override) return override;
      const destSlot = points[i + 1]?.slot;
      return destSlot ? SLOT_COLORS[destSlot] : undefined;
    });
    const uniformColor = effectiveLegColors.every((c) => c === effectiveLegColors[0]);
    const sharedTransport = uniform ? legTransports[0] ?? null : null;
    const sharedMode = sharedTransport ? transportToTravelMode(sharedTransport) : travelMode;
    // A single Routes call only works when transport AND colour are uniform
    // across legs; otherwise each segment is drawn (and styled) on its own.
    const singleCall = uniform && uniformColor && !(sharedMode === "TRANSIT" && points.length > 2);

    if (singleCall) {
      const sharedColor = effectiveLegColors[0] ?? INK;
      const style = sharedTransport
        ? legStyle(sharedTransport, sharedColor)
        : { strokeColor: sharedColor, strokeWeight: 3, strokeOpacity: 0.85 };
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
            .then((data) => (data.polyline ? { encoded: data.polyline, transport, color: effectiveLegColors[i] ?? undefined } : null))
            .catch(() => null);
        }),
      ).then((legs) => {
        if (cancelled) return;
        const ok = legs.filter((l): l is { encoded: string; transport: TransportMode | null; color: string | undefined } => l != null);
        // Only flag an error when nothing drew — a partial route still reads.
        if (ok.length === 0) { setRouteError(true); return; }
        ok.forEach((l) => drawPolyline(l.encoded, legStyle(l.transport, l.color ?? INK)));
        autoFit();
      });
    }

    return () => { cancelled = true; };
  }, [status, points, travelMode, legColors, autoFit, clearAdHoc]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      adHocMarkerRef.current?.setMap(null);
    };
  }, []);

  return (
    <div className={cn("relative", className)} style={style}>
      <Map
        ref={mapHandle}
        center={INITIAL_CENTER}
        zoom={13}
        mapTypeId={mapTypeId}
        controls={controls}
        markers={stopMarkers}
        className="absolute inset-0"
      />

      {/* Route error badge — non-blocking, markers still visible. Stays a
          sibling overlay of <Map /> so it floats above the basemap. */}
      {routeError && status === "ready" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-sm border border-border rounded-pill px-3 py-1.5 text-tiny text-ink-soft">
          Route unavailable — showing stops only
        </div>
      )}
    </div>
  );
});
