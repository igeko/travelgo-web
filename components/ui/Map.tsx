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
  makeCategoryPin,
  makeNightPin,
  makePinIcon,
  makeRoadmapPin,
  INK,
  ORANGE,
  NEUTRAL,
  NIGHT,
  type StopRole,
} from "./mapPins";
import { SLOT_COLORS, type SlotKey as RouteSlot } from "@/features/activity/types";
import { decodePolyline } from "./mapRoute";
import type { LatLng, RoutePoint, RouteSpec, TravelMode, TransportMode } from "./mapTypes";

// Re-exported for consumer convenience — Map is the canonical surface for
// these types, even if the definitions live in `./mapTypes` (pure types, no
// runtime imports).
export type { LatLng, RoutePoint, RouteSpec, TravelMode, TransportMode };

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
   *  - `"roadmap"` → teardrop `makeRoadmapPin` (itinerary activities — spec
   *                 /design/roadmap-pins). Drives shape/size via `roadmapState`.
   *  - `"stop"`    → teardrop `makePinIcon` (legacy itinerary day stops).
   *                 Requires `stopRole`; optional `slot` colours the body.
   *  - `"night"`   → indigo `makeNightPin` (Explore night-route layer).
   *  - default     → dot `makeAdHocPin` (Go suggestions, category results).
   */
  variant?: "roadmap" | "stop" | "night";
  /** Roadmap pin visual state (variant "roadmap"). Lo stato "selected"
   *  della spec NON è gestito qui — la selezione resta a carico del halo
   *  overlay (vedi `selectedMarkerId`). */
  roadmapState?: import("./mapPins").RoadmapPinState;
  /** Roadmap pin semantic kind — drives the colour palette. Activity = blu,
   *  accommodation = arancione (entrambi con icona bianca). Default "activity". */
  roadmapKind?: import("./mapPins").RoadmapPinKind;
  /** Category pin macro — when set, the marker is rendered as a teardrop
   *  with the muted palette (eat #c0622a / sleep #2d6a8f / explore #3a7d44)
   *  and a white icon centred on the head. Used by area-search results from
   *  the ExploreToolbar. Wins over `variant` so opting in is one prop. */
  categoryKind?: import("./mapPins").CategoryPinKind;
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
  /**
   * If true, the marker can be dragged. The Map applies a "ghost" lift effect
   * during the drag (scale 1.15×, stronger drop shadow, opacity 0.9) and emits
   * `onMarkerDragEnd` with the final coordinates on release. The host is
   * responsible for updating the marker's `lat`/`lng` in its own state — the
   * Map does NOT persist anything on its own; without a host update the marker
   * snaps back on the next reconcile.
   */
  draggable?: boolean;
  /**
   * Google Place ID dell'entità rappresentata dal pin, quando disponibile.
   * Carry-only: la Map non ci fa nulla oggi, ma consumer downstream (click
   * → enriched card, cache server-side per pair, dedup semantico) possono
   * leggerlo dal marker senza ri-geocodificare dai latlng. Null per i pin
   * derivati da coords pure (es. ad-hoc click).
   */
  placeId?: string | null;
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
  /**
   * Fired when a draggable marker is released at a new position. The Map does
   * NOT mutate the marker's coords on its own — the host has to fold the new
   * latlng into the marker's source state, otherwise the next reconcile snaps
   * it back to the original position.
   */
  onMarkerDragEnd?: (id: string, latlng: LatLng) => void;
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
  /**
   * Drawable routes — each spec is rendered as its own polyline (single-call
   * when transport and colour are uniform across legs, per-leg otherwise).
   * Multiple specs coexist on the same map (e.g. itinerary + Explore night).
   */
  routes?: RouteSpec[];
  /**
   * Pixel offset of the visible viewport relative to the map container — use it
   * when UI panels (e.g. a left timeline) cover part of the map. The
   * `onViewportChange` centre/radius are computed against the *visible* area
   * (the container bounds minus the inset), so category area-searches stay
   * centred on what the user actually sees.
   */
  viewportInset?: { left?: number; right?: number; top?: number; bottom?: number };
  /**
   * Quando `true`, al primo render in cui markers o route polylines sono
   * disponibili la camera viene inquadrata su tutto il contenuto (markers +
   * polilinee), rispettando `viewportInset` come padding extra. Si attiva una
   * sola volta per istanza del componente — successive aggiunte/rimozioni
   * non rifocalizzano (lo zoom dopo il fit iniziale è interamente dell'utente).
   * Default `false`. Usata da Explore Next per dare un overview all'apertura.
   */
  fitAllOnMount?: boolean;
  /**
   * Action bubble anchored at a lat/lng — renders a small pill above the
   * point with a label and a single CTA. Used by Explore for the
   * "Search <category> near here" affordance: click on the map with a
   * category selected → bubble appears; user clicks it → host runs the
   * area search and clears the bubble. Pass `null` to hide. The bubble
   * follows pan/zoom (powered by an OverlayView), so the host can leave
   * it pinned until dismissed.
   */
  actionBubble?: {
    lat: number;
    lng: number;
    label: string;
    onClick: () => void;
  } | null;
};

