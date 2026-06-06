"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import {
  Map,
  type MapHandle,
  type MapMarker,
  type RouteSpec,
  type TravelMode,
} from "@/components/ui/Map";
import type { RouteMapHandle, RouteStop } from "@/features/activity/types";
import { type StopRole } from "@/components/ui/mapPins";
import { SLOT_COLORS } from "@/features/activity/types";
import { resolveGlyph } from "@/features/activity/resolveGlyph";
import { MapStopsBar } from "./MapStopsBar";

/* ─────────────────────────────────────────────────────────────────
   ActivityRouteMap · the day's map "system" used across the app.
   Wraps the basemap `<Map />` with itinerary-shaped stop markers (numbered,
   slot-coloured, glyph from `resolveGlyph`) + one `RouteSpec` derived from
   the stop list (per-leg transport + slot-driven leg colours). The
   `MapStopsBar` below the map mirrors the stop order with chip shortcuts.

   The component owns the camera policy:
   - Active ad-hoc focus (via `focusCoord`) wins → no auto-fit.
   - Queued stop focus (via `focusPoint`) → pan + zoom onto the stop.
   - Otherwise → overview (`fitAll` with itinerary padding + zoom clamp 16).
   `RouteSpec.onDraw` fires this policy a second time once polylines arrive,
   so the overview reflects the real route geometry (detours, transit
   lines) instead of just the straight-line stops bounding box.

   Used by the Itinerary (day view) and the DayActivitiesEditForm
   (full-edit activity section).
───────────────────────────────────────────────────────────────── */

export type ActivityRouteMapProps = {
  /** Ordered stops (only activities with coordinates). */
  points: RouteStop[];
  travelMode?: TravelMode;
  /** Show the numbered stops bar under the map (default true). */
  showStopsBar?: boolean;
  /** Classes for the map element — control its height. Default `h-[308px]`. */
  mapClassName?: string;
  /** Classes for the outer wrapper. */
  className?: string;
  /**
   * Custom hover card for a pin. Receives the marker id (`"${index}:${placeId}"`)
   * and a close callback. Return null for no card on that pin.
   */
  renderPinCard?: (id: string, close: () => void) => ReactNode;
  /** Fired when a pin card is closed via its close affordance. */
  onMarkerClose?: (id: string) => void;
};

/** Stable initial centre for the basemap — superseded by `fitAll` as soon as
 *  markers/polylines are placed. Tokyo is the historic default. */
const INITIAL_CENTER = { lat: 35.6762, lng: 139.6503 };

/** Per-stop key used as marker id (so focus by index keeps working across
 *  re-renders even if `points` identity is stable). */
function stopKey(p: RouteStop, i: number): string {
  return `${i}:${p.placeId ?? `${p.lat},${p.lng}`}`;
}

