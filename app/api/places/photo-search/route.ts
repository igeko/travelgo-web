import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placesTextSearch, placeDetails } from "@/lib/maps/provider";

/**
 * GET /api/places/photo-search?q=<query>
 *
 * 1. Text Search  → place_id del top result
 * 2. Place Details → tutti i campi arricchiti + photo_references
 *
 * Ritorna PlaceEnriched con tutto ciò che serve alla card Go.
 */

export type PlaceEnriched = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;          // 0-4
  openNow?: boolean;
  weekdayText?: string[];       // ["Monday: 9:00 AM – 9:00 PM", ...]
  website?: string;
  types?: string[];             // ["museum", "tourist_attraction", ...]
  editorialSummary?: string;
  photoRefs: string[];          // fino a 5 photo_reference
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });

  if (!mapsConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  /* ── Step 1: Text Search → place_id ── */
  const searchRes = await placesTextSearch({ query: q, language: "en" }, 86400);
  if (!searchRes.ok) return NextResponse.json({ error: "Text Search upstream error" }, { status: 502 });

  const searchData = await searchRes.json();
  const placeId = searchData.results?.[0]?.place_id as string | undefined;
  if (!placeId) return NextResponse.json({});

  /* ── Step 2: Place Details → tutti i campi ── */
  const detailRes = await placeDetails(
    {
      place_id: placeId,
      language: "en",
      fields: [
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
        "types",
        "editorial_summary",
        "photos",
      ].join(","),
    },
    86400,
  );
  if (!detailRes.ok) return NextResponse.json({ error: "Place Details upstream error" }, { status: 502 });

  const detailData = await detailRes.json();
  const r = detailData.result;
  if (!r) return NextResponse.json({});

  const place: PlaceEnriched = {
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
    types: r.types,
    editorialSummary: r.editorial_summary?.overview,
    // Fino a 5 foto
    photoRefs: (r.photos ?? []).slice(0, 5).map((p: { photo_reference: string }) => p.photo_reference),
  };

  return NextResponse.json({ place });
}
