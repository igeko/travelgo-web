/**
 * lib/maps/provider.ts
 * ─────────────────────────────────────────────────────────────────
 * Single entry point for the server-side maps/places provider
 * (currently Google Maps Platform). Centralizes the API key, the
 * hostnames/paths and the auth styles so no route handler
 * references a Google URL, the key, or `X-Goog-*` headers directly.
 *
 * Swapping provider (Mapbox, a gateway, …) happens here only — the
 * route handlers keep owning request parsing, response shaping, caching
 * policy and HTTP status mapping. This is a thin adapter: it returns the
 * raw `Response`; it does not invent a provider-neutral result shape.
 *
 * Three auth styles are hidden here:
 *  - Places web service (legacy) → key as a `?key=` query param
 *  - Places API v1               → key as `X-Goog-Api-Key` header (+ field mask on details)
 *  - Routes API                  → key as `X-Goog-Api-Key` header + field mask
 *
 * Note on the autocomplete + details path: those two methods now target the
 * new Places API v1 (`places.googleapis.com`) because the project key is no
 * longer authorized on the legacy "Places API" service. The other Places
 * methods (`placesTextSearch`, `placePhoto`) still hit the legacy endpoints
 * and are owed a follow-up migration.
 *
 * Server-only. Do not import from client components.
 * ─────────────────────────────────────────────────────────────────
 */

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const PLACES_V1_BASE = "https://places.googleapis.com/v1";
const ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

/**
 * Whether the provider is configured. Check this in handlers that return
 * a graceful "not configured" response before calling an adapter method.
 */
export function mapsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

function requireKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return key;
}

/** Query params for a Places web-service GET (the key is added here). */
type PlacesParams = Record<string, string>;

function placesRequest(
  path: string,
  params: PlacesParams,
  init?: RequestInit & { next?: { revalidate: number } },
): Promise<Response> {
  const url = new URL(`${PLACES_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", requireKey());
  return fetch(url.toString(), init);
}

/**
 * POST places.googleapis.com/v1/places:autocomplete (Places API v1).
 *
 * `body` is forwarded as the JSON request body. Caller controls shape
 * (`input`, `languageCode`, optional `includedPrimaryTypes`, …). The new API
 * authenticates via `X-Goog-Api-Key` header — no key in the URL.
 */
export function placesAutocomplete(body: unknown, revalidate?: number): Promise<Response> {
  return fetch(`${PLACES_V1_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": requireKey(),
    },
    body: JSON.stringify(body),
    ...(revalidate != null ? { next: { revalidate } } : {}),
  });
}

/**
 * GET places.googleapis.com/v1/places/{placeId} (Places API v1).
 *
 * Caller supplies the field mask (e.g. `id,displayName,formattedAddress,
 * location,addressComponents`) which is sent via the `X-Goog-FieldMask`
 * header. Auth is via `X-Goog-Api-Key`.
 */
export function placeDetailsV1(
  placeId: string,
  fieldMask: string,
  opts?: { languageCode?: string; revalidate?: number },
): Promise<Response> {
  const url = new URL(`${PLACES_V1_BASE}/places/${encodeURIComponent(placeId)}`);
  if (opts?.languageCode) url.searchParams.set("languageCode", opts.languageCode);
  return fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": requireKey(),
      "X-Goog-FieldMask": fieldMask,
    },
    ...(opts?.revalidate != null ? { next: { revalidate: opts.revalidate } } : {}),
  });
}

/**
 * GET place/details/json (legacy Places web service).
 *
 * Still used by the enriched / photo-search routes and `lib/maps/places.ts`,
 * which read `result.{name,formatted_address,…}` shapes. These callers will
 * need to be migrated to `placeDetailsV1` separately; this function is kept
 * intact so the autocomplete + details migration doesn't cascade.
 */
export function placeDetails(params: PlacesParams, revalidate?: number): Promise<Response> {
  return placesRequest("details/json", params, revalidate != null ? { next: { revalidate } } : undefined);
}

/** GET place/textsearch/json */
export function placesTextSearch(params: PlacesParams, revalidate?: number): Promise<Response> {
  return placesRequest("textsearch/json", params, revalidate != null ? { next: { revalidate } } : undefined);
}

/** GET place/photo — Google 302-redirects to the actual image; follow it. */
export function placePhoto(params: PlacesParams): Promise<Response> {
  return placesRequest("photo", params, { redirect: "follow" });
}

/** POST routes:computeRoutes with the given request body + field mask. */
export function computeRoutes(body: unknown, fieldMask: string): Promise<Response> {
  return fetch(ROUTES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": requireKey(),
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}
