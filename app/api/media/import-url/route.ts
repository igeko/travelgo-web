import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getServerClient } from "@/lib/dal/supabase";
import { requireTripEditor } from "@/lib/dal/auth";

/**
 * POST /api/media/import-url
 *
 * Downloads an image from an external source (Google Places photo reference
 * or arbitrary HTTPS URL) and uploads it to Supabase Storage.
 *
 * Body:
 *   photoRef?    — Google Places photo_reference (preferred for Places images)
 *   sourceUrl?   — Any HTTPS URL to fetch (used for AI-suggested images, etc.)
 *   bucket       — Supabase Storage bucket name (e.g. "trip-media")
 *   storagePath  — Destination path inside the bucket (e.g. "trips/{id}/activities/{id}/hero.webp")
 *   tripId       — Used for authorization (user must be editor of this trip)
 *   compress?    — { maxWidth, maxHeight, quality } — defaults: 1200 × 900 @ 0.88 WebP
 *
 * The image is always converted to WebP server-side via sharp (same behaviour as
 * the client-side Canvas compression in ImagePicker, but without browser round-trips).
 *
 * Response:
 *   { publicUrl, storagePath, width, height, originalBytes, compressedBytes }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { photoRef, sourceUrl, bucket, storagePath, tripId, compress } = body as {
    photoRef?: string;
    sourceUrl?: string;
    bucket?: string;
    storagePath?: string;
    tripId?: string;
    compress?: { maxWidth?: number; maxHeight?: number; quality?: number };
  };

  /* ── Validate required fields ── */
  if (!bucket || !storagePath || !tripId) {
    return NextResponse.json(
      { error: "bucket, storagePath and tripId are required" },
      { status: 400 },
    );
  }
  if (!photoRef && !sourceUrl) {
    return NextResponse.json(
      { error: "Either photoRef or sourceUrl is required" },
      { status: 400 },
    );
  }

  /* ── Auth: user must be editor of this trip ── */
  const auth = await requireTripEditor(tripId);
  if (!auth.ok) return auth.response;

  /* ── Security: storagePath must be scoped to this trip ── */
  if (!storagePath.startsWith(`trips/${tripId}/`)) {
    return NextResponse.json(
      { error: "storagePath must be scoped to the requesting trip" },
      { status: 403 },
    );
  }

  /* ── Fetch image bytes ── */
  let imageBuffer: ArrayBuffer;
  let contentType: string;

  if (photoRef) {
    /* Google Places photo — call the API directly with the server-side key */
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 });
    }
    const googleUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
    googleUrl.searchParams.set("photo_reference", photoRef);
    googleUrl.searchParams.set("maxwidth", "1200"); // good quality for storage
    googleUrl.searchParams.set("key", apiKey);

    const res = await fetch(googleUrl.toString(), { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch photo from Google" }, { status: 502 });
    }
    contentType = res.headers.get("content-type") ?? "image/jpeg";
    imageBuffer = await res.arrayBuffer();
  } else {
    /* Generic URL — only allow HTTPS to prevent SSRF against internal services */
    if (!sourceUrl!.startsWith("https://")) {
      return NextResponse.json(
        { error: "sourceUrl must use HTTPS" },
        { status: 400 },
      );
    }
    const res = await fetch(sourceUrl!, { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${res.status}` }, { status: 502 });
    }
    contentType = res.headers.get("content-type") ?? "image/jpeg";
    // Only accept image content types
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "sourceUrl must point to an image" },
        { status: 400 },
      );
    }
    imageBuffer = await res.arrayBuffer();
  }

  /* ── Compress → WebP via sharp ── */
  const maxWidth  = compress?.maxWidth  ?? 1200;
  const maxHeight = compress?.maxHeight ?? 900;
  const quality   = Math.round((compress?.quality ?? 0.88) * 100); // sharp uses 1-100

  const originalBytes = imageBuffer.byteLength;

  const pipeline = sharp(Buffer.from(imageBuffer))
    .rotate()                            // auto-orient from EXIF
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,          // never upscale
    })
    .webp({ quality });

  const { data: webpBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  /* ── Upload to Supabase Storage ── */
  const supabase = await getServerClient();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  /* ── Build public URL ── */
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return NextResponse.json({
    publicUrl: urlData.publicUrl,
    storagePath,
    width: info.width,
    height: info.height,
    originalBytes,
    compressedBytes: info.size,
  });
}