/**
 * Imperative handle exposed by `Map` — gives wrapper components (e.g.
 * `ActivityRouteMap`) access to the underlying SDK instance for operations not covered
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
  /**
   * Drop (or move) the transient orange ad-hoc pin at the given coordinates
   * and pan/zoom the camera onto it. There is at most ONE ad-hoc pin at a
   * time — calling `focusCoord` again replaces it. The pin persists until
   * `clearAdHoc()` or `fitAll()` is called, or the Map unmounts. If the SDK
   * isn't ready yet, the request is queued and applied on `ready`.
   */
  focusCoord: (lat: number, lng: number, opts?: { label?: string; zoom?: number }) => void;
  /** Remove the ad-hoc pin without touching the camera. */
  clearAdHoc: () => void;
  /**
   * `true` if an ad-hoc focus is currently active — either applied (pin on
   * map) or queued (waiting for the SDK). Wrappers (e.g. ActivityRouteMap) use it to
   * decide whether an automatic reframing should defer to the user's focus.
   */
  hasAdHocFocus: () => boolean;
  /**
   * Reframe the camera to fit all current markers + route geometries.
   * Clears any prior ad-hoc pin (the user explicitly asked for the overview).
   * `opts.maxZoom` clamps the resulting zoom — useful to avoid the
   * over-zoomed corner case when only one point is in the bounds.
   */
  fitAll: (opts?: { padding?: number | google.maps.Padding; maxZoom?: number }) => void;
  /**
   * Pan-only verso le coords di un marker già presente. Niente cambio di
   * zoom — se il marker è già nel viewport è un no-op (il `panTo` interno di
   * Google evita movimenti inutili). Usato dalla Timeline quando l'utente
   * seleziona una row e vuole spostare la camera senza riframmare.
   */
  panToMarker: (id: string) => void;
  /**
   * Reframe della camera per inquadrare TUTTI i marker corrispondenti agli
   * `ids` passati (utili per "focus su un giorno"). Usa `fitBounds` quindi
   * cambia anche lo zoom — lecito quando l'utente ha esplicitamente chiesto
   * il fit. No-op quando nessuno degli ids matcha un marker.
   */
  fitMarkers: (ids: string[], opts?: { padding?: number | google.maps.Padding; maxZoom?: number }) => void;
};

/** Hover dwell before a pin's card appears, and grace before it closes. */
const PIN_CARD_DWELL = 200;
const PIN_CARD_GRACE = 180;

/**
 * Variant-aware icon resolver — single source of truth for "what does this
 * marker look like right now". Shared by the styling pass (normal icons) and
 * the drag listeners (ghost icons). The selection state controls the body
 * colour of ad-hoc pins; stop/night pins keep their semantic colour and rely
 * on the halo overlay to communicate selection.
 */
