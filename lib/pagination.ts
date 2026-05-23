/**
 * lib/pagination.ts — shared offset-pagination primitives.
 *
 * Neutral (no server/client deps) so both the DAL/services and the frontend
 * client can import the same `Page<T>` shape. Offset-based: simple and a good
 * fit for "load more" lists where stable cursoring isn't required.
 */

/** A page of results plus whether more exist after it. */
export type Page<T> = { items: T[]; hasMore: boolean };

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

/** Parse raw `limit`/`offset` query strings into clamped, safe integers. */
export function parsePageParams(
  rawLimit: string | null,
  rawOffset: string | null,
): { limit: number; offset: number } {
  const limit = clampInt(rawLimit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = clampInt(rawOffset, 0, 0, Number.MAX_SAFE_INTEGER);
  return { limit, offset };
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw == null ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
