/**
 * lib/wikidata.ts
 *
 * Client per Wikidata SPARQL (compatibile con overpass.ts)
 * Licenza dati: CC0 — dominio pubblico
 * Attribuzione: dati da Wikidata (https://www.wikidata.org)
 *
 * Docs: https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service
 * Playground: https://query.wikidata.org
 */

// ── Tipi ────────────────────────────────────────────────────

export interface WikidataTags {
  name?:          string;
  wikidata?:      string;   // es. "Q744550"
  wikipedia?:     string;   // es. "en:Senso-ji"
  website?:       string;
  description?:   string;
  [key: string]:  string | undefined;
}

export interface WikidataElement {
  id:      string;          // QID (es. Q744550)
  lat:     number;
  lng:     number;
  tags:    WikidataTags;
}

export interface WikidataResult {
  elements: WikidataElement[];
}

// ── Preset filtri Wikidata (mappati da OSM) ──────────────────
// Ogni preset contiene array di QID (Wikidata item IDs) da cercare

const WIKIDATA_QIDS = {
  attractions: [
    'Q570116',  // tourist attraction
    'Q33506',   // museum
    'Q15401994', // art gallery
    'Q3305941', // artwork
  ],
  historic: [
    'Q860861',  // historical place
    'Q23413',   // castle
    'Q4989906', // monument
    'Q715883',  // ruins
    'Q24398521', // memorial
    'Q839954',  // archaeological site
    'Q57821',   // fort
    'Q11812127', // palace
  ],
  religion: [
    'Q6387583', // temple
    'Q207694',  // shrine
    'Q2977',    // cathedral
    'Q44613',   // monastery
  ],
  nature: [
    'Q54050',   // mountain peak
    'Q34038',   // waterfall
    'Q40080',   // beach
    'Q35509',   // cave
    'Q476700',  // hot spring
  ],
  parks: [
    'Q22698',   // park
    'Q1976370', // garden
    'Q3946161', // nature reserve
  ],
  entertainment: [
    'Q1128057', // theme park
    'Q43191',   // zoo
    'Q27676',   // aquarium
  ],
} as const;

export const WIKIDATA_PRESETS = [
  {
    id:    'attractions',
    label: 'Attrazioni',
    qids:  WIKIDATA_QIDS.attractions,
  },
  {
    id:    'historic',
    label: 'Storico',
    qids:  WIKIDATA_QIDS.historic,
  },
  {
    id:    'religion',
    label: 'Templi & Chiese',
    qids:  WIKIDATA_QIDS.religion,
  },
  {
    id:    'nature',
    label: 'Natura',
    qids:  WIKIDATA_QIDS.nature,
  },
  {
    id:    'parks',
    label: 'Parchi & Giardini',
    qids:  WIKIDATA_QIDS.parks,
  },
  {
    id:    'entertainment',
    label: 'Divertimento',
    qids:  WIKIDATA_QIDS.entertainment,
  },
] as const;

export type WikidataPresetId = typeof WIKIDATA_PRESETS[number]['id'];

// ── Nominatim (per convertire nome città → coordinate) ───────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getCityCoordinates(location: string): Promise<{ lat: number; lon: number; bounds?: { minlat: number; maxlat: number; minlon: number; maxlon: number } }> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
    {
      headers: { 'User-Agent': 'TravelGo/1.0' },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json() as Array<{
    lat: string;
    lon: string;
    boundingbox?: [string, string, string, string];
  }>;

  if (!data[0]) throw new Error(`Nessun risultato per "${location}"`);

  const item = data[0];
  const bounds = item.boundingbox
    ? {
        minlat: parseFloat(item.boundingbox[0]),
        maxlat: parseFloat(item.boundingbox[1]),
        minlon: parseFloat(item.boundingbox[2]),
        maxlon: parseFloat(item.boundingbox[3]),
      }
    : undefined;

  return {
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    bounds,
  };
}

// ── SPARQL Query builder ───────────────────────────────────────

function buildSparqlQuery(params: {
  lat: number;
  lon: number;
  presetIds: string[];
  radius?: number;
  limit?: number;
  countOnly?: boolean;
}): string {
  const { lat, lon, presetIds, limit = 500, radius = 50, countOnly = false } = params;

  const presets = WIKIDATA_PRESETS.filter((p) => presetIds.includes(p.id));
  if (presets.length === 0) throw new Error('Nessun filtro selezionato');

  // Raccoglie tutti i QID dai preset selezionati
  const allQids = presets
    .flatMap((p) => p.qids)
    .map((q) => `wd:${q}`)
    .join(' ');

  // Query: cerca items che sono instance of (P31) uno dei QID
  // Nota: usiamo solo P31 (instance of), non P279* (subclass) per risultati più accurati
  // con coordinate entro il raggio specificato
  const selectClause = countOnly ? '(COUNT(?item) as ?count)' : '?item ?itemLabel ?location';
  const radiusMeters = radius * 1000; // convert km to meters

  return `
SELECT ${selectClause}
WHERE {
  ?item wikibase:coordinateLocation ?location.
  ?item wdt:P31 ?type.
  VALUES ?type { ${allQids} }
  FILTER(geof:distance(?location, "Point(${lon} ${lat})"^^geo:wktLiteral) < ${radiusMeters})
  ${!countOnly ? 'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }' : ''}
}
${countOnly ? '' : `LIMIT ${limit}`}
  `.trim();
}