function iconForMarker(
  m: MapMarker,
  isSelected: boolean,
  isGhost: boolean,
  isHovered = false,
): google.maps.Icon {
  // Category pin wins over `variant`: marker carries an explicit
  // categoryKind → render the muted teardrop and skip the legacy paths.
  if (m.categoryKind) {
    return makeCategoryPin(m.categoryKind, m.glyph ?? "", isGhost);
  }
  if (m.variant === "roadmap") {
    // Stato selected → bordo bianco + scala hover (no halo overlay decorativo,
    // riservato ai click su POI Google fuori dai pin dell'itinerario). Hover e
    // selected condividono la stessa scala, così niente salto di dimensione.
    return makeRoadmapPin(
      m.roadmapState ?? "default",
      m.glyph ?? "",
      isGhost,
      m.roadmapKind ?? "activity",
      isHovered,
      isSelected,
    );
  }
  if (m.variant === "stop") {
    const color = m.slot ? SLOT_COLORS[m.slot] : INK;
    return makePinIcon(m.stopRole ?? "mid", m.glyph ?? "", color, isGhost);
  }
  if (m.variant === "night") {
    return makeNightPin(m.glyph ?? "", undefined, isGhost);
  }
  return makeAdHocPin(
    isSelected ? INK : NEUTRAL,
    isSelected ? ORANGE : "#fff",
    m.glyph,
    isGhost,
  );
}

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
 * map is useful for trip planning. Applied as raster fallback when
 * NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is not set; once a vector Map ID is configured,
 * equivalent rules live in cloud-based styling and `styles` is ignored.
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

/* ─────────────────────────────────────────────────────────────────
   Routing helpers (private — used by the `routes` polyline effect).
   Consolidated here so the routing logic has a single home (this primitive
   replaces the legacy RouteMap that used to wrap this file).
───────────────────────────────────────────────────────────────── */

/** Domain transport → Google Routes API travel mode. */
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

/**
 * Draw one `RouteSpec` onto the given map. Picks single-call vs per-leg
 * based on transport/colour uniformity (and on the TRANSIT-multi-stop
 * carve-out, since Google's Routes API rejects intermediates in TRANSIT
 * mode). All polylines are appended to `sink` so the caller owns cleanup,
 * and every async branch consults `isCancelled` before drawing — so a
 * spec swap mid-flight never leaves stale lines on the map.
 */
function drawRouteSpec(
  map: google.maps.Map,
  spec: RouteSpec,
  isCancelled: () => boolean,
  sink: google.maps.Polyline[],
): void {
  const { points } = spec;
  if (points.length < 2) return;

  const sharedColor = spec.style?.color ?? INK;
  const sharedWeight = spec.style?.weight ?? 3;
  const sharedOpacity = spec.style?.opacity ?? 0.9;
  const defaultMode: TravelMode = spec.travelMode ?? "WALKING";

  // `straight: true` → polyline lineare diretta sui `points`, niente call
  // a Google Routes. Usata quando il bridge è già persistito (durata + mode)
  // ma la geometria non serve essere precisa: vogliamo solo segnare che i
  // due stop sono collegati. Skippa anche la cache localStorage.
  if (spec.straight) {
    sink.push(
      new google.maps.Polyline({
        path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
        map,
        strokeColor: sharedColor,
        strokeWeight: sharedWeight,
        strokeOpacity: sharedOpacity,
      }),
    );
    if (spec.fitOnLoad) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, spec.fitPadding ?? 64);
    }
    spec.onDraw?.();
    return;
  }

  const legCount = points.length - 1;
  const legTransports: (TransportMode | null)[] = Array.from({ length: legCount }, (_, i) =>
    spec.perLegTransport?.[i] ?? null,
  );
  const effectiveLegColors: string[] = Array.from({ length: legCount }, (_, i) =>
    spec.legColors?.[i] ?? sharedColor,
  );

  const uniformTransport = new Set(legTransports).size <= 1;
  const uniformColor = effectiveLegColors.every((c) => c === effectiveLegColors[0]);
  const sharedTransport = uniformTransport ? legTransports[0] ?? null : null;
  const sharedMode = sharedTransport ? transportToTravelMode(sharedTransport) : defaultMode;
  const singleCall = uniformTransport && uniformColor && !(sharedMode === "TRANSIT" && points.length > 2);

  const draw = (encoded: string, options: google.maps.PolylineOptions) => {
    if (isCancelled()) return;
    sink.push(new google.maps.Polyline({ path: decodePolyline(encoded), map, ...options }));
  };

  const maybeFit = (encodedList: string[]) => {
    if (!spec.fitOnLoad || isCancelled()) return;
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    for (const e of encodedList) decodePolyline(e).forEach((ll) => bounds.extend(ll));
    map.fitBounds(bounds, spec.fitPadding ?? 64);
  };

  if (singleCall) {
    const opts: google.maps.PolylineOptions = sharedTransport
      ? legStyle(sharedTransport, effectiveLegColors[0] ?? sharedColor)
      : { strokeColor: sharedColor, strokeWeight: sharedWeight, strokeOpacity: sharedOpacity };
    api.routes
      .compute(points, sharedMode)
      .then((data) => {
        if (isCancelled()) return;
        if (!data.polyline) { spec.onError?.(); return; }
        draw(data.polyline, opts);
        maybeFit([data.polyline]);
        spec.onDraw?.();
      })
      .catch(() => { if (!isCancelled()) spec.onError?.(); });
    return;
  }

  Promise.all(
    points.slice(0, -1).map((from, i) => {
      const to = points[i + 1];
      const transport = legTransports[i] ?? null;
      const mode = transport ? transportToTravelMode(transport) : defaultMode;
      return api.routes
        .compute([{ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }], mode)
        .then((data) => (data.polyline ? { encoded: data.polyline, transport, color: effectiveLegColors[i] ?? sharedColor } : null))
        .catch(() => null);
    }),
  ).then((legs) => {
    if (isCancelled()) return;
    const ok = legs.filter((l): l is { encoded: string; transport: TransportMode | null; color: string } => l != null);
    if (ok.length === 0) { spec.onError?.(); return; }
    ok.forEach((l) => draw(l.encoded, legStyle(l.transport, l.color)));
    maybeFit(ok.map((l) => l.encoded));
    spec.onDraw?.();
  });
}

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

