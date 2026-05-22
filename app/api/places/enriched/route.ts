import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placeDetails } from "@/lib/maps/provider";
import type { PlaceEnriched } from "../photo-search/route";

/**
 * GET /api/places/enriched?placeId=<id>
 *
 * Place Details with the rich fields used by the hover/preview card (rating,
 * price, hours, photos, editorial summary…). Same shape as photo-search but
 * keyed by a known place_id (no Text Search step).
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  if (!mapsConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

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
    photoRefs: (r.photos ?? []).slice(0, 5).map((p: { photo_reference: string }) => p.photo_reference),
  };

  return NextResponse.json({ place });
}
