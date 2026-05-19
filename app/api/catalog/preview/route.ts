/**
 * app/api/catalog/preview/route.ts
 *
 * GET /api/catalog/preview?location=Japan&presets=attractions,historic&limit=12
 *
 * Restituisce un campione di posti da Wikidata senza importare nulla.
 * Usato dal pannello admin per mostrare un'anteprima prima dell'import.
 *
 * Dati: © OpenStreetMap contributors (ODbL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces }              from '@/lib/overpass';
import { requirePlatformAdmin }      from '@/lib/dal/auth';

export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  // ── Params ───────────────────────────────────────────────
  const sp          = req.nextUrl.searchParams;
  const location    = sp.get('location') ?? '';
  const presets     = (sp.get('presets') ?? 'attractions').split(',').map((s) => s.trim()).filter(Boolean);
  const limit       = Math.min(parseInt(sp.get('limit') ?? '12'), 50);
  const notableOnly = sp.get('notableOnly') === 'true';

  if (!location) return NextResponse.json({ error: 'location richiesto' }, { status: 400 });

  // ── Fetch da Overpass ─────────────────────────────────────
  try {
    const places = await searchPlaces({ location, presetIds: presets, limit, notableOnly });

    return NextResponse.json({
      location,
      total_found: places.length,
      attribution: '© OpenStreetMap contributors (ODbL)',
      places: places.map((p) => ({
        osmId:     `${p.osmType}/${p.osmId}`,
        osmType:   p.osmType,
        name:      p.name,
        lat:       p.lat,
        lng:       p.lng,
        category:  p.category,
        mainTag:   p.mainTag,
        wikidata:  p.tags.wikidata,
        wikipedia: p.tags.wikipedia,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore Overpass';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
