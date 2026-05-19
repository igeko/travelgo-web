/**
 * app/api/catalog/import/route.ts
 *
 * POST /api/catalog/import
 *   Body: { jobId }
 *   Response: text/event-stream (SSE)
 *
 * Legge filters, batch_size e import_offset dal job record.
 * Processa il batch corrente, aggiorna import_offset nel DB.
 * Al termine del batch imposta status = 'paused' (o 'done' se finito).
 *
 * SSE events:
 *   { type: 'progress', saved, embedded, batchSaved, total, offset, message }
 *   { type: 'done',     saved, embedded, offset, total, jobId, complete }
 *   { type: 'error',    message }
 *
 * Dati: © OpenStreetMap contributors (ODbL)
 */

import { NextRequest }        from 'next/server';
import { createClient }       from '@supabase/supabase-js';
import OpenAI                 from 'openai';
import { searchPlaces, buildEmbedText, PlaceBasic } from '@/lib/overpass';
import { enrichFromWiki }     from '@/lib/wikipedia';
import { requirePlatformAdmin } from '@/lib/dal/auth';
import { getServerClient }    from '@/lib/dal/supabase';

// ── SSE helper ────────────────────────────────────────────────

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── Supabase admin client ─────────────────────────────────────

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const adminAuth = await requirePlatformAdmin();
  if (!adminAuth.ok) {
    const msg = adminAuth.response.status === 401 ? 'Unauthorized' : 'Forbidden';
    return new Response(sseEvent({ type: 'error', message: msg }), {
      status: adminAuth.response.status, headers: { 'Content-Type': 'text/event-stream' },
    });
  }
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(sseEvent({ type: 'error', message: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // ── Carica job ────────────────────────────────────────────
  const { jobId } = await req.json() as { jobId: string };
  const db = adminDb();

  const { data: job, error: jobErr } = await db
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobErr || !job) {
    return new Response(sseEvent({ type: 'error', message: 'Job non trovato' }), {
      status: 404, headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  if (job.status === 'running') {
    return new Response(sseEvent({ type: 'error', message: 'Job già in esecuzione' }), {
      status: 409, headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // Estrae parametri dal job
  const { location, presetIds, notableOnly, enrichWiki } = job.filters as {
    location:    string;
    presetIds:   string[];
    notableOnly: boolean;
    enrichWiki:  boolean;
  };
  const batchSize:    number  = job.batch_size    ?? 500;
  const importOffset: number  = job.import_offset ?? 0;
  const totalFound:   number  = job.total_found   ?? 0;

  // ── SSE stream ────────────────────────────────────────────
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc    = new TextEncoder();

  const send = async (data: Record<string, unknown>) => {
    try { await writer.write(enc.encode(sseEvent(data))); } catch { /* disconnesso */ }
  };

  // ── Import in background ─────────────────────────────────
  (async () => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const EMBED_BATCH = 100;

    try {
      // Segna running
      await db.from('import_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId);

      await send({
        type: 'progress',
        message: `Scarico elementi ${importOffset + 1}–${importOffset + batchSize} da OpenStreetMap…`,
        saved: 0, embedded: 0, batchSaved: 0, total: totalFound, offset: importOffset,
      });

      // Fetch da Overpass: chiede importOffset + batchSize elementi,
      // poi salta i primi importOffset già processati
      const fetchLimit = Math.min(importOffset + batchSize, totalFound || importOffset + batchSize);
      const allElements: PlaceBasic[] = await searchPlaces({
        location, presetIds, notableOnly,
        limit: fetchLimit,
      });

      // Slice del batch corrente
      const batch = allElements.slice(importOffset, importOffset + batchSize);

      await send({
        type: 'progress',
        message: `${batch.length} elementi da processare in questo batch.`,
        saved: 0, embedded: 0, batchSaved: 0, total: totalFound, offset: importOffset,
      });

      let batchSaved = 0;
      let batchEmbedded = 0;
      const toEmbed: { id: string; text: string }[] = [];

      for (let i = 0; i < batch.length; i++) {
        const p = batch[i];

        let description: string | undefined;
        let coverImage:  string | undefined;
        let wikipedia:   string | undefined;

        if (enrichWiki && (p.tags.wikidata || p.tags.wikipedia)) {
          const wiki = await enrichFromWiki({
            wikipediaTag: p.tags.wikipedia,
            wikidataId:   p.tags.wikidata,
          });
          description = wiki.description;
          coverImage  = wiki.coverImage;
          wikipedia   = wiki.wikipedia;
          await new Promise((r) => setTimeout(r, 100));
        }

        const { data: inserted } = await db
          .from('catalog_places')
          .upsert({
            name:          p.name,
            country:       p.tags['addr:country'] ?? null,
            country_code:  null,
            city:          p.tags['addr:city']    ?? null,
            address:       null,
            category:      p.category,
            kinds:         [p.mainTag, p.category].filter(Boolean),
            description:   description ?? null,
            rating:        null,
            cover_image:   coverImage  ?? null,
            lat:           p.lat,
            lng:           p.lng,
            source:        'osm',
            source_id:     `${p.osmType}/${p.osmId}`,
            wikidata:      p.tags.wikidata  ?? null,
            wikipedia:     wikipedia        ?? null,
            import_job_id: jobId,
          }, { onConflict: 'source,source_id' })
          .select('id')
          .single();

        if (inserted?.id) {
          batchSaved++;
          toEmbed.push({ id: inserted.id, text: buildEmbedText(p, description) });
        }

        // Batch embedding
        if (toEmbed.length >= EMBED_BATCH || (i === batch.length - 1 && toEmbed.length > 0)) {
          try {
            const res = await openai.embeddings.create({
              model: 'text-embedding-3-small', input: toEmbed.map((x) => x.text), dimensions: 512,
            });
            for (let j = 0; j < toEmbed.length; j++) {
              await db.from('catalog_places').update({
                embedding: res.data[j].embedding, embedded_at: new Date().toISOString(),
              }).eq('id', toEmbed[j].id);
            }
            batchEmbedded += toEmbed.length;
          } catch (e) {
            console.warn('[catalog/import] embedding batch fallito:', e);
          }
          toEmbed.length = 0;
        }

        if (i % 10 === 0) {
          await send({
            type: 'progress',
            message: `Importati ${batchSaved}/${batch.length} in questo batch…`,
            saved: batchSaved, embedded: batchEmbedded,
            batchSaved, total: totalFound, offset: importOffset,
          });
        }
      }

      // Nuovo offset dopo questo batch
      const newOffset = importOffset + batch.length;
      const isComplete = newOffset >= totalFound || batch.length < batchSize;

      // Aggiorna totali cumulativi
      const prev = await db.from('import_jobs').select('total_saved,total_embedded').eq('id', jobId).single();
      const prevSaved    = prev.data?.total_saved    ?? 0;
      const prevEmbedded = prev.data?.total_embedded ?? 0;

      await db.from('import_jobs').update({
        status:         isComplete ? 'done' : 'paused',
        import_offset:  newOffset,
        total_saved:    prevSaved    + batchSaved,
        total_embedded: prevEmbedded + batchEmbedded,
        completed_at:   isComplete ? new Date().toISOString() : null,
      }).eq('id', jobId);

      await send({
        type: 'done',
        saved:    batchSaved,
        embedded: batchEmbedded,
        offset:   newOffset,
        total:    totalFound,
        jobId,
        complete: isComplete,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      await db.from('import_jobs').update({ status: 'error' }).eq('id', jobId);
      await send({ type: 'error', message: msg });
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
