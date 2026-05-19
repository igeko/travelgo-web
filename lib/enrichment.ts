/**
 * lib/enrichment.ts
 *
 * Orchestrates multi-source enrichment for tourism places:
 *  1. Wikipedia (structured data, descriptions, images)
 *  2. Web search (tourism-specific info: opening hours, admission, tips)
 *
 * Licenze:
 *  - Wikipedia: CC BY-SA 4.0
 *  - Web search results: Rispetto robots.txt e ToS
 */

import OpenAI from 'openai';
import { enrichFromWiki, type WikiEnrichment } from './wikipedia';

// ── Types ─────────────────────────────────────────────────────

export interface EnrichedPlace {
  description?: string;           // Wikipedia summary
  coverImage?: string;            // Wikimedia image
  wikipedia?: string;             // Wikipedia page URL
  tourismInfo?: {
    openingHours?: string;
    admissionFee?: string;
    bestTime?: string;
    highlights?: string[];
  };
}

// ── Web Search Enrichment ─────────────────────────────────────

/**
 * Usa OpenAI per cercare sul web informazioni turistiche su un luogo.
 * Nota: Questo richiede che OpenAI abbia accesso a uno strumento di ricerca web.
 *
 * Alternativa: Possiamo usare DuckDuckGo API o Bing Search API per ricerche generiche.
 */
async function searchTourismInfo(
  placeName: string,
  openai: OpenAI,
): Promise<string | null> {
  try {
    // Se in futuro OpenAI aggiunge web search nativo,
    // o abbiamo configurato un tool per la ricerca, useremo questo.
    // Per ora, ritorniamo null e facciamo fallback.

    // Placeholder per implementazione futura con web search tool
    return null;
  } catch (e) {
    console.warn('[enrichment] Errore web search:', e);
    return null;
  }
}

/**
 * Estrae informazioni turistiche da un testo di ricerca.
 * Usa regex e pattern matching per estrarre campi comuni.
 */
function parseTourismInfo(searchResult: string): EnrichedPlace['tourismInfo'] {
  const info: EnrichedPlace['tourismInfo'] = {};

  // Orari di apertura (pattern: "open 9am-5pm" o "opens at 10")
  const hoursMatch = searchResult.match(/(?:open|hours?)[:\s]+([^.]+?)(?:\.|$)/i);
  if (hoursMatch) info.openingHours = hoursMatch[1].trim();

  // Ingresso a pagamento (pattern: "admission" o "entry fee")
  const feeMatch = searchResult.match(/(?:admission|entry|ticket)[:\s]+([^.]+?)(?:\.|$)/i);
  if (feeMatch) info.admissionFee = feeMatch[1].trim();

  // Periodo migliore (pattern: "best time")
  const timeMatch = searchResult.match(/best\s+(?:time|season|month)[:\s]+([^.]+?)(?:\.|$)/i);
  if (timeMatch) info.bestTime = timeMatch[1].trim();

  return info;
}

// ── Main Enrichment ───────────────────────────────────────────

/**
 * Arricchisce un luogo con dati da Wikipedia e web search.
 *
 * Flusso:
 *  1. Enrichment da Wikipedia (descrizione, immagine)
 *  2. Web search per info turistiche (orari, tariffe, etc.)
 *  3. Combina i risultati
 *
 * @param name Nome del luogo
 * @param params Tags OSM (wikipedia, wikidata)
 * @param openai Client OpenAI per future web search
 */
export async function enrichPlace(
  name: string,
  params: { wikipediaTag?: string; wikidataId?: string },
  openai?: OpenAI,
): Promise<EnrichedPlace> {
  const result: EnrichedPlace = {};

  // 1. Wikipedia enrichment
  const wiki = await enrichFromWiki(params);
  Object.assign(result, wiki);

  // 2. Web search enrichment (placeholder per future implementation)
  if (openai) {
    const searchResult = await searchTourismInfo(name, openai);
    if (searchResult) {
      result.tourismInfo = parseTourismInfo(searchResult);
    }
  }

  return result;
}

/**
 * Build del testo per embedding, includendo info turistiche se disponibili.
 */
export function buildEmbedText(
  name: string,
  category: string,
  description?: string,
  tourism?: EnrichedPlace['tourismInfo'],
): string {
  const parts = [
    name,
    category,
    description,
    tourism?.openingHours ? `Hours: ${tourism.openingHours}` : '',
    tourism?.admissionFee ? `Fee: ${tourism.admissionFee}` : '',
    tourism?.bestTime ? `Best time: ${tourism.bestTime}` : '',
    tourism?.highlights?.join(', '),
  ].filter(Boolean);

  return parts.join(' | ');
}
