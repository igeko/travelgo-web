/**
 * app/api/catalog/preview/route.ts
 *
 * GET /api/catalog/preview?location=Japan&presets=attractions,historic&limit=12
 *
 * Restituisce un campione di posti da Overpass/OSM senza importare nulla.
 * Usato dal pannello admin per mostrare un'anteprima prima dell'import.
 *
 * Dati: © OpenStreetMap contributors, licenza ODbL
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient }        from '@supabase/ssr';
import { cookies }                   from 'next/headers';
import { searchPlaces }              from '@/lib/overpass';

export async function GET(req: NextRequest) {
  // ── Auth: solo admin ─────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: admin } = await supabase
    .from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // ── Params ───────────────────────────────────────────────
  const sp       = req.nextUrl.searchParams;
  const location = sp.get('location') ?? '';
  const presets  = (sp.get('presets') ?? 'attractions').split(',').map((s) => s.trim()).filter(Boolean);
  const limit    = Math.min(parseInt(sp.get('limit') ?? '12'), 50);

  if (!location) return NextResponse.json({ error: 'location richiesto' }, { status: 400 });

  // ── Fetch da Overpass ─────────────────────────────────────
  try {
    const places = await searchPlaces({ location, presetIds: presets, limit });

    return NextResponse.json({
      location,
      total_found: places.length,
      attribution: '© OpenStreetMap contributors (ODbL)',
      places: places.map((p) => ({
        osmId:     p.osmId,
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
