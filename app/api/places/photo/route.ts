import { NextRequest, NextResponse } from "next/server";
import { clampInt } from "@/lib/api/validation";
import { mapsConfigured, placePhoto } from "@/lib/maps/provider";

/**
 * GET /api/places/photo?ref=<photo_reference>&maxwidth=<n>
 *
 * Proxies Google Place Photos API.
 * Google redirects to the actual image URL — we follow the redirect
 * and return the final URL to the client (avoids exposing the API key).
 */
const REF_RE = /^[A-Za-z0-9_-]{1,500}$/;

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  // Clamp maxwidth so users can't request 99999px and burn billing.
  const maxwidth = String(clampInt(req.nextUrl.searchParams.get("maxwidth"), 80, 1600, 800));

  if (!ref || !REF_RE.test(ref)) {
    return NextResponse.json({ error: "Invalid ref" }, { status: 400 });
  }

  if (!mapsConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  // Google Place Photos returns a 302 redirect to the actual image.
  // The adapter follows it; we stream the image back to the client.
  const res = await placePhoto({ photo_reference: ref, maxwidth });

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
