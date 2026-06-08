import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placeDetailsV1 } from "@/lib/maps/provider";
import type { PlaceEnriched } from "../photo-search/route";

/**
 * GET /api/places/enriched?placeId=<id>
 *
 * Place Details with the rich fields used by the hover/preview card (rating,
 * price, hours, photos, editorial summary…), via the Places API v1 — the legacy
 * Places web service is no longer authorized on the project (see the note in
 * `lib/maps/provider.ts`).
 *
 * Photos: v1 ritorna `name` nel formato `places/{placeId}/photos/{photoId}`.
 * Il proxy `/api/places/photo` ora supporta questo formato e lo gira a
 * `placePhotoV1`, quindi esponiamo i primi 5 nomi come `photoRefs` come
 * faceva il legacy. PlaceHoverCard li passa a `api.places.photoUrl(ref)`
 * che costruisce `/api/places/photo?ref={name}` e riceve il binary.
 */

type V1OpeningHours = {
  openNow?: boolean;
  weekdayDescriptions?: string[];
};

type V1PlaceDetails = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  // v1 returns a string enum (PRICE_LEVEL_INEXPENSIVE…); the card expects a
  // 0–4 number, so we map below.
  priceLevel?: string;
  regularOpeningHours?: V1OpeningHours;
  currentOpeningHours?: V1OpeningHours;
  websiteUri?: string;
  types?: string[];
  editorialSummary?: { text?: string };
  photos?: Array<{ name?: string }>;
};

// Field mask owned by the route. Keep tight to reduce billing.
const FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "regularOpeningHours.openNow",
  "regularOpeningHours.weekdayDescriptions",
  "currentOpeningHours.openNow",
  "websiteUri",
  "types",
  "editorialSummary",
  "photos.name",
].join(",");

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  if (!mapsConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const res = await placeDetailsV1(placeId, FIELD_MASK, {
    languageCode: "en",
    revalidate: 86400,
  });

  if (!res.ok) {
    let upstreamMessage = "";
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      upstreamMessage = errBody.error?.message ?? "";
    } catch {
      /* best-effort log */
    }
    console.error("[places/enriched] upstream error:", res.status, upstreamMessage);
    return NextResponse.json({ error: "Place Details upstream error" }, { status: 502 });
  }

  const r = (await res.json()) as V1PlaceDetails;
  if (!r.id) return NextResponse.json({});

  // Prefer `currentOpeningHours.openNow` (today's signal) when present; fall
  // back to `regularOpeningHours.openNow` (steady-state). `weekdayDescriptions`
  // only comes off the regular hours object in v1.
  const openNow =
    r.currentOpeningHours?.openNow ?? r.regularOpeningHours?.openNow;
  const weekdayText = r.regularOpeningHours?.weekdayDescriptions;

  const place: PlaceEnriched = {
    placeId: r.id,
    name: r.displayName?.text ?? "",
    address: r.formattedAddress ?? "",
    lat: r.location?.latitude ?? 0,
    lng: r.location?.longitude ?? 0,
    rating: r.rating,
    userRatingsTotal: r.userRatingCount,
    priceLevel: r.priceLevel ? PRICE_LEVEL_MAP[r.priceLevel] : undefined,
    openNow,
    weekdayText,
    website: r.websiteUri,
    types: r.types,
    editorialSummary: r.editorialSummary?.text,
    // Photos v1: i `name` arrivano come `places/{placeId}/photos/{photoId}`.
    // Il proxy `/api/places/photo` accetta questo formato; capped a 5 per
    // contenere il payload del card (ne usa solo il primo).
    photoRefs: (r.photos ?? [])
      .map((p) => p.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0)
      .slice(0, 5),
  };

  return NextResponse.json({ place });
}
