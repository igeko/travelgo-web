import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placeDetails } from "@/lib/maps/provider";

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

  if (!mapsConfigured()) {
    console.error("[places/details] maps provider is not configured");
    return NextResponse.json(
      { error: "Places API not configured" },
      { status: 500 },
    );
  }

  // Place details (address, coords) are very stable — cache aggressively.
  // Only fetch the fields we actually use — reduces billing cost.
  const res = await placeDetails(
    {
      place_id: placeId,
      language: "en",
      fields: "formatted_address,geometry/location,address_components,name",
    },
    86400,
  );

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