// ── Fetch SPARQL ─────────────────────────────────────────────

export interface WikidataRetryEvent {
  attempt:   number;
  maxRetries: number;
  waitMs:    number;
}

async function fetchSparql(
  query: string,
  onRetry?: (ev: WikidataRetryEvent) => void,
): Promise<any> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 2_000;

  let lastError: Error | null = null;

  console.log('[wikidata] Query SPARQL:', query.slice(0, 500) + (query.length > 500 ? '...' : ''));

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json',
          'User-Agent': 'TravelGo/1.0',
        },
        body: query,
        signal: AbortSignal.timeout(120_000),
      });

      // 429 = rate limited: aspetta e riprova
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '0') * 1000;
        const waitMs = retryAfter || BASE_DELAY * Math.pow(2, attempt);
        const ev: WikidataRetryEvent = { attempt: attempt + 1, maxRetries: MAX_RETRIES, waitMs };
        console.warn(`[wikidata] 429 da Wikidata, attendo ${waitMs}ms (tentativo ${ev.attempt}/${MAX_RETRIES})`);
        onRetry?.(ev);
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[wikidata] Errore HTTP 400 - Risposta completa:', errorText);
        const errorMsg = `Wikidata HTTP ${res.status}: ${errorText.slice(0, 500)}`;
        throw new Error(errorMsg);
      }

      const result = await res.json();
      console.log('[wikidata] Risposta OK, elementi trovati:', result.results?.bindings?.length ?? 0);
      return result;

    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(`[wikidata] Tentativo ${attempt + 1}/${MAX_RETRIES} fallito:`, lastError.message);
      if (lastError.name === 'AbortError' || lastError.name === 'TimeoutError') {
        console.error('[wikidata] Timeout o abort, interrompiamo retry');
        break;
      }
      if (attempt < MAX_RETRIES - 1) await sleep(BASE_DELAY);
    }
  }

  throw lastError ?? new Error('Wikidata non raggiungibile');
}

// ── API pubblica ──────────────────────────────────────────────

export interface PlaceBasic {
  osmId:    string;   // QID di Wikidata
  osmType:  string;   // sempre "item"
  name:     string;
  lat:      number;
  lng:      number;
  category: string;   // es. "museum", "castle", "peak"
  mainTag:  string;   // es. "attractions", "historic"
  tags:     WikidataTags;
}

export interface WikidataCount {
  nodes:     number;   // sempre 0 (non applicabile a Wikidata)
  ways:      number;   // sempre 0
  relations: number;   // sempre 0
  total:     number;   // totale items
}

/**
 * Conta i posti che verrebbero restituiti senza scaricarli.
 * @param onRetry callback opzionale per ricevere eventi di retry
 */
export async function countPlaces(params: {
  location:    string;
  presetIds:   string[];
  notableOnly?: boolean;
  onRetry?:    (ev: WikidataRetryEvent) => void;
}): Promise<WikidataCount> {
  const { location, presetIds, onRetry } = params;

  try {
    // Converte nome città → coordinate via Nominatim
    const cityCoords = await getCityCoordinates(location);

    // Costruisce query count con coordinate reali
    const query = buildSparqlQuery({
      lat: cityCoords.lat,
      lon: cityCoords.lon,
      presetIds,
      countOnly: true,
    });

    const result = await fetchSparql(query, onRetry);

    // Estrae il conteggio dalla risposta
    const count = result.results?.bindings?.[0]?.count?.value
      ? parseInt(result.results.bindings[0].count.value)
      : 0;

    return {
      nodes: 0,
      ways: 0,
      relations: 0,
      total: count,
    };
  } catch (e) {
    console.error('[wikidata] countPlaces error:', e);
    throw e;
  }
}

/**
 * Cerca posti in un'area geografica con i filtri scelti
 */
