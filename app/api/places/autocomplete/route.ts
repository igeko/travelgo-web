import { NextRequest, NextResponse } from "next/server";
import { mapsConfigured, placesAutocomplete } from "@/lib/maps/provider";

/**
 * GET /api/places/autocomplete?input=<query>
 *
 * Proxies the Google Places Autocomplete API (v1) so the API key never
 * reaches the browser. Returns a list of place suggestions in the same
 * `{ suggestions: [{ placeId, description, mainText, secondaryText }] }`
 * shape the frontend (`lib/client/places.ts`, `usePlaceAutocomplete`) expects.
 */

type V1Suggestion = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};

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

  // Build the v1 request body.
  // Parity choice: the legacy proxy defaulted to `types=geocode|establishment`,
  // which on v1 has no direct equivalent (each request may carry at most one
  // primary type). v1's default (no `includedPrimaryTypes`) already returns all
  // place types — close enough to the legacy default for our use case, so we
  // omit the field unless the caller passed an explicit non-default `types`.
  const body: Record<string, unknown> = {
    input,
    languageCode: "en",
  };

  if (types && types !== "geocode|establishment") {
    // v1 allows up to 5 primary types but they must all be valid. If the caller
    // passed a single token (e.g. "establishment"), forward it; if it looks
    // composite (pipe/comma separated), be conservative and skip with a warn.
    if (/^[a-z_]+$/.test(types)) {
      body.includedPrimaryTypes = [types];
    } else {
      console.warn("[places/autocomplete] unparseable types param, ignoring:", types);
    }
  }

  // Autocomplete results are stable for a few minutes; cache to reduce billing.
  const res = await placesAutocomplete(body, 3600);

  if (!res.ok) {
    // v1 returns non-2xx HTTP for errors (no `status: REQUEST_DENIED` envelope).
    let upstreamMessage = "";
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      upstreamMessage = errBody.error?.message ?? "";
    } catch {
      // ignore — best-effort log only
    }
    console.error(
      "[places/autocomplete] upstream error:",
      res.status,
      upstreamMessage,
    );
    return NextResponse.json(
      { error: "Upstream error from Google Places" },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { suggestions?: V1Suggestion[] };

  // Shape returned to the client — only what the UI needs.
  const suggestions = (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<V1Suggestion["placePrediction"]> => Boolean(p?.placeId))
    .map((p) => {
      const description = p.text?.text ?? "";
      return {
        placeId: p.placeId as string,
        description,
        mainText: p.structuredFormat?.mainText?.text ?? description,
        secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
      };
    });

  return NextResponse.json({ suggestions });
}
