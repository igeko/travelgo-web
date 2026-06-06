"use client";

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { RouteMap, type RouteMapHandle, type RouteStop, type TravelMode } from "@/components/ui/RouteMap";
import { MapStopsBar } from "./MapStopsBar";

/* ─────────────────────────────────────────────────────────────────
   ActivityRouteMap · the day's map "system" used across the app.
   Wraps RouteMap (numbered orange markers + route polyline) with the
   MapStopsBar below it, and forwards the RouteMap imperative handle
   (focusPoint / focusCoord) so hosts can drive focus from row clicks.

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

export const ActivityRouteMap = forwardRef<RouteMapHandle, ActivityRouteMapProps>(
  function ActivityRouteMap(
    { points, travelMode = "WALKING", showStopsBar = true, mapClassName, className, renderPinCard, onMarkerClose },
    ref,
  ) {
    const inner = useRef<RouteMapHandle>(null);
    useImperativeHandle(
      ref,
      () => ({
        focusPoint: (index, zoom) => inner.current?.focusPoint(index, zoom),
        focusCoord: (lat, lng, opts) => inner.current?.focusCoord(lat, lng, opts),
        fitAll: () => inner.current?.fitAll(),
      }),
      [],
    );

    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <RouteMap
          ref={inner}
          points={points}
          travelMode={travelMode}
          renderPinCard={renderPinCard}
          onMarkerClose={onMarkerClose}
          className={cn("w-full", mapClassName ?? "h-[308px]")}
        />
        {showStopsBar && points.length > 0 && (
          <MapStopsBar stops={points} onFocus={(index) => inner.current?.focusPoint(index)} />
        )}
      </div>
    );
  },
);
ActivityRouteMap.displayName = "ActivityRouteMap";
