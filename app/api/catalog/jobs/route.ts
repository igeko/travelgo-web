/**
 * app/api/catalog/jobs/route.ts
 *
 * GET    /api/catalog/jobs          → lista job dell'admin
 * POST   /api/catalog/jobs          → crea un nuovo job via SSE
 *   Body: { location, presetIds, notableOnly, batchSize, autoContinue, enrichWiki }
 *   SSE events:
 *     { type: 'retry',  attempt, maxRetries, waitMs, endpoint }
 *     { type: 'done',   job, count }
 *     { type: 'error',  message }
 * DELETE /api/catalog/jobs?id=<jobId>  → elimina un job
 */

import { NextRequest, NextResponse }  from 'next/server';
import { countPlaces }                from '@/lib/overpass';
import type { OverpassRetryEvent }    from '@/lib/overpass';

// ── Auth helper ───────────────────────────────────────────────

import { requirePlatformAdmin } from '@/lib/api/guards';
import { serviceDal } from '@/lib/dal';

/** Returns the admin user id, or null if the caller is not a platform admin. */
async function requireAdminId(): Promise<string | null> {
  try {
    const { userId } = await requirePlatformAdmin();
    return userId;
  } catch {
    return null;
  }
}

// ── SSE helper ────────────────────────────────────────────────

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── GET — lista job ───────────────────────────────────────────

export async function GET() {
  const userId = await requireAdminId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await serviceDal().catalog.listJobs(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data });
}

// ── POST — crea job (SSE) ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await requireAdminId();
  if (!userId) {
    return new Response(sseEvent({ type: 'error', message: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const body = await req.json();
  const {
    location     = '',
    presetIds    = ['attractions'],
    notableOnly  = false,
    batchSize    = 500,
    autoContinue = false,
    enrichWiki   = true,
  } = body as {
    location:     string;
    presetIds:    string[];
    notableOnly:  boolean;
    batchSize:    number;
    autoContinue: boolean;
    enrichWiki:   boolean;
  };

  if (!location) {
    return new Response(sseEvent({ type: 'error', message: 'location richiesto' }), {
      status: 400, headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc    = new TextEncoder();

  const send = async (data: Record<string, unknown>) => {
    try { await writer.write(enc.encode(sseEvent(data))); } catch { /* disconnesso */ }
  };

  (async () => {
    try {
      // Conta posti — streamma gli eventi di retry al client
      const onRetry = (ev: OverpassRetryEvent) => {
        send({
          type:       'retry',
          attempt:    ev.attempt,
          maxRetries: ev.maxRetries,
          waitMs:     ev.waitMs,
          endpoint:   ev.endpoint,
        });
      };

      const count = await countPlaces({ location, presetIds, notableOnly, onRetry });

      // Crea job in stato pending
      const { data: job, error } = await serviceDal().catalog.createJob({
        status:        'pending',
        filters:       { location, presetIds, notableOnly, enrichWiki },
        batch_size:    batchSize,
        auto_continue: autoContinue,
        import_offset: 0,
        total_found:   count.total,
        created_by:    userId,
      });

      if (error) throw new Error(error.message);

      await send({ type: 'done', job, count });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore creazione task';
      console.error('[catalog/jobs] Errore countPlaces:', err);
      await send({
        type: 'error',
        message: msg,
        details: err instanceof Error ? err.stack : undefined,
      });
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

// ── DELETE — elimina job ──────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const userId = await requireAdminId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });

  // deleteJob never removes a job that is currently running
  const { error } = await serviceDal().catalog.deleteJob(id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
