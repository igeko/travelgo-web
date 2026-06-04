/**
 * lib/maps/places.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared "find a place and enrich it" helper over the Places web service:
 * Text Search (by free-text query) → Place Details (rich fields). Used by the
 * Go deep-dive and reusable by the place preview routes.
 *
 * Server-only — the Google key lives in the provider. Returns null when Maps
 * isn't configured or no place matches, so callers can degrade gracefully.
 * ─────────────────────────────────────────────────────────────────
 */
import { mapsConfigured, placeDetails, placesTextSearch } from "./provider";

export type PlaceInfo = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number; // 0–4
  openNow?: boolean;
  weekdayText?: string[];
  website?: string;
  phone?: string;
  googleMapsUri?: string;
  types?: string[];
  editorialSummary?: string;
  photoRefs: string[];
};

const DETAIL_FIELDS = [
  "place_id",
  "name",
  "formatted_address",
  "geometry/location",
  "rating",
  "user_ratings_total",
  "price_level",
  "opening_hours/open_now",
  "opening_hours/weekday_text",
  "website",
  "formatted_phone_number",
  "url",
  "types",
  "editorial_summary",
  "photos",
].join(",");

/**
 * Resolve a free-text query (e.g. "Aker Brygge, Oslo") to an enriched place,
 * or null. Cached for a day at the HTTP layer. Never throws — upstream issues
 * resolve to null so the caller's primary content still renders.
 */
export async function searchEnrichedPlace(query: string, language = "en"): Promise<PlaceInfo | null> {
  if (!mapsConfigured() || !query.trim()) return null;
  try {
    const searchRes = await placesTextSearch({ query, language }, 86400);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const placeId = searchData.results?.[0]?.place_id as string | undefined;
    if (!placeId) return null;

    const detailRes = await placeDetails({ place_id: placeId, language, fields: DETAIL_FIELDS }, 86400);
    if (!detailRes.ok) return null;
    const r = (await detailRes.json()).result;
    if (!r) return null;

    return {
      placeId,
      name: r.name ?? "",
      address: r.formatted_address ?? "",
      lat: r.geometry?.location?.lat ?? 0,
      lng: r.geometry?.location?.lng ?? 0,
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
      priceLevel: r.price_level,
      openNow: r.opening_hours?.open_now,
      weekdayText: r.opening_hours?.weekday_text,
      website: r.website,
      phone: r.formatted_phone_number,
      googleMapsUri: r.url,
      types: r.types,
      editorialSummary: r.editorial_summary?.overview,
      photoRefs: (r.photos ?? []).slice(0, 5).map((p: { photo_reference: string }) => p.photo_reference),
    };
  } catch {
    return null;
  }
}
