import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/places/autocomplete?input=<query>
 *
 * Proxies the Google Places Autocomplete API so the API key never
 * reaches the browser. Returns a list of place suggestions.
 */
export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input")?.trim();

  if (!input || input.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("[places/autocomplete] GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json(
      { error: "Places API not configured" },
      { status: 500 },
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json",
  );
  url.searchParams.set("input", input);
  url.searchParams.set("key", apiKey);
  // Return both addresses and establishments (restaurants, hotels, …)
  url.searchParams.set("types", "geocode|establishment");
  url.searchParams.set("language", "en");

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Upstream error from Google Places" },
      { status: 502 },
    );
  }

  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[places/autocomplete] Google error:", data.status, data.error_message, JSON.stringify(data));
    return NextResponse.json(
      { error: data.error_message ?? data.status, googleStatus: data.status, raw: data },
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
