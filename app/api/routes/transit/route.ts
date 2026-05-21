import { NextRequest, NextResponse } from "next/server";
import { isLatLng, isPlainObject, parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/api/guards";
import { mapsConfigured, computeRoutes } from "@/lib/maps/provider";
import { normalizeTransitResponse } from "./normalize";

/* ─────────────────────────────────────────────────────────────────
   POST /api/routes/transit
   Body: {
     origin: { lat, lng },
     destination: { lat, lng },
     departureTime?: string   // RFC-3339; defaults to "now" if omitted
   }

   Proxies the Google Routes API (computeRoutes) in TRANSIT mode and
   returns normalized public-transit alternatives, so the server-side
   key never reaches the browser.

   TRANSIT mode notes:
   - intermediates are NOT supported (origin + destination only)
   - computeAlternativeRoutes returns several options to choose from
   - the transitDetails field mask falls under a higher-billing SKU

   Returns:
     { options: TransitOption[] }   — see ./normalize
   or
     { error: string }              — on failure
───────────────────────────────────────────────────────────────── */

const FIELD_MASK = [
  "routes.duration",
  "routes.distanceMeters",
  "routes.polyline.encodedPolyline",
  "routes.legs.steps.travelMode",
  "routes.legs.steps.staticDuration",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.transitDetails",
].join(",");

export async function POST(req: NextRequest) {
  // Auth gate: this proxy hits a higher-billing transit SKU, so don't let
  // anonymous callers spend against the server key.
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mapsConfigured()) {
    return NextResponse.json({ error: "Routes API not configured" }, { status: 500 });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  if (!isPlainObject(parsed.body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { origin, destination, departureTime } = parsed.body;

  if (!isLatLng(origin) || !isLatLng(destination)) {
    return NextResponse.json({ error: "Valid origin and destination required" }, { status: 400 });
  }

  const requestBody: Record<string, unknown> = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode: "TRANSIT",
    computeAlternativeRoutes: true,
    polylineEncoding: "ENCODED_POLYLINE",
  };

  // departureTime must be in the future for the Routes API; ignore otherwise.
  if (typeof departureTime === "string") {
    const t = Date.parse(departureTime);
    if (Number.isFinite(t) && t > Date.now()) {
      requestBody.departureTime = new Date(t).toISOString();
    }
  }

  const res = await computeRoutes(requestBody, FIELD_MASK);

  if (!res.ok) {
    // Avoid logging the raw Google response (may include query params / key fragments)
    console.error("[routes/transit] Google Routes API error status:", res.status);
    return NextResponse.json({ error: `Routes API error: ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  const options = normalizeTransitResponse(data);

  if (options.length === 0) {
    return NextResponse.json({ error: "No transit route found" }, { status: 404 });
  }

  return NextResponse.json({ options });
}