export const ActivityRouteMap = forwardRef<RouteMapHandle, ActivityRouteMapProps>(
  function ActivityRouteMap(
    { points, travelMode = "WALKING", showStopsBar = true, mapClassName, className, renderPinCard, onMarkerClose },
    ref,
  ) {
    const mapHandle = useRef<MapHandle>(null);
    // A stop focus queued before the SDK was ready, or queued for the polyline
    // effect to reassert via `autoFit`. Cleared when the stop set changes.
    const pendingFocusRef = useRef<{ index: number; zoom: number } | null>(null);
    const prevPointsRef = useRef(points);
    const [routeError, setRouteError] = useState(false);

    // Stop markers in the `<Map />` shape — variant "stop" + role + slot colour.
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

    // ── Camera controls ──────────────────────────────────────────
    const frameAll = useCallback(() => {
      if (points.length === 0) return;
      if (points.length === 1) {
        const map = mapHandle.current?.getMap();
        if (!map) return;
        map.setCenter({ lat: points[0].lat, lng: points[0].lng });
        map.setZoom(15);
        return;
      }
      mapHandle.current?.fitAll({
        // Padding leaves room for the 32px markers; extra on top for the halo.
        padding: { top: 56, right: 44, bottom: 44, left: 44 },
        maxZoom: 16,
      });
    }, [points]);

    // Apply the queued stop focus if both the map and target stop are
    // available. Returns whether it ran, so `autoFit` can defer to it.
    const applyFocus = useCallback(() => {
      const map = mapHandle.current?.getMap();
      const req = pendingFocusRef.current;
      const p = req ? points[req.index] : undefined;
      if (!map || !req || !p) return false;
      map.panTo({ lat: p.lat, lng: p.lng });
      map.setZoom(req.zoom);
      return true;
    }, [points]);

    // Auto-framing after stops change or polylines render.
    // Priority: an ad-hoc focus (owned by `<Map />`) wins, then a queued stop
    // focus, otherwise the overview.
    const autoFit = useCallback(() => {
      if (mapHandle.current?.hasAdHocFocus()) return;
      if (!applyFocus()) frameAll();
    }, [applyFocus, frameAll]);

    // ── Imperative API (same shape as RouteMapHandle) ────────────
    const focusPoint = useCallback((index: number, zoom = 16) => {
      // A stop focus supersedes any ad-hoc pin. Queue first; if the SDK is
      // still loading, the autoFit on next polyline draw re-applies it.
      mapHandle.current?.clearAdHoc();
      pendingFocusRef.current = { index, zoom };
      applyFocus();
    }, [applyFocus]);

    const focusCoord = useCallback((lat: number, lng: number, opts?: { label?: string; zoom?: number }) => {
      pendingFocusRef.current = null;
      mapHandle.current?.focusCoord(lat, lng, opts);
    }, []);

    const fitAll = useCallback(() => {
      pendingFocusRef.current = null;
      frameAll();
    }, [frameAll]);

    useImperativeHandle(ref, () => ({ focusPoint, focusCoord, fitAll }), [focusPoint, focusCoord, fitAll]);

    // Drop stale focus state when the stop set changes, then re-fit eagerly
    // (points-only bounding box — the polyline-driven `onDraw` callback below
    // will tighten the framing once the route geometry is available).
    useEffect(() => {
      if (prevPointsRef.current !== points) {
        pendingFocusRef.current = null;
        mapHandle.current?.clearAdHoc();
        prevPointsRef.current = points;
      }
      setRouteError(false);
      autoFit();
    }, [points, autoFit]);

    // ── Route spec derived from `points` ────────────────────────
    // Per-leg colours derive from the destination stop's slot, so the route
    // "turns into" the new time-of-day colour as it reaches each stop.
    const routes = useMemo<RouteSpec[]>(() => {
      if (points.length < 2) return [];
      const perLegTransport = points.slice(0, -1).map((p) => p.transportOut ?? null);
      const legColors = points.slice(0, -1).map((_, i) => {
        const destSlot = points[i + 1]?.slot;
        return destSlot ? SLOT_COLORS[destSlot] : undefined;
      });
      return [{
        id: "itinerary",
        points: points.map((p) => ({ lat: p.lat, lng: p.lng })),
        travelMode,
        perLegTransport,
        legColors,
        // The component owns framing — Map only draws the polylines.
        fitOnLoad: false,
        onDraw: autoFit,
        onError: () => setRouteError(true),
      }];
    }, [points, travelMode, autoFit]);

    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <div className="relative w-full">
          <Map
            ref={mapHandle}
            center={INITIAL_CENTER}
            zoom={13}
            markers={stopMarkers}
            routes={routes}
            renderPinCard={renderPinCard}
            onMarkerClose={onMarkerClose}
            className={cn("w-full", mapClassName ?? "h-[308px]")}
          />

          {/* Route error badge — non-blocking, markers still visible. */}
          {routeError && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-sm border border-border rounded-pill px-3 py-1.5 text-tiny text-ink-soft">
              Route unavailable — showing stops only
            </div>
          )}
        </div>

        {showStopsBar && points.length > 0 && (
          <MapStopsBar stops={points} onFocus={(index) => focusPoint(index)} />
        )}
      </div>
    );
  },
);
ActivityRouteMap.displayName = "ActivityRouteMap";