/**
 * Action bubble overlay — a small pill above a lat/lng with a single CTA.
 * Used for "Search <category> near here". Re-projects on every draw, so the
 * bubble follows pan/zoom. The button has pointer-events so the click goes
 * through to the host callback rather than being eaten by the map.
 */
type ActionBubbleOverlay = google.maps.OverlayView & {
  setData: (lat: number, lng: number, label: string, onClick: () => void) => void;
};

function createActionBubbleOverlay(): ActionBubbleOverlay {
  const overlay = new google.maps.OverlayView() as ActionBubbleOverlay;
  let pos: google.maps.LatLng | null = null;
  let handler: () => void = () => {};

  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;transform:translate(-50%,-100%);z-index:1001;pointer-events:none;";

  const button = document.createElement("button");
  button.type = "button";
  button.style.cssText =
    "pointer-events:auto;display:inline-flex;align-items:center;gap:6px;" +
    "padding:6px 12px;border-radius:9999px;font-size:13px;font-weight:500;" +
    "background:var(--color-ink,#0d2c3d);color:#fff;border:0;cursor:pointer;" +
    "box-shadow:0 4px 14px rgba(13,44,61,0.28);white-space:nowrap;" +
    "margin-bottom:8px;";
  button.addEventListener("click", (e) => { e.stopPropagation(); handler(); });
  container.append(button);

  overlay.onAdd = function () { this.getPanes()?.floatPane.appendChild(container); };
  overlay.draw = function () {
    if (!pos) return;
    const p = this.getProjection()?.fromLatLngToDivPixel(pos);
    if (!p) return;
    container.style.left = `${p.x}px`;
    container.style.top = `${p.y}px`;
  };
  overlay.onRemove = function () { container.remove(); };
  overlay.setData = (lat, lng, label, onClick) => {
    pos = new google.maps.LatLng(lat, lng);
    button.textContent = label;
    handler = onClick;
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
    onMarkerDragEnd,
    onViewportChange,
    renderPinCard,
    onMarkerClose,
    routes,
    viewportInset,
    fitAllOnMount = false,
    actionBubble = null,
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
  // All polylines drawn for the current `routes`. One spec may produce 1
  // (single-call) or N−1 (per-leg) polylines, so the shape is a flat list —
  // we clean up wholesale on every change.
  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
  // Transient ad-hoc pin (a place outside the route — Go suggestions, "show
  // on map", category result the consumer wants to focus on). Single instance
  // managed by the `focusCoord` / `clearAdHoc` / `fitAll` handle methods.
  const adHocMarkerRef = useRef<google.maps.Marker | null>(null);
  // A `focusCoord` request queued before the SDK was ready. Replayed when
  // `status` flips to `ready` and on every imperative call.
  const pendingCoordRef = useRef<{ lat: number; lng: number; label?: string; zoom: number } | null>(null);
  // Latest `markers` array — kept in a ref so `fitAll` can read the current
  // set without needing to re-create the imperative handle on every render.
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const selectedOverlayRef = useRef<SelectedPinOverlay | null>(null);
  const cardOverlayRef = useRef<google.maps.OverlayView | null>(null);
  // Pin under the cursor (after a dwell). The card shows for `hoverId ?? selectedMarkerId`.
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Card explicitly dismissed for this marker — closing the card via X does
  // NOT remove the underlying pin (it's a Map-internal visual concern, the
  // parent's marker state is untouched). Reset on the next hover-in or click
  // on any pin so the card can reopen.
  const [dismissedCardId, setDismissedCardId] = useState<string | null>(null);
  const [cardPixel, setCardPixel] = useState<{ x: number; y: number } | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest handlers — kept in refs so listeners need not be re-bound.
  const onMapClickRef = useRef(onMapClick);
  const onPoiClickRef = useRef(onPoiClick);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  const onViewportChangeRef = useRef(onViewportChange);
  // viewportInset lives in a ref too — the `idle` listener reads it on every
  // emission and we don't want a panel-width tick to re-bind the listener.
  const viewportInsetRef = useRef(viewportInset);
  onMapClickRef.current = onMapClick;
  onPoiClickRef.current = onPoiClick;
  onMarkerClickRef.current = onMarkerClick;
  onMarkerDragEndRef.current = onMarkerDragEnd;
  onViewportChangeRef.current = onViewportChange;
  viewportInsetRef.current = viewportInset;
  // Latest `selectedMarkerId` for the drag listeners (they need it to restore
  // the correct icon on dragend without re-binding on every selection change).
  const selectedIdRef = useRef(selectedMarkerId);
  selectedIdRef.current = selectedMarkerId;
  // Currently-dragged marker key, if any. The styling pass below skips this
  // marker so the ghost icon set by the drag handler isn't overwritten; the
  // hover/selection card is also suppressed while a drag is in progress.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  draggingIdRef.current = draggingId;

  // Apply (or replay) the queued ad-hoc focus. Returns `true` if the request
  // was applied; `false` if nothing was queued or the SDK isn't ready. Stable
  // identity (closes over refs only) so the replay effect can depend on it
  // without re-firing.
  const applyPendingCoord = useCallback((): boolean => {
    const map = mapRef.current;
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

  // Remove the ad-hoc pin without touching the camera. Used by `clearAdHoc`
  // on the imperative handle and by `fitAll` (overview supersedes ad-hoc).
  const removeAdHoc = useCallback(() => {
    adHocMarkerRef.current?.setMap(null);
    adHocMarkerRef.current = null;
    pendingCoordRef.current = null;
  }, []);

  // Imperative escape hatch for wrapper components that need to drive the map
  // directly (focus, framing, raw SDK instance). Identity is stable — every
  // method closes over refs only.
  useImperativeHandle(
    ref,
    () => ({
      getMap: () => mapRef.current,
      fitBounds: (bounds, padding) => mapRef.current?.fitBounds(bounds, padding),
      focusCoord: (lat, lng, opts) => {
        pendingCoordRef.current = { lat, lng, label: opts?.label, zoom: opts?.zoom ?? 16 };
        applyPendingCoord();
      },
      clearAdHoc: removeAdHoc,
      hasAdHocFocus: () => adHocMarkerRef.current != null || pendingCoordRef.current != null,
      fitAll: (opts) => {
        const map = mapRef.current;
        if (!map) return;
        // Overview supersedes any transient focus state.
        removeAdHoc();
        const bounds = new google.maps.LatLngBounds();
        let any = false;
        (markersRef.current ?? []).forEach((m) => {
          bounds.extend({ lat: m.lat, lng: m.lng });
          any = true;
        });
        for (const pl of routePolylinesRef.current) {
          pl.getPath().forEach((ll) => { bounds.extend(ll); any = true; });
        }
        if (!any) return;
        map.fitBounds(bounds, opts?.padding ?? 64);
        const maxZoom = opts?.maxZoom;
        if (maxZoom != null) {
          google.maps.event.addListenerOnce(map, "idle", () => {
            const z = map.getZoom();
            if (z != null && z > maxZoom) map.setZoom(maxZoom);
          });
        }
      },
      panToMarker: (id) => {
        const map = mapRef.current;
        if (!map) return;
        const m = (markersRef.current ?? []).find((mk) => (mk.id ?? `${mk.lat},${mk.lng}`) === id);
        if (!m) return;
        // panTo è idempotente quando il target è già visibile, e Google ottimizza
        // automaticamente il movimento minimo. Niente cambio di zoom — coerente
        // con la richiesta "spostati verso il pin se non visibile, senza zoom".
        map.panTo({ lat: m.lat, lng: m.lng });
      },
      fitMarkers: (ids, opts) => {
        const map = mapRef.current;
        if (!map || ids.length === 0) return;
        const wanted = new Set(ids);
        const bounds = new google.maps.LatLngBounds();
        let any = false;
        (markersRef.current ?? []).forEach((m) => {
          const key = m.id ?? `${m.lat},${m.lng}`;
          if (!wanted.has(key)) return;
          bounds.extend({ lat: m.lat, lng: m.lng });
          any = true;
        });
        if (!any) return;
        map.fitBounds(bounds, opts?.padding ?? 64);
        const maxZoom = opts?.maxZoom;
        if (maxZoom != null) {
          google.maps.event.addListenerOnce(map, "idle", () => {
            const z = map.getZoom();
            if (z != null && z > maxZoom) map.setZoom(maxZoom);
          });
        }
      },
    }),
    [applyPendingCoord, removeAdHoc],
  );

  // Replay a queued ad-hoc focus when the SDK becomes ready, so a `focusCoord`
  // call made before init doesn't get silently dropped.
  useEffect(() => {
    if (status !== "ready") return;
    applyPendingCoord();
  }, [status, applyPendingCoord]);

  // Tear down the ad-hoc pin on unmount.
  useEffect(() => () => {
    adHocMarkerRef.current?.setMap(null);
    adHocMarkerRef.current = null;
  }, []);

  // The pin whose card is currently shown (hover preview wins over selection).
  // While a drag is in progress the card is suppressed: the marker is moving
  // under the cursor, an anchored card would chase it across the screen.
  // A pin whose card was just dismissed via X stays hidden until a fresh
  // interaction (hover-in or click) clears the dismissal — the pin itself
  // remains visible regardless.
  const candidateCardId = draggingId ? null : hoverId ?? selectedMarkerId ?? null;
  const activeCardId =
    candidateCardId && candidateCardId === dismissedCardId ? null : candidateCardId;
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
    dwellTimer.current = setTimeout(() => {
      setHoverId(id);
      setDismissedCardId(null); // fresh hover → card can reopen
    }, PIN_CARD_DWELL);
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

    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center,
      zoom,
      mapTypeId,
      // Vector map (cloud-based styling) when configured; raster + MAP_STYLES otherwise.
      ...(mapId ? { mapId } : { styles: MAP_STYLES }),
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
      marker.addListener("click", () => {
        setDismissedCardId(null); // re-clicking any pin reopens its card
        onMarkerClickRef.current?.(key);
      });
      marker.addListener("mouseover", () => {
        hoverPin(key);
        // Itinerary pins grow 1.25× on hover. Other variants keep the size
        // they have (their hover feedback is the card popping up).
        const desc = (markersRef.current ?? []).find((mk) => keyOf(mk) === key);
        if (desc?.variant === "roadmap") {
          marker.setIcon(iconForMarker(desc, selectedIdRef.current === key, false, true));
        }
      });
      marker.addListener("mouseout", () => {
        unhoverPin();
        const desc = (markersRef.current ?? []).find((mk) => keyOf(mk) === key);
        if (desc?.variant === "roadmap") {
          marker.setIcon(iconForMarker(desc, selectedIdRef.current === key, false, false));
        }
      });
      // Drag listeners. The handlers close over `key` only — every other piece
      // of state (current descriptor, selection, callback) is read from a ref
      // so re-binding on prop changes isn't necessary.
      marker.addListener("dragstart", () => {
        setDraggingId(key);
        const desc = (markersRef.current ?? []).find((mk) => keyOf(mk) === key);
        if (desc) marker.setIcon(iconForMarker(desc, selectedIdRef.current === key, true));
        marker.setOpacity(0.9);
        // Cancel any pending hover dwell so it doesn't fire mid-drag.
        if (dwellTimer.current) { clearTimeout(dwellTimer.current); dwellTimer.current = null; }
      });
      marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
        const ll = e.latLng;
        setDraggingId(null);
        marker.setOpacity(1);
        // Restore the non-ghost icon now; the next reconcile would do this
        // anyway, but doing it here avoids a one-frame ghost flash on hosts
        // that don't update `markers` synchronously.
        const desc = (markersRef.current ?? []).find((mk) => keyOf(mk) === key);
        if (desc) marker.setIcon(iconForMarker(desc, selectedIdRef.current === key, false));
        if (ll) onMarkerDragEndRef.current?.(key, { lat: ll.lat(), lng: ll.lng() });
      });
      markersByKey.current[key] = marker;
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
    // neutral slate. A category glyph replaces the dot when present. The
    // dragged marker is skipped here — its icon AND position are owned by the
    // drag handlers for the duration of the drag. Outside drag the position is
    // synced to the descriptor: data is the source of truth, so a marker whose
    // `lat`/`lng` change in props moves; a marker dragged but not persisted by
    // the host snaps back here.
    for (const m of desired) {
      const key = keyOf(m);
      const marker = markersByKey.current[key];
      if (!marker) continue;
      marker.setDraggable(m.draggable ?? false);
      if (key === draggingIdRef.current) continue;
      marker.setPosition({ lat: m.lat, lng: m.lng });
      const isSelected = selectedMarkerId != null && key === selectedMarkerId;
      marker.setIcon(iconForMarker(m, isSelected, false));
      if (m.variant === "roadmap") {
        // dimmed < default < overflow: l'overflow chiede attenzione e
        // non deve essere mai coperto da pin "normali" sovrapposti.
        const z = m.roadmapState === "overflow" ? 7 :
                  m.roadmapState === "dimmed"   ? 3 : 5;
        marker.setZIndex(isSelected ? 1000 : z);
      } else if (m.variant === "stop") {
        marker.setZIndex(isSelected ? 1000 : 5);
      } else if (m.variant === "night") {
        marker.setZIndex(isSelected ? 1000 : 500);
      } else {
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

    // Auto-fit disabilitato: la mappa NON riframma più quando arrivano nuovi
    // marker (es. suggerimenti Go, ricerche per categoria, roadmap pins
    // ottimistici). Era la fonte degli zoom in/out "casuali" che l'utente
    // ha riportato. Lo zoom è ora interamente controllato dall'utente; i
    // wrapper possono ancora reframmare a comando esplicito via
    // `mapHandle.fitAll()` (vedi useImperativeHandle sopra).
  }, [markers, status, selectedMarkerId, hoverPin, unhoverPin]);

  // Route polylines: every entry in `routes` is drawn as its own polyline
  // (single-call when transport+colour are uniform, per-leg otherwise).
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;

    // Drop every polyline from the previous render — in-flight fetches will
    // see `cancelled` and skip their draw, so no stale geometry leaks.
    for (const poly of routePolylinesRef.current) poly.setMap(null);
    routePolylinesRef.current = [];

    if (!routes || routes.length === 0) return;

    let cancelled = false;
    for (const spec of routes) drawRouteSpec(map, spec, () => cancelled, routePolylinesRef.current);

    return () => { cancelled = true; };
  }, [routes, status]);

  // Tear down all route polylines on unmount.
  useEffect(() => () => {
    for (const poly of routePolylinesRef.current) poly.setMap(null);
    routePolylinesRef.current = [];
  }, []);

  // Initial fit-to-all — opt-in via `fitAllOnMount`. Si attiva UNA VOLTA per
  // istanza del componente, appena la mappa è pronta e c'è almeno un marker
  // o una polilinea da inquadrare. Niente refit successivi: lo zoom passa
  // interamente all'utente dopo l'overview iniziale.
  //
  // `viewportInset` viene tradotto in `Padding` di Google Maps così la fit
  // tiene conto del pannello laterale che copre parte della mappa (es. la
  // Timeline di Explore Next).
  const didInitialFitRef = useRef(false);
  useEffect(() => {
    if (!fitAllOnMount || didInitialFitRef.current) return;
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;
    const bounds = new google.maps.LatLngBounds();
    let any = false;
    for (const m of markersRef.current ?? []) {
      bounds.extend({ lat: m.lat, lng: m.lng });
      any = true;
    }
    for (const pl of routePolylinesRef.current) {
      pl.getPath().forEach((ll) => { bounds.extend(ll); any = true; });
    }
    if (!any) return;
    const inset = viewportInsetRef.current ?? {};
    const padding: google.maps.Padding = {
      top: (inset.top ?? 0) + 64,
      right: (inset.right ?? 0) + 64,
      bottom: (inset.bottom ?? 0) + 64,
      left: (inset.left ?? 0) + 64,
    };
    map.fitBounds(bounds, padding);
    didInitialFitRef.current = true;
  }, [fitAllOnMount, status, markers, routes]);

  // Tear down the shared MarkerClusterer on unmount. Clustered marker
  // instances live in `markersByKey` and are dropped by the standard reconcile
  // path; the clusterer just needs its internal references released.
  useEffect(() => () => {
    clustererRef.current?.clearMarkers();
    clustererRef.current = null;
  }, []);

  // Decorate the selected marker with the hero halo + name label overlay.
  // I roadmap pin sono ESCLUSI: hanno la loro selezione "intrinseca" (bordo
  // bianco + scala hover gestiti da makeRoadmapPin). L'halo overlay resta per
  // i POI Google e i pin ad-hoc (click su mappa) — quello è il "selected
  // standard" di cui parlava l'utente.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;
    const sel = selectedMarkerId
      ? (markers ?? []).find((m) => (m.id ?? `${m.lat},${m.lng}`) === selectedMarkerId)
      : undefined;
    if (!sel || sel.variant === "roadmap") {
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

  // Action bubble overlay — lazily created on first non-null `actionBubble`,
  // re-positioned on every prop change, hidden when prop is null. Unmounted
  // with the Map. The OverlayView itself handles the pan/zoom redraw via
  // google.maps panes.
  const actionBubbleRef = useRef<ActionBubbleOverlay | null>(null);
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    if (!actionBubble) {
      actionBubbleRef.current?.setMap(null);
      actionBubbleRef.current = null;
      return;
    }
    if (!actionBubbleRef.current) {
      actionBubbleRef.current = createActionBubbleOverlay();
      actionBubbleRef.current.setMap(mapRef.current);
    }
    actionBubbleRef.current.setData(
      actionBubble.lat, actionBubble.lng, actionBubble.label, actionBubble.onClick,
    );
  }, [status, actionBubble]);

  useEffect(() => () => { actionBubbleRef.current?.setMap(null); }, []);

  const pinCard = activeCardId && renderPinCard
    ? renderPinCard(activeCardId, () => {
        setHoverId(null);
        // Hide the card locally (Map-internal) and let the parent decide what
        // else, if anything, to do — closing the card never destroys the pin.
        setDismissedCardId(activeCardId);
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
