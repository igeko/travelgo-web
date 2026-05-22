import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placesTextSearch } from "@/lib/maps/provider";

/**
 * GET /api/places/area-search?query=<term>&lat=<n>&lng=<n>&radius=<m>
 *
 * Google Places Text Search biased to a circular area (centre + radius), used
 * by the Explore toolbar to find a category within the currently-visible map.
 * Returns lightweight places for map markers (no Details / photos).
 */

export type AreaPlace = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  types?: string[];
};

type TextSearchResult = {
  place_id?: string;
  name?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  types?: string[];
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const query = sp.get("query")?.trim();
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const radius = Math.min(Math.max(Number(sp.get("radius")) || 0, 1), 50000);

  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  if (!mapsConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const res = await placesTextSearch(
    { query, location: `${lat},${lng}`, radius: String(Math.round(radius)), language: "en" },
    3600,
  );
  if (!res.ok) return NextResponse.json({ error: "Text Search upstream error" }, { status: 502 });

  const data = (await res.json()) as { results?: TextSearchResult[] };
  const places: AreaPlace[] = (data.results ?? [])
    .map((r) => ({
      placeId: r.place_id ?? "",
      name: r.name ?? "",
      lat: r.geometry?.location?.lat ?? 0,
      lng: r.geometry?.location?.lng ?? 0,
      types: r.types,
    }))
    .filter((p) => p.placeId && p.lat && p.lng);

  return NextResponse.json({ places });
}
