import { NextRequest, NextResponse } from "next/server";

/* ─────────────────────────────────────────────────────────────────
   POST /api/routes
   Body: { points: { lat: number; lng: number }[], travelMode: string }

   Proxies the Google Routes API (computeRoutes) so the server-side
   key never reaches the browser.

   Returns:
     { polyline: string }   — encoded polyline of the full route
   or
     { error: string }      — on failure
───────────────────────────────────────────────────────────────── */

type LatLng = { lat: number; lng: number };

type RequestBody = {
  points: LatLng[];
  travelMode?: string;
};

// Maps our prop values to Routes API travel mode strings
const TRAVEL_MODE_MAP: Record<string, string> = {
  WALKING:   "WALK",
  DRIVING:   "DRIVE",
  BICYCLING: "BICYCLE",
  TRANSIT:   "TRANSIT",
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Routes API not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { points, travelMode = "WALKING" } = body;

  if (!points || points.length < 2) {
    return NextResponse.json({ error: "At least 2 points required" }, { status: 400 });
  }

  const routesTravelMode = TRAVEL_MODE_MAP[travelMode] ?? "WALK";

  // Build intermediates (all points except first and last)
  const intermediates = points.slice(1, -1).map((p) => ({
    location: { latLng: { latitude: p.lat, longitude: p.lng } },
  }));

  const requestBody = {
    origin: {
      location: { latLng: { latitude: points[0].lat, longitude: points[0].lng } },
    },
    destination: {
      location: {
        latLng: {
          latitude: points[points.length - 1].lat,
          longitude: points[points.length - 1].lng,
        },
      },
    },
    intermediates,
    travelMode: routesTravelMode,
    polylineEncoding: "ENCODED_POLYLINE",
  };

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      // Only request the polyline field — minimizes billing
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[routes] Google Routes API error:", res.status, text);
    return NextResponse.json(
      { error: `Routes API error: ${res.status}` },
      { status: 502 },
    );
  }

  const data = await res.json();
  const encodedPolyline = data?.routes?.[0]?.polyline?.encodedPolyline;

  if (!encodedPolyline) {
    console.error("[routes] No polyline in response:", JSON.stringify(data));
    return NextResponse.json({ error: "No route found" }, { status: 404 });
  }

  return NextResponse.json({ polyline: encodedPolyline });
}
