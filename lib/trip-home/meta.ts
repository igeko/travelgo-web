/**
 * lib/trip-home/meta.ts
 * ─────────────────────────────────────────────────────────────────
 * Shape of the AI-generated home content persisted on `trips.home_meta`
 * (a single JSONB column). Sections are added here as the Trip Home grows;
 * for now it only carries the boarding-pass meta.
 *
 * Locale-specific fields (country name, welcome) are cached per locale so
 * switching language reuses what's already been generated.
 * ─────────────────────────────────────────────────────────────────
 */

/** Boarding-pass meta resolved by the AI, for a single locale. */
export type BoardingLocaleMeta = {
  /** Cleaned destination city, e.g. "Tokyo" (the hero of the pass). */
  city: string;
  /** Localized country name, e.g. "Japan" / "Giappone". */
  country: string;
  /** Flag accent color (hex) for the header dot, or null. */
  countryColor: string | null;
  /** Most probable destination airport, IATA code (e.g. "HND"). */
  airport: string;
  /** Short welcome line shown under the countdown. */
  welcome: string;
};

export type BoardingMeta = {
  /** Normalized destination this was generated for — used to detect staleness. */
  source: string;
  /** Per-locale resolved content. */
  byLocale: Record<string, BoardingLocaleMeta>;
};

/** Place-card meta resolved by the AI, for a single locale. */
export type PlaceLocaleMeta = {
  /** Compact facts line, e.g. "37 MLN · UTC+9" (population · timezone). */
  facts: string;
  /** One-line notable caption, e.g. "Capitale dal 1868." */
  caption: string;
};

export type PlaceMeta = {
  source: string;
  byLocale: Record<string, PlaceLocaleMeta>;
};

/**
 * Everything stored in `trips.home_meta` — the AI content for the whole Trip
 * Home. Sections are added here as the home grows (know-before-you-go, trip
 * recap, …); each caches its own per-locale data.
 */
export type TripHomeMeta = {
  boarding?: BoardingMeta;
  place?: PlaceMeta;
};

/**
 * The home meta projected for a single locale — what the client consumes.
 * One field per section; null while a section hasn't been resolved yet.
 */
export type HomeMeta = {
  boarding: BoardingLocaleMeta | null;
  place: PlaceLocaleMeta | null;
};

/** Normalizes a trip title/destination for staleness comparison. */
export function normalizeDestination(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}