export async function searchPlaces(params: {
  location:    string;
  presetIds:   string[];
  limit?:      number;
  notableOnly?: boolean;
}): Promise<PlaceBasic[]> {
  const { location, presetIds, limit = 500 } = params;

  try {
    // Converte nome città → coordinate via Nominatim
    const cityCoords = await getCityCoordinates(location);

    // Determina raggio in base alle bounds (se disponibili)
    let radius = 50; // default 50 km
    if (cityCoords.bounds) {
      const latDiff = cityCoords.bounds.maxlat - cityCoords.bounds.minlat;
      const lonDiff = cityCoords.bounds.maxlon - cityCoords.bounds.minlon;
      const maxDiff = Math.max(latDiff, lonDiff);
      radius = Math.ceil(maxDiff * 111 / 2); // approssimazione km
      radius = Math.max(10, Math.min(200, radius)); // clamp 10-200 km
    }

    // Costruisce query SPARQL con coordinate reali
    const query = buildSparqlQuery({
      lat: cityCoords.lat,
      lon: cityCoords.lon,
      presetIds,
      radius,
      limit: Math.min(limit, 2000),
    });

    const result = await fetchSparql(query);

    // Mappa risultati SPARQL a PlaceBasic
    const bindings = result.results?.bindings ?? [];

    return bindings
      .map((binding: any) => {
        const itemUrl = binding.item?.value;
        const qid = itemUrl?.split('/').pop();
        const name = binding.itemLabel?.value;

        // Estrae coordinate dal WKT Point (es. "Point(9.1776 48.7347)")
        const locationStr = binding.location?.value;
        if (!locationStr || !locationStr.startsWith('Point(')) return null;

        const coordStr = locationStr.slice(6, -1); // rimuove "Point(" e ")"
        const [lon, lat] = coordStr.split(' ').map(parseFloat);

        if (!qid || !name || isNaN(lat) || isNaN(lon)) return null;

        // Determina categoria principale
        const { mainTag, category } = determineCategoryFromQid(qid, presetIds);

        return {
          osmId: qid,
          osmType: 'item',
          name,
          lat,
          lng: lon,
          category,
          mainTag,
          tags: {
            name,
            wikidata: qid,
          },
        } satisfies PlaceBasic;
      })
      .filter((p: PlaceBasic | null): p is PlaceBasic => p !== null);
  } catch (e) {
    console.error('[wikidata] searchPlaces error:', e);
    throw e;
  }
}

/**
 * Determina la categoria principale di un item Wikidata
 */
function determineCategoryFromQid(qid: string, presetIds: string[]): { mainTag: string; category: string } {
  // Mappa inversa: da QID a preset
  const qidToCategory: Record<string, { preset: string; category: string }> = {
    // attractions
    'Q570116': { preset: 'attractions', category: 'attraction' },
    'Q33506': { preset: 'attractions', category: 'museum' },
    'Q15401994': { preset: 'attractions', category: 'gallery' },
    'Q3305941': { preset: 'attractions', category: 'artwork' },
    // historic
    'Q860861': { preset: 'historic', category: 'historical' },
    'Q23413': { preset: 'historic', category: 'castle' },
    'Q4989906': { preset: 'historic', category: 'monument' },
    'Q715883': { preset: 'historic', category: 'ruins' },
    'Q24398521': { preset: 'historic', category: 'memorial' },
    'Q839954': { preset: 'historic', category: 'archaeological_site' },
    'Q57821': { preset: 'historic', category: 'fort' },
    'Q11812127': { preset: 'historic', category: 'palace' },
    // religion
    'Q6387583': { preset: 'religion', category: 'temple' },
    'Q207694': { preset: 'religion', category: 'shrine' },
    'Q2977': { preset: 'religion', category: 'cathedral' },
    'Q44613': { preset: 'religion', category: 'monastery' },
    // nature
    'Q54050': { preset: 'nature', category: 'peak' },
    'Q34038': { preset: 'nature', category: 'waterfall' },
    'Q40080': { preset: 'nature', category: 'beach' },
    'Q35509': { preset: 'nature', category: 'cave' },
    'Q476700': { preset: 'nature', category: 'hot_spring' },
    // parks
    'Q22698': { preset: 'parks', category: 'park' },
    'Q1976370': { preset: 'parks', category: 'garden' },
    'Q3946161': { preset: 'parks', category: 'nature_reserve' },
    // entertainment
    'Q1128057': { preset: 'entertainment', category: 'theme_park' },
    'Q43191': { preset: 'entertainment', category: 'zoo' },
    'Q27676': { preset: 'entertainment', category: 'aquarium' },
  };

  const cat = qidToCategory[qid];
  if (cat && presetIds.includes(cat.preset)) {
    return { mainTag: cat.preset, category: cat.category };
  }

  return { mainTag: 'attractions', category: 'poi' };
}

/** Testo da embeddare per un posto Wikidata */
export function buildEmbedText(place: PlaceBasic, description?: string): string {
  const parts: string[] = [];
  parts.push(place.name);
  parts.push(`${place.mainTag}: ${place.category}`);
  if (place.tags.wikipedia) parts.push(place.tags.wikipedia);
  if (description) parts.push(description.slice(0, 300));
  return parts.join('. ');
}
