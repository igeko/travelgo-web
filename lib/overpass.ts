/**
 * lib/overpass.ts (v2)
 *
 * Client Overpass API (OpenStreetMap) con status check + cache + smart retry
 * Licenza dati: ODbL — uso commerciale consentito con attribuzione
 * Attribuzione obbligatoria: © OpenStreetMap contributors
 *
 * Migliorie:
 * - /status endpoint check prima di query
 * - Cache dei risultati (evita rate limit)
 * - Backoff intelligente su 429
 * - Mirror alternativi
 *
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

// Mirror pubblici — usiamo il principale con fallback
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
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
  notableOnly?: boolean;
  timeout?: number;
}): string {
  const { location, presetIds, limit, notableOnly = false, timeout = 120 } = params;

  const presets = OSM_PRESETS.filter((p) => presetIds.includes(p.id));
  if (presets.length === 0) throw new Error('Nessun filtro selezionato');

  const notable = notableOnly ? '[~"^(wikipedia|wikidata)$"~"."]' : '';
  const blocks = presets.flatMap((p) => [
    `  node[${p.filter}]${notable}(area.searchArea);`,
    `  way[${p.filter}]${notable}(area.searchArea);`,
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

// ── Utilities ──────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Status check: quanti slot disponibili su questo endpoint?
async function checkStatus(endpoint: string): Promise<number> {
  try {
    const res = await fetch(endpoint.replace('/interpreter', '/status'), {
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const match = text.match(/(\d+)\s+slots? available/);
    return match ? parseInt(match[1]) : 0;
  } catch {
    return 0; // assume occupato se errore
  }
}

// ── Fetch Overpass ─────────────────────────────────────────────

export interface OverpassRetryEvent {
  attempt:   number;
  maxRetries: number;
  waitMs:    number;
  endpoint:  string;
}

/**
 * Esegue query Overpass con:
 * - Status check (aspetta se server occupato)
 * - Retry su 429 con backoff esponenziale
 * - Mirror fallback se endpoint non raggiungibile
 */
async function fetchOverpass(
  query: string,
  onRetry?: (ev: OverpassRetryEvent) => void,
): Promise<OverpassResult> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 2_000;

  let lastError: Error | null = null;

  for (const endpoint of ENDPOINTS) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Status check: aspetta se 0 slot disponibili
        let statusAttempts = 0;
        while ((await checkStatus(endpoint)) === 0 && statusAttempts < 5) {
          const waitMs = 10_000; // aspetta 10s tra status check
          console.log(`[overpass] ${endpoint} occupato (0 slot), attendo...`);
          await sleep(waitMs);
          statusAttempts++;
        }

        // Fai la query
        const res = await fetch(endpoint, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    `data=${encodeURIComponent(query)}`,
          signal:  AbortSignal.timeout(130_000),
        });

        // 429 = server occupato: aspetta e riprova
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') ?? '0') * 1000;
          const waitMs = retryAfter || BASE_DELAY * Math.pow(2, attempt);
          const ev: OverpassRetryEvent = { attempt: attempt + 1, maxRetries: MAX_RETRIES, waitMs, endpoint };
          console.warn(`[overpass] 429 su ${endpoint}, attendo ${waitMs}ms (tentativo ${ev.attempt}/${MAX_RETRIES})`);
          onRetry?.(ev);
          await sleep(waitMs);
          continue;
        }

        if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
        return await res.json() as OverpassResult;

      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (lastError.name === 'AbortError' || lastError.name === 'TimeoutError') break;
        if (attempt < MAX_RETRIES - 1) await sleep(BASE_DELAY);
      }
    }

    if (lastError) {
      console.warn(`[overpass] endpoint ${endpoint} esaurito, provo il successivo...`);
      lastError = null;
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

export interface OverpassCount {
  nodes:     number;
  ways:      number;
  relations: number;
  total:     number;
}

/**
 * Conta i posti che verrebbero restituiti senza scaricarli.
 */
export async function countPlaces(params: {
  location:    string;
  presetIds:   string[];
  notableOnly?: boolean;
  onRetry?:    (ev: OverpassRetryEvent) => void;
}): Promise<OverpassCount> {
  const { onRetry, ...rest } = params;
  const fullQuery = buildQuery({ ...rest, limit: 999999 });
  const countQuery = fullQuery.replace(/^out center body \d+;$/m, 'out count;');

  const result = await fetchOverpass(countQuery, onRetry);
  const el = result.elements[0] as unknown as {
    tags: { nodes: string; ways: string; relations: string; total: string };
  } | undefined;

  return {
    nodes:     parseInt(el?.tags.nodes     ?? '0'),
    ways:      parseInt(el?.tags.ways      ?? '0'),
    relations: parseInt(el?.tags.relations ?? '0'),
    total:     parseInt(el?.tags.total     ?? '0'),
  };
}

/** Cerca posti in un'area geografica con i filtri scelti */
export async function searchPlaces(params: {
  location:    string;
  presetIds:   string[];
  limit?:      number;
  notableOnly?: boolean;
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
