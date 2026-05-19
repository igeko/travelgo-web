/**
 * lib/wikipedia.ts
 *
 * Enrichment lazy per i posti OSM che hanno i tag `wikipedia` o `wikidata`.
 *
 * Fonti:
 *  - Wikipedia REST API   → descrizione testuale (summary)
 *  - Wikimedia Commons    → immagine di copertina via Wikidata
 *
 * Licenza dati:
 *  - Wikipedia: CC BY-SA 4.0  (uso commerciale consentito con attribuzione)
 *  - Wikidata:  CC0 (pubblico dominio)
 *  - Wikimedia Commons: varia per file, ma le thumbnail via API sono CC o PD
 *
 * Attribuzione obbligatoria: "Wikipedia contributors" / "Wikimedia Commons"
 *
 * Docs:
 *  - https://en.wikipedia.org/api/rest_v1/
 *  - https://www.wikidata.org/wiki/Wikidata:Data_access
 *  - https://commons.wikimedia.org/wiki/Commons:API/MediaWiki
 */

// ── Tipi ─────────────────────────────────────────────────────

export interface WikiEnrichment {
  description?: string;   // estratto Wikipedia (max 500 char)
  coverImage?:  string;   // URL thumbnail Wikimedia
  wikipedia?:   string;   // URL pagina Wikipedia
}

// ── Helpers ───────────────────────────────────────────────────

/** Estrae lingua e titolo dal tag OSM "wikipedia" (es. "en:Senso-ji" → { lang: 'en', title: 'Senso-ji' }) */
function parseWikipediaTag(tag: string): { lang: string; title: string } | null {
  const sep = tag.indexOf(':');
  if (sep === -1) return null;
  const lang  = tag.slice(0, sep).trim();
  const title = tag.slice(sep + 1).trim();
  if (!lang || !title) return null;
  return { lang, title };
}

/** Fetch con timeout, senza eccezioni: ritorna null se fallisce */
async function safeFetch(url: string, timeoutMs = 8000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelGo/1.0 (https://travelgo.app; info@travelgo.app)' },
      signal:  AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Wikipedia REST API ────────────────────────────────────────

/**
 * Recupera il summary di una pagina Wikipedia.
 * Endpoint: GET /api/rest_v1/page/summary/{title}
 * Docs: https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
 */
async function fetchWikipediaSummary(lang: string, title: string): Promise<{
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
} | null> {
  const encoded = encodeURIComponent(title.replaceAll(' ', '_'));
  const url     = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const data    = await safeFetch(url);
  return (data && typeof data === 'object') ? data as ReturnType<typeof fetchWikipediaSummary> extends Promise<infer T> ? T : never : null;
}

// ── Wikidata → Wikimedia Commons image ───────────────────────

/**
 * Da un QID Wikidata recupera l'URL dell'immagine di copertina (P18).
 * Usa l'API Wikidata per ottenere il filename, poi costruisce l'URL thumbnail via Wikimedia.
 */
async function fetchWikidataImage(qid: string, thumbWidth = 800): Promise<string | null> {
  // 1. Wikidata API: recupera la proprietà P18 (image)
  const url  = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`;
  const data = await safeFetch(url) as Record<string, unknown> | null;

  const claims = (data as { claims?: { P18?: unknown[] } })?.claims?.P18;
  if (!Array.isArray(claims) || claims.length === 0) return null;

  const mainsnak = (claims[0] as { mainsnak?: { datavalue?: { value?: { value?: string } } } })?.mainsnak;
  const filename  = mainsnak?.datavalue?.value?.value ?? mainsnak?.datavalue?.value;
  if (typeof filename !== 'string' || !filename) return null;

  // 2. Costruisce URL thumbnail via Wikimedia thumb API
  return wikimediaThumbnailUrl(filename, thumbWidth);
}

/**
 * Costruisce l'URL thumbnail di Wikimedia Commons dato un filename.
 * Formato: https://upload.wikimedia.org/wikipedia/commons/thumb/<md5[0]>/<md5[0:2]>/<filename>/<width>px-<filename>
 */
function wikimediaThumbnailUrl(filename: string, width: number): string {
  const name    = filename.replaceAll(' ', '_');
  const md5     = computeMd5Prefix(name);
  const ext     = name.split('.').pop()?.toLowerCase() ?? '';
  // SVG e TIFF vengono rasterizzati come PNG
  const suffix  = (ext === 'svg' || ext === 'tif' || ext === 'tiff') ? `${width}px-${name}.png` : `${width}px-${name}`;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${md5[0]}/${md5.slice(0, 2)}/${encodeURIComponent(name)}/${suffix}`;
}

/** Calcola i primi 2 caratteri del prefisso MD5 del filename (necessario per il path Wikimedia) */
function computeMd5Prefix(filename: string): string {
  // Implementazione MD5 minimale per i primi 2 hex chars
  // In un contesto browser/Node possiamo usare la Web Crypto API
  // Ma siccome siamo server-side (Node 18+) usiamo crypto nativo
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHash } = require('crypto') as { createHash: (alg: string) => { update: (s: string) => { digest: (enc: string) => string } } };
    return createHash('md5').update(filename).digest('hex');
  } catch {
    // Fallback: ritorna 'a/ab' generico (meno preciso ma non crashante)
    return 'ab';
  }
}

// ── API pubblica ──────────────────────────────────────────────

/**
 * Enrichment lazy per un posto OSM.
 *
 * Strategia:
 *  1. Se ha tag `wikipedia` → fetch summary Wikipedia (descrizione + eventuale thumbnail)
 *  2. Se ha tag `wikidata`  → fetch immagine P18 da Wikidata (migliore qualità di solito)
 *  3. Se entrambi, usa Wikipedia per la descrizione e Wikidata per l'immagine
 *
 * Richiede rete — chiamare solo durante l'import, non in hot-path.
 */
export async function enrichFromWiki(params: {
  wikipediaTag?: string;   // OSM tag "wikipedia", es. "en:Senso-ji"
  wikidataId?:   string;   // OSM tag "wikidata", es. "Q744550"
}): Promise<WikiEnrichment> {
  const { wikipediaTag, wikidataId } = params;
  const result: WikiEnrichment = {};

  // 1. Wikipedia summary
  if (wikipediaTag) {
    const parsed = parseWikipediaTag(wikipediaTag);
    if (parsed) {
      const summary = await fetchWikipediaSummary(parsed.lang, parsed.title);
      if (summary) {
        result.description = summary.extract?.slice(0, 500);
        result.wikipedia   = summary.content_urls?.desktop?.page;
        // Thumbnail dalla pagina Wikipedia (fallback se Wikidata non ha P18)
        if (summary.thumbnail?.source) {
          result.coverImage = summary.thumbnail.source;
        }
      }
    }
  }

  // 2. Wikidata image P18 (sovrascrive il thumbnail Wikipedia se disponibile — qualità maggiore)
  if (wikidataId) {
    const img = await fetchWikidataImage(wikidataId);
    if (img) result.coverImage = img;
  }

  return result;
}
