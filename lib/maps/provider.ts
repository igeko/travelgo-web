/**
 * lib/maps/provider.ts
 * ─────────────────────────────────────────────────────────────────
 * Single entry point for the server-side maps/places provider
 * (currently Google Maps Platform). Centralizes the API key, the
 * hostnames/paths and the two auth styles so no route handler
 * references a Google URL, the key, or `X-Goog-*` headers directly.
 *
 * Swapping provider (Mapbox, a gateway, …) happens here only — the
 * route handlers keep owning request parsing, response shaping, caching
 * policy and HTTP status mapping. This is a thin adapter: it returns the
 * raw `Response`; it does not invent a provider-neutral result shape.
 *
 * Two auth styles are hidden here:
 *  - Places web service → key as a `?key=` query param
 *  - Routes API         → key as the `X-Goog-Api-Key` header + field mask
 *
 * Server-only. Do not import from client components.
 * ─────────────────────────────────────────────────────────────────
 */

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
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

/** GET place/autocomplete/json — `revalidate` (s) enables Next caching. */
export function placesAutocomplete(params: PlacesParams, revalidate?: number): Promise<Response> {
  return placesRequest("autocomplete/json", params, revalidate != null ? { next: { revalidate } } : undefined);
}

/** GET place/details/json */
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
