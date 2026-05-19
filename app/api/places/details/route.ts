import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/places/details?placeId=<id>
 *
 * Proxies the Google Place Details API. Returns the structured
 * address, coordinates and address components for a given place_id.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim();

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("[places/details] GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json(
      { error: "Places API not configured" },
      { status: 500 },
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "en");
  // Only fetch the fields we actually use — reduces billing cost
  url.searchParams.set(
    "fields",
    "formatted_address,geometry/location,address_components,name",
  );

  // Place details (address, coords) are very stable — cache aggressively.
  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Upstream error from Google Places" },
      { status: 502 },
    );
  }

  const data = await res.json();

  if (data.status !== "OK") {
    console.error("[places/details] Google error:", data.status, data.error_message);
    return NextResponse.json(
      { error: data.error_message ?? data.status },
      { status: 502 },
    );
  }

  const r = data.result;

  // Flatten address_components into a simple Record<type, long_name>
  // e.g. { locality: "Tokyo", country: "Japan", postal_code: "100-0001", … }
  const components: Record<string, string> = {};
  for (const comp of r.address_components ?? []) {
    for (const type of comp.types as string[]) {
      components[type] = comp.long_name;
    }
  }

  return NextResponse.json({
    place: {
      formatted: r.formatted_address as string,
      name: (r.name as string) ?? "",
      placeId,
      lat: r.geometry.location.lat as number,
      lng: r.geometry.location.lng as number,
      components,
    },
  });
}
