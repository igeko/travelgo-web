/**
 * app/api/catalog/preview/route.ts
 *
 * GET /api/catalog/preview?location=Japan&presets=attractions,historic&limit=12
 * → { data: { location, total_found, attribution, places } }
 *
 * Sample places from Overpass without importing. Admin-only.
 * Dati: © OpenStreetMap contributors (ODbL)
 */

import { route, queryParam, ok } from '@/lib/api';
import { requirePlatformAdmin } from '@/lib/api/guards';
import { badRequest, upstream } from '@/lib/api/errors';
import { searchPlaces } from '@/lib/overpass';

export const GET = route(async ({ req }) => {
  await requirePlatformAdmin();

  const location = queryParam(req, 'location') ?? '';
  const presets = (queryParam(req, 'presets') ?? 'attractions')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const limit = Math.min(parseInt(queryParam(req, 'limit') ?? '12', 10), 50);
  const notableOnly = queryParam(req, 'notableOnly') === 'true';

  if (!location) throw badRequest('location richiesto');

  try {
    const places = await searchPlaces({ location, presetIds: presets, limit, notableOnly });
    return ok({
      location,
      total_found: places.length,
      attribution: '© OpenStreetMap contributors (ODbL)',
      places: places.map((p) => ({
        osmId: `${p.osmType}/${p.osmId}`,
        osmType: p.osmType,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        category: p.category,
        mainTag: p.mainTag,
        wikidata: p.tags.wikidata,
        wikipedia: p.tags.wikipedia,
      })),
    });
  } catch (err) {
    throw upstream(err instanceof Error ? err.message : 'Errore Overpass');
  }
});
