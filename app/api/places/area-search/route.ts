import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placesSearchTextV1 } from "@/lib/maps/provider";

/**
 * GET /api/places/area-search?query=<term>&lat=<n>&lng=<n>&radius=<m>
 *
 * Places API (New) — `places:searchText` con bias circolare (centre + radius),
 * usato dalla Explore toolbar per trovare una categoria nella mappa visibile.
 * Ritorna place leggeri per i marker (niente Details / photo).
 *
 * Nota: si usa Places API (New) perche' la legacy "Places API" (text search)
 * non e' piu' abilitata sulla key del progetto. La legacy stessa e' stata
 * deprecata da Google il 1 marzo 2025 — vedi `lib/maps/provider.ts`.
 */

export type AreaPlace = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  types?: string[];
};

type SearchTextPlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  types?: string[];
};

const FIELD_MASK = "places.id,places.displayName,places.location,places.types";

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

  // `locationRestriction` (vincolo duro) e non `locationBias` (suggerimento
  // soft): query categoriche come "temple church place of worship" sono
  // ambigue globalmente e con `locationBias` Google ritorna spesso match
  // notori fuori dall'area (es. luoghi famosi a Londra) ignorando il
  // suggerimento.
  //
  // `places:searchText` accetta solo `rectangle` come restriction (non
  // `circle`). Derivo un box approssimato dal cerchio: lat_offset =
  // raggio / 111320 m, lng_offset uguale corretto per `cos(lat)`. Gli
  // angoli del box sforano il cerchio di ~√2·raggio, accettabile — la
  // metrica chiave è che la search non possa più finire dall'altra parte
  // del mondo.
  const latOffset = radius / 111320;
  const lngOffset = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  const res = await placesSearchTextV1(
    {
      textQuery: query,
      languageCode: "en",
      maxResultCount: 20,
      locationRestriction: {
        rectangle: {
          low: { latitude: lat - latOffset, longitude: lng - lngOffset },
          high: { latitude: lat + latOffset, longitude: lng + lngOffset },
        },
      },
    },
    FIELD_MASK,
    3600,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[area-search] upstream error", res.status, body.slice(0, 300));
    return NextResponse.json({ error: "searchText upstream error" }, { status: 502 });
  }

  const data = (await res.json()) as { places?: SearchTextPlace[] };
  const places: AreaPlace[] = (data.places ?? [])
    .map((r) => ({
      placeId: r.id ?? "",
      name: r.displayName?.text ?? "",
      lat: r.location?.latitude ?? 0,
      lng: r.location?.longitude ?? 0,
      types: r.types,
    }))
    .filter((p) => p.placeId && p.lat && p.lng);

  return NextResponse.json({ places });
}
