/**
 * Shared prompt builder for /api/ai/describe-day.
 * Importabile sia dal route (server) che dal client (debug panel).
 */

import type { DescribeDayRequest } from "@/app/api/ai/describe-day/route";

export function buildDescribeDayPrompt(body: DescribeDayRequest): string {
  const { label, zone, type, summary, activities } = body;

  const header = [
    `GIORNATA: ${label}${zone ? ` · ${zone}` : ""}${type ? ` · ${type}` : ""}`,
    summary ? `Tema: ${summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Plain text, no IDs, no quotes, no numbering
  const actLines = activities
    .map((a) => {
      const time = a.time ? `${a.time} — ` : "";
      const line = `${time}${a.name}`;
      return a.description?.trim() ? `${line}\n${a.description.trim()}` : line;
    })
    .join("\n\n");

  return `Sei Go, redattore senior di TravelGo. Il tuo stile è quello di Lonely Planet Traveller — la rivista, non la guida pratica.

${header}

TAPPE DEL GIORNO (in ordine, con le note dell'utente):
${actLines}

Rispondi ESCLUSIVAMENTE con JSON valido (niente markdown, niente backtick):
{
  "deck": "<standfirst: 1 frase evocativa max 35 parole, italiano — cattura l'atmosfera del luogo, non cosa si fa>",
  "body": "<testo 200-300 parole, italiano>",
  "pullQuote": "<sottostringa ESATTA da una delle note attività, min 20 caratteri, oppure null>"
}

Regole per il body:
1. VOCE: descrivi i LUOGHI, non i viaggiatori. Il soggetto è la città, il quartiere, il monumento, il ristorante — non "il visitatore" né "si può". Scrivi come se stessi ritraendo un posto per un lettore che non c'è mai stato.
2. STILE: prosa densa, sensoriale, con dettagli concreti (architettura, luce, suoni, profumi, storia) — come un articolo di Condé Nast Traveller o Lonely Planet Magazine. Niente liste, niente orari.
3. STRUTTURA: usa le tappe come filo conduttore geografico, nell'ordine dato. Le note dell'utente sono fatti da intrecciare nella prosa, non didascalie da parafrasare.
4. PERSONE: niente prima persona (io, noi). Niente "il viaggiatore" o "il turista". Se necessario, usa costruzioni impersonali o dirigi la voce al lettore: "qui", "in questo angolo", "vale la pena".
5. pullQuote: sottostringa IDENTICA, copiata carattere per carattere da una nota utente (min 20 caratteri). Se non esiste nessuna nota adatta, scrivi null.
6. Non inventare fatti, luoghi o dettagli non presenti nelle note.`;
}

/** Rough token estimate: ~4 chars per token (GPT rule of thumb) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
