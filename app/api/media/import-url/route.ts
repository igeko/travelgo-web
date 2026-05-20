/**
 * POST /api/media/import-url
 *
 * Download an image from an external URL, upload it to Supabase Storage,
 * and save its metadata. → { data: { storagePath, publicUrl, photoId } }
 *
 * Defenses (all server-side, before any fetch):
 *   1. Auth — valid Supabase session
 *   2. Permission — caller must be owner/editor of tripId
 *   3. SSRF — assertSafeUrl() blocks RFC1918, loopback, IMDS, non-HTTPS, DNS rebinding
 *   4. HEAD probe — Content-Type & Content-Length before download
 *   5. Type — only image/jpeg|png|webp|gif|avif
 *   6. Size — max 10 MB (header + streamed body)
 *
 * Uses dns.promises.lookup() → requires the Node.js runtime.
 */

export const runtime = "nodejs";

import crypto from "crypto";

import { assertSafeUrl, SsrfError } from "@/lib/api/ssrf-guard";
import { route, readJson, ok } from "@/lib/api";
import { requireUser, requireTripEditor } from "@/lib/api/guards";
import { ApiError, badRequest, upstream, internal } from "@/lib/api/errors";
import { getServerClient } from "@/lib/dal/supabase";
import { serverDal } from "@/lib/dal";

// ─── Costanti ─────────────────────────────────────────────────────

const STORAGE_BUCKET = "trip-media";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
  "image/avif": "avif",
};

function normalizeMime(contentType: string | null): string | null {
  if (!contentType) return null;
  return contentType.split(";")[0].trim().toLowerCase();
}

const unsupportedType = (mime: string | null) =>
  new ApiError(
    415,
    "unprocessable",
    `Tipo di file non consentito: ${mime ?? "sconosciuto"}. Usa JPEG, PNG, WebP, GIF o AVIF.`,
  );
const tooLarge = () =>
  new ApiError(413, "unprocessable", "Il file supera la dimensione massima di 10 MB.");

type RequestBody = {
  url?: unknown;
  tripId?: unknown;
  dayId?: unknown;
  activityId?: unknown;
  caption?: unknown;
};

export const POST = route(async ({ req }) => {
  // 1. Auth — reject anonymous early.
  await requireUser();

  // 2. Parse body
  const body = await readJson<RequestBody>(req);
  const rawUrl = typeof body.url === "string" ? body.url.trim() : null;
  const tripId = typeof body.tripId === "string" ? body.tripId.trim() : null;
  const dayId = typeof body.dayId === "string" ? body.dayId.trim() : undefined;
  const activityId = typeof body.activityId === "string" ? body.activityId.trim() : undefined;
  const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 500) : undefined;

  if (!rawUrl) throw badRequest("url è obbligatorio");
  if (!tripId) throw badRequest("tripId è obbligatorio");

  // 3. SSRF guard
  try {
    await assertSafeUrl(rawUrl);
  } catch (err) {
    if (err instanceof SsrfError) throw badRequest(err.message);
    throw err;
  }

  // 4. Permission — owner/editor of the trip
  await requireTripEditor(tripId);

  // 5. HEAD probe — validate Content-Type / Content-Length before download
  try {
    const headRes = await fetch(rawUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (headRes.ok) {
      const mime = normalizeMime(headRes.headers.get("content-type"));
      if (mime && !ALLOWED_MIME_TYPES.has(mime)) throw unsupportedType(mime);
      const length = headRes.headers.get("content-length");
      if (length && parseInt(length, 10) > MAX_BYTES) throw tooLarge();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // HEAD unsupported or timed out — fall through to GET
  }

  // 6. Download with timeout + size cap
  let imageBuffer: Buffer;
  let finalMime: string;
  try {
    const getRes = await fetch(rawUrl, {
      method: "GET",
      signal: AbortSignal.timeout(30_000),
      redirect: "follow",
    });
    if (!getRes.ok) throw upstream(`Impossibile scaricare l'immagine (HTTP ${getRes.status}).`);

    const mime = normalizeMime(getRes.headers.get("content-type"));
    if (!mime || !ALLOWED_MIME_TYPES.has(mime)) throw unsupportedType(mime);
    finalMime = mime;

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const reader = getRes.body?.getReader();
    if (!reader) throw upstream("Impossibile leggere il corpo della risposta.");

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BYTES) {
        reader.cancel();
        throw tooLarge();
      }
      chunks.push(Buffer.from(value));
    }
    imageBuffer = Buffer.concat(chunks);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error("[media/import-url] fetch error:", err);
    throw upstream("Impossibile scaricare il file dall'URL fornito.");
  }

  // 7. Upload to Supabase Storage
  const ext = MIME_TO_EXT[finalMime] ?? "bin";
  const storagePath = `trips/${tripId}/imported/${crypto.randomUUID()}.${ext}`;
  const supabase = await getServerClient();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, imageBuffer, { contentType: finalMime, upsert: false });
  if (uploadError) {
    console.error("[media/import-url] storage upload error:", uploadError);
    throw internal("Errore durante il salvataggio del file.");
  }

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  // 8. Photo metadata row
  const dal = await serverDal();
  const { data: photoRow, error: dbError } = await dal.photos.create({
    trip_id: tripId,
    storage_path: storagePath,
    day_id: dayId ?? null,
    activity_id: activityId ?? null,
    caption: caption ?? null,
  });
  if (dbError || !photoRow) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    console.error("[media/import-url] db insert error:", dbError);
    throw internal("Errore durante il salvataggio dei metadati.");
  }

  return ok({ storagePath, publicUrl: urlData.publicUrl, photoId: photoRow.id });
});
