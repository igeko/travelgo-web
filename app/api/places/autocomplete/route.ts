import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placesAutocomplete } from "@/lib/maps/provider";

/**
 * GET /api/places/autocomplete?input=<query>
 *
 * Proxies the Google Places Autocomplete API so the API key never
 * reaches the browser. Returns a list of place suggestions.
 */
export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input")?.trim();
  const types = req.nextUrl.searchParams.get("types")?.trim();

  if (!input || input.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  if (!mapsConfigured()) {
    console.error("[places/autocomplete] maps provider is not configured");
    return NextResponse.json(
      { error: "Places API not configured" },
      { status: 500 },
    );
  }

  // Autocomplete results are stable for a few minutes; cache to reduce billing.
  const res = await placesAutocomplete(
    {
      input,
      // Caller-specified types if provided, else default to geocode|establishment
      types: types ?? "geocode|establishment",
      language: "en",
    },
    3600,
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Upstream error from Google Places" },
      { status: 502 },
    );
  }

  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    // Log internally only — never echo Google's raw payload back to the client.
    console.error("[places/autocomplete] Google status:", data.status);
    return NextResponse.json(
      { error: "Places lookup failed", googleStatus: data.status },
      { status: 502 },
    );
  }

  // Shape returned to the client — only what the UI needs
  const suggestions = (data.predictions ?? []).map(
    (p: {
      place_id: string;
      description: string;
      structured_formatting: { main_text: string; secondary_text: string };
    }) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
    }),
  );

  return NextResponse.json({ suggestions });
}
