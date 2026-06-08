import { NextRequest, NextResponse } from "next/server";
import { clampInt } from "@/lib/api/validation";
import { mapsConfigured, placePhoto, placePhotoV1 } from "@/lib/maps/provider";

/**
 * GET /api/places/photo?ref=<ref>&maxwidth=<n>
 *
 * Proxy photo Places. Accetta DUE formati di `ref`:
 *  - v1 (default oggi): `places/{placeId}/photos/{photoId}` — il `name`
 *    restituito da Place Details v1. Routing via `placePhotoV1`.
 *  - legacy: opaco `[A-Za-z0-9_-]+` — `photo_reference` legacy. Mantenuto
 *    finché restano in giro vecchie cache; nuove call dovrebbero arrivare
 *    sempre col formato v1.
 *
 * Entrambi gli endpoint Google rispondono con un 302 redirect alla CDN;
 * seguiamo il redirect e stream-iamo il binary indietro al client.
 */
const V1_RE = /^places\/[A-Za-z0-9_-]{1,200}\/photos\/[A-Za-z0-9_-]{1,400}$/;
const LEGACY_RE = /^[A-Za-z0-9_-]{1,500}$/;

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  // Clamp maxwidth: difende il billing da richieste 99999px.
  const maxwidth = clampInt(req.nextUrl.searchParams.get("maxwidth"), 80, 1600, 800);

  if (!ref) return NextResponse.json({ error: "Invalid ref" }, { status: 400 });
  if (!mapsConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  let res: Response;
  if (V1_RE.test(ref)) {
    res = await placePhotoV1(ref, maxwidth);
  } else if (LEGACY_RE.test(ref)) {
    res = await placePhoto({ photo_reference: ref, maxwidth: String(maxwidth) });
  } else {
    return NextResponse.json({ error: "Invalid ref" }, { status: 400 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Photo not found" }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400", // 24h: photo names sono stabili
    },
  });
}
