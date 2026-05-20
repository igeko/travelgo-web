/* ─────────────────────────────────────────────────────────────────
   Durata transit — parsing/formatting in giorni/ore/minuti.
   Forma canonica: "1d 4h 20m". Lo storage resta in minuti (duration_min).
───────────────────────────────────────────────────────────────── */

const DURATION_UNIT_RE = /(\d+)\s*(d|h|m)/gi;

/**
 * Parse "1d 4h 20m" / "2h" / "90m" o un numero secco (minuti) → minuti totali.
 * Ritorna null se non riconosce né unità né un numero puro.
 */
export function parseDurationToMinutes(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  let total = 0;
  let found = false;
  for (const match of s.matchAll(DURATION_UNIT_RE)) {
    found = true;
    const n = parseInt(match[1], 10);
    if (match[2] === "d") total += n * 1440;
    else if (match[2] === "h") total += n * 60;
    else total += n;
  }
  if (found) return total;

  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

/** Minuti → "1d 4h 20m" (omette le unità a zero; stringa vuota se ≤ 0). */
export function formatMinutes(min: number | null | undefined): string {
  if (!min || min <= 0) return "";
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
}

/** True se l'input contiene un token unità (d/h/m). */
export function hasUnitToken(input: string): boolean {
  return /\d+\s*(d|h|m)/i.test(input.trim());
}
