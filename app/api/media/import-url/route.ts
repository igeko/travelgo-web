/**
 * POST /api/media/import-url
 *
 * Scarica un'immagine da URL esterno e la carica su Supabase Storage.
 * Protegge da SSRF, content-type spoofing e DoS da payload giganti.
 *
 * Body JSON:
 *   url         string   — URL pubblico dell'immagine (HTTPS obbligatorio)
 *   tripId      string   — viaggio a cui associare la foto
 *   dayId?      string   — giorno opzionale
 *   activityId? string   — attività opzionale
 *   caption?    string   — didascalia opzionale
 *
 * Risposta:
 *   { storagePath, publicUrl, photoId }
 *
 * Difese implementate (tutte server-side, prima di qualsiasi fetch):
 *   1. Auth  — sessione Supabase valida (+ il middleware la verifica in ingresso)
 *   2. Permessi — l'utente deve essere owner/editor del tripId
 *   3. SSRF  — assertSafeUrl() blocca RFC1918, loopback, IMDS (169.254.x),
 *              IPv6 link-local/ULA, schema non-HTTPS, DNS rebinding
 *   4. HEAD probe — controlla Content-Type e Content-Length prima del download
 *   5. Tipo  — solo image/jpeg, image/png, image/webp, image/gif, image/avif
 *   6. Dimensione — max 10 MB (controllata sia sull'header che sul body scaricato)
 *   7. Re-check — il Content-Type del body scaricato viene ri-validato
 *
 * NOTA: usa dns.promises.lookup() → richiede Node.js runtime.
 */

export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";

import { assertSafeUrl, SsrfError } from "@/lib/api/ssrf-guard";
import { requireTripEditor } from "@/lib/dal/auth";
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

// ─── Helpers ──────────────────────────────────────────────────────

function normalizeMime(contentType: string | null): string | null {
  if (!contentType) return null;
  // Rimuove parametri tipo "image/jpeg; charset=..." → "image/jpeg"
  return contentType.split(";")[0].trim().toLowerCase();
}

// ─── Handler ──────────────────────────────────────────────────────

type RequestBody = {
  url?: unknown;
  tripId?: unknown;
  dayId?: unknown;
  activityId?: unknown;
  caption?: unknown;
};

export async function POST(req: Request) {
  // 1. Auth — getUser() verifica il JWT lato server
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : null;
  const tripId = typeof body.tripId === "string" ? body.tripId.trim() : null;
  const dayId =
    typeof body.dayId === "string" ? body.dayId.trim() : undefined;
  const activityId =
    typeof body.activityId === "string" ? body.activityId.trim() : undefined;
  const caption =
    typeof body.caption === "string"
      ? body.caption.trim().slice(0, 500)
      : undefined;

  if (!rawUrl) {
    return NextResponse.json({ error: "url è obbligatorio" }, { status: 400 });
  }
  if (!tripId) {
    return NextResponse.json(
      { error: "tripId è obbligatorio" },
      { status: 400 },
    );
  }

  // 3. SSRF guard — lancia SsrfError se l'URL non è sicuro.
  //    Questo blocca: 169.254.169.254, loopback, RFC1918, IPv6 ULA/link-local,
  //    http://, file://, e hostname che risolvono a IP privati (DNS rebinding).
  try {
    await assertSafeUrl(rawUrl);
  } catch (err) {
    if (err instanceof SsrfError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // 4. Permessi — l'utente deve essere owner/editor del viaggio
  const authResult = await requireTripEditor(tripId);
  if (!authResult.ok) return authResult.response;

  // 5. HEAD probe — verifica Content-Type e Content-Length PRIMA di scaricare
  //    il corpo. Se il server non supporta HEAD, procediamo (fallback al GET).
  try {
    const headRes = await fetch(rawUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });

    if (headRes.ok) {
      const mime = normalizeMime(headRes.headers.get("content-type"));
      if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
        return NextResponse.json(
          { error: `Tipo di file non consentito: ${mime}. Usa JPEG, PNG, WebP, GIF o AVIF.` },
          { status: 415 },
        );
      }

      const length = headRes.headers.get("content-length");
      if (length && parseInt(length, 10) > MAX_BYTES) {
        return NextResponse.json(
          { error: "Il file supera la dimensione massima di 10 MB." },
          { status: 413 },
        );
      }
    }
  } catch {
    // HEAD non supportato o timeout — continuiamo con il GET
  }

  // 6. Download — con timeout e limite di dimensione
  let imageBuffer: Buffer;
  let finalMime: string;

  try {
    const getRes = await fetch(rawUrl, {
      method: "GET",
      signal: AbortSignal.timeout(30_000),
      redirect: "follow",
    });

    if (!getRes.ok) {
      return NextResponse.json(
        { error: `Impossibile scaricare l'immagine (HTTP ${getRes.status}).` },
        { status: 502 },
      );
    }

    // Re-check Content-Type sul body reale (può differire dall'HEAD)
    const mime = normalizeMime(getRes.headers.get("content-type"));
    if (!mime || !ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json(
        {
          error: `Tipo di file non consentito: ${mime ?? "sconosciuto"}. Usa JPEG, PNG, WebP, GIF o AVIF.`,
        },
        { status: 415 },
      );
    }
    finalMime = mime;

    // Lettura con limite di dimensione — non carichiamo tutto in memoria
    // se il file è troppo grande.
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const reader = getRes.body?.getReader();

    if (!reader) {
      return NextResponse.json(
        { error: "Impossibile leggere il corpo della risposta." },
        { status: 502 },
      );
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BYTES) {
        reader.cancel();
        return NextResponse.json(
          { error: "Il file supera la dimensione massima di 10 MB." },
          { status: 413 },
        );
      }
      chunks.push(Buffer.from(value));
    }

    imageBuffer = Buffer.concat(chunks);
  } catch (err) {
    if (err instanceof SsrfError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[media/import-url] fetch error:", err);
    return NextResponse.json(
      { error: "Impossibile scaricare il file dall'URL fornito." },
      { status: 502 },
    );
  }

  // 7. Upload su Supabase Storage
  const ext = MIME_TO_EXT[finalMime] ?? "bin";
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `trips/${tripId}/imported/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, imageBuffer, {
      contentType: finalMime,
      upsert: false,
    });

  if (uploadError) {
    console.error("[media/import-url] storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Errore durante il salvataggio del file." },
      { status: 500 },
    );
  }

  // 8. URL pubblico
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // 9. Metadati foto nel DB
  const dal = await serverDal();
  const { data: photoRow, error: dbError } = await dal.photos.create({
    trip_id: tripId,
    storage_path: storagePath,
    day_id: dayId ?? null,
    activity_id: activityId ?? null,
    caption: caption ?? null,
  });

  if (dbError || !photoRow) {
    // Upload riuscito ma metadati falliti — pulizia orphan file
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    console.error("[media/import-url] db insert error:", dbError);
    return NextResponse.json(
      { error: "Errore durante il salvataggio dei metadati." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    storagePath,
    publicUrl,
    photoId: photoRow.id,
  });
}
