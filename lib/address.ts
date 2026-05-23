/**
 * lib/address.ts — client-side prettifier for a Google `formatted_address`.
 *
 * We only persist the raw formatted-address string (activities.location), not
 * structured address_components. These helpers make that string nicer to show
 * WITHOUT any extra Google call: strip postal codes / bare street numbers and
 * keep the meaningful geographic tail (e.g. "Shinjuku · Tokyo · Japan").
 *
 * Heuristic by nature — good enough for compact labels, not for parsing.
 */

/** Tokens containing a run of 3+ digits → postal codes / long numbers. */
const NUMERIC_TOKEN = /\S*\d{3,}\S*/g;

/** Clean, comma-split segments of a formatted address (noise removed, deduped). */
export function addressSegments(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.replace(NUMERIC_TOKEN, " ").replace(/\s{2,}/g, " ").trim())
    .filter((s, i, arr) => s.length > 0 && /\p{L}/u.test(s) && s !== arr[i - 1]);
}

/**
 * A compact label: the last `max` meaningful segments joined by " · ".
 * Falls back to the trimmed raw string if nothing could be parsed.
 */
export function compactAddress(raw?: string | null, max = 3): string {
  const segs = addressSegments(raw);
  if (segs.length === 0) return raw?.trim() ?? "";
  return segs.slice(-max).join(" · ");
}
