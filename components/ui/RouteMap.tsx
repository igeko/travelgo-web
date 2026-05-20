"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useGoogleMaps } from "@/lib/useGoogleMaps";
import { api } from "@/lib/client";
import type { PlaceResult } from "./AddressField";
import type { MapControls } from "./Map";

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

export type RouteMapProps = {
  /** Ordered list of places to visit */
  points: PlaceResult[];
  /** Routing mode — default WALKING */
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
   Orange numbered pin SVG — matches ActivityRow pin style
───────────────────────────────────────────────────────────────── */
function makePinSvg(index: number): string {
  const label = String(index + 1);
  const fontSize = label.length > 1 ? 11 : 13;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="13" fill="#f47b3a" />
      <text
        x="14" y="${14 + fontSize * 0.35}"
        text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        fill="white"
      >${label}</text>
    </svg>
  `.trim();
}

function makePinIcon(index: number): google.maps.Icon {
  const svg = makePinSvg(index);
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(28, 28),
    anchor: new google.maps.Point(14, 14),
  };
}

/** Minimal map styles — remove POI/transit clutter */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
];

export function RouteMap({
  points,
  travelMode = "WALKING",
  mapTypeId = "roadmap",
  className,
  style,
  controls = {},
}: RouteMapProps) {
  const status = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [routeError, setRouteError] = useState(false);

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

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Clear previous polyline
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    setRouteError(false);

    if (points.length === 0) return;

    // Place numbered markers
    points.forEach((point, i) => {
      const marker = new google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: mapRef.current!,
        icon: makePinIcon(i),
        title: point.name || point.formatted,
        zIndex: 10 + i,
      });
      markersRef.current.push(marker);
    });

    // Fit bounds to all points
    if (points.length === 1) {
      mapRef.current.setCenter({ lat: points[0].lat, lng: points[0].lng });
      mapRef.current.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      mapRef.current.fitBounds(bounds, 48);
    }

    // Fetch route from server-side handler
    if (points.length < 2) return;

    const map = mapRef.current;

    api.routes
      .compute(points.map((p) => ({ lat: p.lat, lng: p.lng })), travelMode)
      .then((data) => {
        if (!data.polyline) {
          setRouteError(true);
          return;
        }
        const path = decodePolyline(data.polyline);
        polylineRef.current = new google.maps.Polyline({
          path,
          map,
          strokeColor: "#f47b3a",
          strokeWeight: 3,
          strokeOpacity: 0.85,
        });
      })
      .catch(() => setRouteError(true));

  }, [status, points, travelMode]);  

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      polylineRef.current?.setMap(null);
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
}
