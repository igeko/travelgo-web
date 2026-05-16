import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/places/photo?ref=<photo_reference>&maxwidth=<n>
 *
 * Proxies Google Place Photos API.
 * Google redirects to the actual image URL — we follow the redirect
 * and return the final URL to the client (avoids exposing the API key).
 */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  const maxwidth = req.nextUrl.searchParams.get("maxwidth") ?? "800";

  if (!ref) return NextResponse.json({ error: "ref is required" }, { status: 400 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("photo_reference", ref);
  url.searchParams.set("maxwidth", maxwidth);
  url.searchParams.set("key", apiKey);

  // Google Place Photos returns a 302 redirect to the actual image.
  // We follow it and stream the image back to the client.
  const res = await fetch(url.toString(), { redirect: "follow" });

  if (!res.ok) {
    return NextResponse.json({ error: "Photo not found" }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400", // cache 24h — photo refs are stable
    },
  });
}
