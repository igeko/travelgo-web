/**
 * components/ui/mapTypes.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared Google Maps routing types — pure types, no runtime. Safe to
 * import from server code and from any UI surface. Runtime helpers
 * (Polyline construction, stroke style per transport) live inside the
 * consuming components, since they touch `google.maps` globals.
 *
 * Naming convention:
 *  - `TravelMode`     — Google Routes API mode (WALKING/DRIVING/…).
 *  - `TransportMode`  — TravelGo domain transport (walk/metro/bus/…).
 *  - `RouteSpec`      — one drawable route on the map (points + style).
 * ─────────────────────────────────────────────────────────────────
 */

import type { BridgeData } from "@/lib/dal/domain";

/** Geographic coordinate pair used everywhere on the map. */
export type LatLng = {
  lat: number;
  lng: number;
};

/** Google Routes API travel modes accepted by `/api/routes`. */
export type TravelMode = "WALKING" | "DRIVING" | "BICYCLING" | "TRANSIT";

/** Domain transport mode — comes from `BridgeData` (activity bridges). */
export type TransportMode = BridgeData["transport"];

/**
 * One drawable route on the map. The Map component accepts an array of these
 * (`routes` prop) and draws each independently — so multiple unrelated routes
 * (e.g. itinerary route + Explore night route) can coexist on the same canvas.
 *
 * Drawing strategy:
 *  - When `perLegTransport` and `legColors` are uniform (or absent) AND
 *    `style` is set OR a single shared transport applies, the route is fetched
 *    in ONE `/api/routes` call covering all waypoints (the cheap path).
 *  - When per-leg transports differ, or per-leg colours differ, each leg is
 *    fetched + styled individually (N−1 calls for N points).
 *  - Multi-stop TRANSIT is always per-leg — Google's Routes API rejects
 *    intermediates in TRANSIT mode.
 */
/**
 * Singolo waypoint di una `RouteSpec`. Lat/lng sono obbligatori; il
 * `placeId` opzionale è solo carry-through (la geometria oggi viene
 * calcolata dai latlng). Quando arriverà un cache server-side per
 * coppie placeId o quando passeremo a Routes API con `{placeId}`, il
 * campo è già presente sulla pipeline.
 */
export type RoutePoint = LatLng & { placeId?: string | null };

export type RouteSpec = {
  /** Stable id — used to keep polyline instances across rerenders. */
  id: string;

  /** Ordered waypoints. <2 points → the spec is a no-op (no polyline drawn). */
  points: RoutePoint[];

  /** Default travel mode for legs without an explicit `perLegTransport[i]`. */
  travelMode?: TravelMode;

  /**
   * Per-leg transport: `perLegTransport[i]` is the transport from
   * `points[i]` → `points[i+1]`. Length expected: `points.length - 1`.
   * Enables per-leg stroke style (walk → dotted, car → solid thick, …).
   * A `null` entry falls back to `travelMode` and to the uniform style.
   */
  perLegTransport?: (TransportMode | null)[];

  /**
   * Per-leg colour override: `legColors[i]` colours the leg from
   * `points[i]` → `points[i+1]`. A `null`/`undefined` entry falls back
   * to `style.color` (or brand ink if neither is set).
   */
  legColors?: (string | null | undefined)[];

  /**
   * Uniform style for the whole route — used when no per-leg style applies.
   * Wins when the route is drawn as a single polyline (uniform transport +
   * uniform colour).
   */
  style?: {
    color?: string;
    weight?: number;
    opacity?: number;
    /**
     * Casing: polyline più scura e spessa disegnata SOTTO la linea principale
     * lungo lo stesso path. Crea l'effetto "bordo" tipico dei percorsi brand
     * (es. day-path di Explore Next: linea arancione 2.5px su casing ink 5px).
     * Applicato solo alle polyline solide — sui pattern dotted/dashed verrebbe
     * coperto dai marker icona e non avrebbe senso. L'opacity viene ereditata
     * da `opacity` (così il casing dim segue il dim della linea).
     */
    casing?: {
      color?: string;
      weight?: number;
    };
  };

  /**
   * Quando `true` la mappa disegna una polyline LINEARE che collega i
   * `points` in ordine, senza chiamare `/api/routes` (e quindi senza
   * passare per Google Routes API né per la cache localStorage). Usato
   * quando i bridge sono già stati persistiti su DB e vogliamo solo
   * un segno visivo "qui c'è un transfer" senza incorrere in altre
   * call. Default `false` → geometry reale via Google.
   */
  straight?: boolean;

  /**
   * Fit the map viewport to the route bounds when polylines (re)render.
   * Default `false` — the consumer keeps full control of the camera.
   * Itinerary uses `true` (the day's route reframes the camera on change).
   * Explore uses `false` (the user is navigating the basemap).
   */
  fitOnLoad?: boolean;

  /**
   * Padding for the auto-fit when `fitOnLoad` is `true`. Defaults to a
   * sensible value picked by the Map component when omitted.
   */
  fitPadding?: number | google.maps.Padding;

  /**
   * Fired after the polyline(s) for this spec have been drawn on the map.
   * Single-call specs fire it once; per-leg specs fire it once when all
   * succeeded legs have been drawn. Wrappers use it to re-fit the camera
   * with the actual polyline geometry (the points-only bounding box doesn't
   * cover detours, transit lines, etc.).
   */
  onDraw?: () => void;

  /**
   * Fired when NONE of the route's polylines could be drawn (network/API
   * error or empty response). Wrappers use it to show a fallback UI ("route
   * unavailable") without dropping the markers.
   */
  onError?: () => void;
};
