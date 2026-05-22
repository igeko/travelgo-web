/**
 * lib/client/routeCache.ts — client-side cache for day route geometry.
 *
 * Avoids re-calling the Google Routes proxy every time a map remounts
 * (e.g. navigating back to a day). Only the *geometry* (encoded polyline,
 * a sequence of lat/lng) is stored.
 *
 * Google Maps Platform Terms: lat/lng content may be temporarily cached for
 * up to 30 consecutive days, then must be refreshed/deleted. We honour that
 * with TTL_MS and prune-on-write. Place IDs and traffic/time-sensitive
 * results are intentionally NOT handled here (transit options are never
 * cached — they depend on departure time).
 *
 * Invalidation is implicit: the cache key is a fingerprint of the exact
 * request (rounded coordinates, in order, + travel mode). Any change to a
 * day's stops — edit, reorder, add/remove, or a different transport mode —
 * yields a new key, so the old geometry is simply never read again and ages
 * out via TTL/eviction. Leg colours don't affect the key (they don't reach
 * the proxy), so re-colouring never triggers a refetch.
 */

import type { LatLng } from "./routes";

const KEY = "tg:routeCache:v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — Google ToS ceiling for lat/lng
const MAX_ENTRIES = 300; // bound localStorage footprint; oldest evicted first

type Entry = { p: string; t: number };
type Store = Record<string, Entry>;

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readStore(): Store {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded / storage disabled — degrade silently to no-cache.
  }
}

/**
 * Stable fingerprint for a routing request. Coordinates are rounded to ~0.1 m
 * so insignificant float jitter doesn't fragment the cache, while any real
 * stop change (or mode change) still produces a distinct key.
 */
export function routeCacheKey(points: LatLng[], travelMode: string): string {
  const coords = points
    .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)
    .join(";");
  return `${travelMode}|${coords}`;
}

/** Cached encoded polyline for this key, or null if absent/expired. */
export function getCachedPolyline(key: string): string | null {
  if (!hasStorage()) return null;
  const store = readStore();
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.t > TTL_MS) {
    delete store[key];
    writeStore(store);
    return null;
  }
  return entry.p;
}

/** Store an encoded polyline, pruning expired entries and capping the size. */
export function setCachedPolyline(key: string, polyline: string): void {
  if (!hasStorage() || !polyline) return;
  const store = readStore();
  const now = Date.now();

  // Drop expired entries on every write.
  for (const k of Object.keys(store)) {
    if (now - store[k].t > TTL_MS) delete store[k];
  }

  store[key] = { p: polyline, t: now };

  // Cap: evict oldest until within budget.
  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => store[a].t - store[b].t)
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete store[k]);
  }

  writeStore(store);
}

/** Remove the entire route cache (e.g. on logout or for debugging). */
export function clearRouteCache(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
