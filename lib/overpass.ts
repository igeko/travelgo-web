/**
 * lib/overpass.ts
 *
 * Client per Overpass API (OpenStreetMap)
 * Licenza dati: ODbL — uso commerciale consentito con attribuzione
 * Attribuzione obbligatoria: © OpenStreetMap contributors
 *
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 * Playground: https://overpass-turbo.eu
 */

// Mirror pubblici — usiamo il principale con fallback
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// ── Tipi ────────────────────────────────────────────────────

export interface OsmTags {
  name?:          string;
  'name:en'?:     string;
  'name:it'?:     string;
  tourism?:       string;
  historic?:      string;
  natural?:       string;
  leisure?:       string;
  amenity?:       string;
  religion?:      string;
  wikipedia?:     string;   // es. "en:Senso-ji"
  wikidata?:      string;   // es. "Q744550"
  website?:       string;
  opening_hours?: string;
  'addr:city'?:   string;
  'addr:country'?: string;
  [key: string]:  string | undefined;
}

export interface OsmElement {
  type:    'node' | 'way' | 'relation';
  id:      number;
  lat?:    number;   // per nodes
  lon?:    number;
  center?: { lat: number; lon: number };  // per ways/relations con out center
  tags:    OsmTags;
}

export interface OverpassResult {
  elements: OsmElement[];
}

// ── Preset filtri OSM ─────────────────────────────────────────
// Ogni preset definisce i tag OSM da cercare.
// Puoi combinare più preset in una query.

export const OSM_PRESETS = [
  {
    id:    'attractions',
    label: 'Attrazioni',
    filter: '"tourism"~"attraction|museum|gallery|artwork|viewpoint"',
  },
  {
    id:    'historic',
    label: 'Storico',
    filter: '"historic"~"castle|monument|ruins|memorial|archaeological_site|fort|palace"',
  },
  {
    id:    'religion',
    label: 'Templi & Chiese',
    filter: '"historic"~"temple|shrine|cathedral|monastery"',
  },
  {
    id:    'nature',
    label: 'Natura',
    filter: '"natural"~"peak|waterfall|beach|cave_entrance|hot_spring"',
  },
  {
    id:    'parks',
    label: 'Parchi & Giardini',
    filter: '"leisure"~"park|garden|nature_reserve|wildlife_hide"',
  },
  {
    id:    'entertainment',
    label: 'Divertimento',
    filter: '"tourism"~"theme_park|zoo|aquarium"',
  },
] as const;

export type OsmPresetId = typeof OSM_PRESETS[number]['id'];

// ── Query builder ─────────────────────────────────────────────

function buildQuery(params: {
  location: string;
  presetIds: string[];
  limit: number;
  timeout?: number;
}): string {
  const { location, presetIds, limit, timeout = 120 } = params;

  const presets = OSM_PRESETS.filter((p) => presetIds.includes(p.id));
  if (presets.length === 0) throw new Error('Nessun filtro selezionato');

  // Costruisce i blocchi union per nodes + ways per ogni filtro
  const blocks = presets.flatMap((p) => [
    `  node[${p.filter}](area.searchArea);`,
    `  way[${p.filter}](area.searchArea);`,
  ]).join('\n');

  return `
[out:json][timeout:${timeout}];
area["name"="${location}"]->.searchArea;
(
${blocks}
);
out center body ${limit};
  `.trim();
}

// ── Fetch ─────────────────────────────────────────────────────

async function fetchOverpass(query: string): Promise<OverpassResult> {
  let lastError: Error | null = null;

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(query)}`,
        signal:  AbortSignal.timeout(130_000), // leggermente più del timeout query
      });

      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const data: OverpassResult = await res.json();
      return data;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[overpass] endpoint ${endpoint} fallito:`, lastError.message);
    }
  }

  throw lastError ?? new Error('Tutti gli endpoint Overpass non raggiungibili');
}

// ── API pubblica ──────────────────────────────────────────────

export interface PlaceBasic {
  osmId:    number;
  osmType:  string;
  name:     string;
  lat:      number;
  lng:      number;
  category: string;   // es. "museum", "castle", "peak"
  mainTag:  string;   // es. "tourism", "historic", "natural"
  tags:     OsmTags;
}

/** Cerca posti in un'area geografica con i filtri scelti */
export async function searchPlaces(params: {
  location:  string;
  presetIds: string[];
  limit?:    number;
}): Promise<PlaceBasic[]> {
  const limit = Math.min(params.limit ?? 500, 2000);
  const query = buildQuery({ ...params, limit });
  const result = await fetchOverpass(query);

  return result.elements
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) return null;

      const name = el.tags['name:en'] ?? el.tags.name ?? '';
      if (!name) return null;

      // Determina categoria principale
      const { mainTag, category } = extractCategory(el.tags);

      return {
        osmId:    el.id,
        osmType:  el.type as string,
        name,
        lat,
        lng,
        category,
        mainTag,
        tags:     el.tags,
      } satisfies PlaceBasic;
    })
    .filter((p): p is PlaceBasic => p !== null);
}

function extractCategory(tags: OsmTags): { mainTag: string; category: string } {
  if (tags.tourism)  return { mainTag: 'tourism',  category: tags.tourism };
  if (tags.historic) return { mainTag: 'historic', category: tags.historic };
  if (tags.natural)  return { mainTag: 'natural',  category: tags.natural };
  if (tags.leisure)  return { mainTag: 'leisure',  category: tags.leisure };
  if (tags.amenity)  return { mainTag: 'amenity',  category: tags.amenity };
  return { mainTag: 'other', category: 'other' };
}

/** Testo da embeddare per un posto OSM */
export function buildEmbedText(place: PlaceBasic, description?: string): string {
  const parts: string[] = [];
  parts.push(place.name);
  parts.push(`${place.mainTag}: ${place.category}`);
  if (place.tags['addr:city'])    parts.push(place.tags['addr:city']!);
  if (place.tags['addr:country']) parts.push(place.tags['addr:country']!);
  if (description)                parts.push(description.slice(0, 300));
  return parts.join('. ');
}
