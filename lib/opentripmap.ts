/**
 * lib/opentripmap.ts
 *
 * Client per OpenTripMap API v0.1
 * Docs: https://opentripmap.io/docs
 *
 * Richiede: OPENTRIPMAP_API_KEY in .env.local
 *
 * Attribuzione obbligatoria: © OpenStreetMap contributors
 */

const BASE = 'https://api.opentripmap.com/0.1/en';

function apiKey() {
  const key = process.env.OPENTRIPMAP_API_KEY;
  if (!key) throw new Error('OPENTRIPMAP_API_KEY non configurata');
  return key;
}

// ── Tipi ────────────────────────────────────────────────────

export interface OtmGeoname {
  name:    string;
  country: string;
  lat:     number;
  lon:     number;
  bbox?:   { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
}

export interface OtmPlaceBasic {
  xid:      string;
  name:     string;
  rate:     number;         // 0–3 (stelle)
  osm?:     string;
  wikidata?: string;
  kinds:    string;         // comma-separated
  point:    { lon: number; lat: number };
}

export interface OtmPlaceDetail {
  xid:        string;
  name:       string;
  rate:       number;
  kinds:      string;
  point:      { lon: number; lat: number };
  address?: {
    city?:         string;
    country?:      string;
    country_code?: string;
    road?:         string;
    state?:        string;
  };
  preview?: {
    source: string;
    height: number;
    width:  number;
  };
  wikipedia_extracts?: { title: string; text: string };
  wikidata?: string;
  wikipedia?: string;
}

// Categorie principali OpenTripMap
export const OTM_KINDS = [
  { value: 'cultural',        label: 'Cultura' },
  { value: 'historic',        label: 'Storico' },
  { value: 'religion',        label: 'Religione' },
  { value: 'architecture',    label: 'Architettura' },
  { value: 'natural',         label: 'Natura' },
  { value: 'beaches',         label: 'Spiagge' },
  { value: 'amusements',      label: 'Divertimento' },
  { value: 'sport',           label: 'Sport' },
  { value: 'foods',           label: 'Cibo' },
  { value: 'interesting_places', label: 'Luoghi interessanti' },
  { value: 'tourist_facilities', label: 'Strutture turistiche' },
] as const;

export type OtmKind = typeof OTM_KINDS[number]['value'];

// ── API calls ────────────────────────────────────────────────

/** Cerca le coordinate e il bbox di un luogo (paese, città, ecc.) */
export async function getGeoname(name: string): Promise<OtmGeoname | null> {
  const url = `${BASE}/places/geoname?name=${encodeURIComponent(name)}&apikey=${apiKey()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

/** Fetch lista posti in un bounding box con filtri */
export async function getPlacesByBbox(params: {
  lat_min: number; lat_max: number;
  lon_min: number; lon_max: number;
  kinds?: string;
  rate?: number;
  limit?: number;
  offset?: number;
}): Promise<OtmPlaceBasic[]> {
  const p = new URLSearchParams({
    lat_min:  params.lat_min.toString(),
    lat_max:  params.lat_max.toString(),
    lon_min:  params.lon_min.toString(),
    lon_max:  params.lon_max.toString(),
    limit:    (params.limit  ?? 500).toString(),
    offset:   (params.offset ?? 0).toString(),
    format:   'json',
    apikey:   apiKey(),
  });
  if (params.kinds) p.set('kinds', params.kinds);
  if (params.rate  !== undefined) p.set('rate', params.rate.toString());

  const res = await fetch(`${BASE}/places/bbox?${p}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Dettaglio completo di un singolo posto (descrizione, immagine, indirizzo) */
export async function getPlaceDetail(xid: string): Promise<OtmPlaceDetail | null> {
  const res = await fetch(`${BASE}/places/xid/${xid}?apikey=${apiKey()}`);
  if (!res.ok) return null;
  return res.json();
}

/** Batch fetch dettagli con rate limiting (max ~2 req/s) */
export async function getPlaceDetailsBatch(
  xids: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, OtmPlaceDetail>> {
  const results = new Map<string, OtmPlaceDetail>();
  const DELAY_MS = 250; // 4 req/s — dentro i limiti free tier

  for (let i = 0; i < xids.length; i++) {
    const detail = await getPlaceDetail(xids[i]);
    if (detail) results.set(xids[i], detail);
    onProgress?.(i + 1, xids.length);
    if (i < xids.length - 1) await sleep(DELAY_MS);
  }
  return results;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Costruisce il testo da embeddare per un posto */
export function buildEmbedText(place: OtmPlaceBasic | OtmPlaceDetail, city?: string, country?: string): string {
  const parts: string[] = [];
  if (place.name)  parts.push(place.name);
  if (place.kinds) parts.push(place.kinds.replace(/,/g, ', '));
  if (city)        parts.push(city);
  if (country)     parts.push(country);
  if ('wikipedia_extracts' in place && place.wikipedia_extracts?.text) {
    // Primi 200 caratteri della descrizione Wikipedia
    parts.push(place.wikipedia_extracts.text.slice(0, 200));
  }
  return parts.join('. ');
}
