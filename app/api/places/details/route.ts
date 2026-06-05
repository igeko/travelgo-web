import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placeDetailsV1 } from "@/lib/maps/provider";

/**
 * GET /api/places/details?placeId=<id>
 *
 * Proxies the Google Place Details API (v1). Returns the structured
 * address, coordinates and address components for a given place_id in the
 * same `{ place: { formatted, name, placeId, lat, lng, components } }` shape
 * the frontend (`lib/client/places.ts`, `AddressField`) expects.
 */

type V1AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type V1PlaceDetails = {
  id?: string;
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  addressComponents?: V1AddressComponent[];
};

// Field mask owned by the route, passed to the provider. Keep it tight to
// reduce billing — see https://developers.google.com/maps/documentation/places/web-service/place-details
const FIELD_MASK = "id,displayName,formattedAddress,location,addressComponents";

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
  const res = await placeDetailsV1(placeId, FIELD_MASK, {
    languageCode: "en",
    revalidate: 86400,
  });

  if (!res.ok) {
    // v1 returns non-2xx HTTP for errors (no `status: REQUEST_DENIED` envelope).
    let upstreamMessage = "";
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      upstreamMessage = errBody.error?.message ?? "";
    } catch {
      // ignore — best-effort log only
    }
    console.error("[places/details] upstream error:", res.status, upstreamMessage);
    return NextResponse.json(
      { error: "Upstream error from Google Places" },
      { status: 502 },
    );
  }

  const data = (await res.json()) as V1PlaceDetails;

  // Flatten addressComponents into a simple Record<type, longText>
  // e.g. { locality: "Tokyo", country: "Japan", postal_code: "100-0001", … }.
  // Note: legacy was `long_name`/`types`, v1 is `longText`/`types`. The
  // `types[]` strings (locality, country, postal_code, …) are unchanged.
  const components: Record<string, string> = {};
  for (const comp of data.addressComponents ?? []) {
    const longText = comp.longText ?? "";
    for (const type of comp.types ?? []) {
      components[type] = longText;
    }
  }

  return NextResponse.json({
    place: {
      formatted: data.formattedAddress ?? "",
      name: data.displayName?.text ?? "",
      placeId,
      lat: data.location?.latitude ?? 0,
      lng: data.location?.longitude ?? 0,
      components,
    },
  });
}
