/**
 * app/api/catalog/import/route.ts
 *
 * POST /api/catalog/import
 *   Body: { location, presetIds, limit, enrichWiki }
 *   Response: text/event-stream (SSE) con aggiornamenti di progresso
 *
 * Il client apre una connessione SSE e riceve eventi:
 *   { type: 'progress', saved, embedded, total, message }
 *   { type: 'done', saved, embedded, jobId, total }
 *   { type: 'error', message }
 *
 * Dati OSM: © OpenStreetMap contributors, licenza ODbL (uso commerciale OK con attribuzione)
 * Enrichment Wikipedia: CC BY-SA 4.0 (uso commerciale OK con attribuzione)
 */

import { NextRequest }         from 'next/server';
import { createClient }        from '@supabase/supabase-js';
import { cookies }             from 'next/headers';
import { createServerClient }  from '@supabase/ssr';
import OpenAI                  from 'openai';
import { searchPlaces, buildEmbedText, PlaceBasic } from '@/lib/overpass';
import { enrichFromWiki }      from '@/lib/wikipedia';

// ── Helpers SSE ──────────────────────────────────────────────

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── Supabase admin client ────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth: solo admin ─────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(sseEvent({ type: 'error', message: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'text/event-stream' },
    });
  }
  const { data: admin } = await supabase
    .from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) {
    return new Response(sseEvent({ type: 'error', message: 'Forbidden' }), {
      status: 403, headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // ── Body ─────────────────────────────────────────────────
  const body = await req.json();
  const {
    location    = '',
    presetIds   = ['attractions'],   // array di OsmPresetId
    limit       = 500,
    enrichWiki  = true,              // se true, arricchisce lazy da Wikipedia/Wikidata
  } = body as {
    location:   string;
    presetIds:  string[];
    limit:      number;
    enrichWiki: boolean;
  };

  if (!location) {
    return new Response(sseEvent({ type: 'error', message: 'location richiesto' }), {
      status: 400, headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // ── SSE stream ───────────────────────────────────────────
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc    = new TextEncoder();

  const send = async (data: Record<string, unknown>) => {
    try { await writer.write(enc.encode(sseEvent(data))); } catch { /* client disconnesso */ }
  };

  // Esegue l'import in background mentre streamma il progresso
  (async () => {
    const db     = getAdminClient();
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const BATCH  = 100; // embedding batch size

    try {
      // 1. Fetch da Overpass
      await send({ type: 'progress', message: `Ricerca "${location}" su OpenStreetMap…`, saved: 0, embedded: 0, total: 0 });

      const allPlaces: PlaceBasic[] = await searchPlaces({
        location,
        presetIds,
        limit: Math.min(limit, 2000),
      });

      await send({
        type: 'progress',
        message: `Trovati ${allPlaces.length} posti OSM.`,
        saved: 0, embedded: 0, total: allPlaces.length,
      });

      // 2. Crea job record
      const { data: job } = await db
        .from('import_jobs')
        .insert({
          status:      'running',
          filters:     { location, presetIds, limit, enrichWiki, source: 'osm' },
          created_by:  user.id,
          started_at:  new Date().toISOString(),
          total_found: allPlaces.length,
        })
        .select('id')
        .single();

      const jobId = job?.id;

      // 3. Per ogni posto: opzionalmente enrichment Wikipedia/Wikidata, upsert, embed
      let saved    = 0;
      let embedded = 0;
      const toEmbed: { id: string; text: string }[] = [];

      for (let i = 0; i < allPlaces.length; i++) {
        const p = allPlaces[i];

        let description: string | undefined;
        let coverImage:  string | undefined;
        let wikipedia:   string | undefined;

        // Enrichment lazy: solo se il posto ha wikidata o wikipedia tag
        if (enrichWiki && (p.tags.wikidata || p.tags.wikipedia)) {
          const wiki = await enrichFromWiki({
            wikipediaTag: p.tags.wikipedia,
            wikidataId:   p.tags.wikidata,
          });
          description = wiki.description;
          coverImage  = wiki.coverImage;
          wikipedia   = wiki.wikipedia;

          // Piccola pausa per non martellare Wikipedia
          await new Promise((r) => setTimeout(r, 100));
        }

        // Upsert in catalog_places
        const { data: inserted } = await db
          .from('catalog_places')
          .upsert({
            name:          p.name,
            country:       p.tags['addr:country'] ?? null,
            country_code:  null,
            city:          p.tags['addr:city'] ?? null,
            address:       null,
            category:      p.category,
            kinds:         [p.mainTag, p.category].filter(Boolean),
            description:   description ?? null,
            rating:        null,
            cover_image:   coverImage ?? null,
            lat:           p.lat,
            lng:           p.lng,
            source:        'osm',
            source_id:     String(p.osmId),
            wikidata:      p.tags.wikidata ?? null,
            wikipedia:     wikipedia ?? null,
            import_job_id: jobId,
          }, { onConflict: 'source,source_id' })
          .select('id')
          .single();

        if (inserted?.id) {
          saved++;
          const embedText = buildEmbedText(p, description);
          toEmbed.push({ id: inserted.id, text: embedText });
        }

        // Batch embedding ogni 100 o all'ultima iterazione
        if (toEmbed.length >= BATCH || (i === allPlaces.length - 1 && toEmbed.length > 0)) {
          await send({
            type: 'progress',
            message: `Generazione embeddings… (${embedded + toEmbed.length}/${saved})`,
            saved, embedded, total: allPlaces.length,
          });

          try {
            const res = await openai.embeddings.create({
              model:      'text-embedding-3-small',
              input:      toEmbed.map((x) => x.text),
              dimensions: 512,
            });

            for (let j = 0; j < toEmbed.length; j++) {
              await db.from('catalog_places').update({
                embedding:   res.data[j].embedding,
                embedded_at: new Date().toISOString(),
              }).eq('id', toEmbed[j].id);
            }
            embedded += toEmbed.length;
          } catch (e) {
            console.warn('[catalog/import] embedding batch fallito:', e);
          }

          toEmbed.length = 0;
          await db.from('import_jobs').update({ total_saved: saved, total_embedded: embedded }).eq('id', jobId);
        }

        // Progresso ogni 10 posti
        if (i % 10 === 0) {
          await send({ type: 'progress', message: `Importati ${saved}/${allPlaces.length}…`, saved, embedded, total: allPlaces.length });
        }
      }

      // 4. Completa job
      await db.from('import_jobs').update({
        status:          'done',
        total_saved:     saved,
        total_embedded:  embedded,
        completed_at:    new Date().toISOString(),
      }).eq('id', jobId);

      await send({ type: 'done', saved, embedded, jobId, total: allPlaces.length });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
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
