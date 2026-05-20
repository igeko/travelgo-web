"use client";

import { useEffect, useMemo, useState } from "react";
import type { DayNarrative, DescribeDayActivity } from "@/app/api/ai/describe-day/route";
import type { Day } from "@/lib/dal/domain";
import { api } from "@/lib/client";

/* ─────────────────────────────────────────────────────────────────
   useDayNarrative
   Fetches (or returns cached) the AI narrative for a day.

   Priority order (no forceTick):
   1. day.narrative from DB   — persisted, survives everything
   2. localStorage cache      — fast path for same-session re-renders
   3. fetch from AI           — generates + saves to DB + localStorage

   On regenerate():
   - Clears localStorage + sets forceTick → skips both caches → re-fetches
   - Saves fresh result back to DB and localStorage
───────────────────────────────────────────────────────────────── */

export type NarrativeStatus = "idle" | "loading" | "ok" | "error";

export type UseDayNarrativeResult = {
  narrative: DayNarrative | null;
  status: NarrativeStatus;
  /** Force a re-fetch, ignoring all caches */
  regenerate: () => void;
};

/** Cheap stable hash of the activity content relevant for the narrative */
function hashActivities(acts: DescribeDayActivity[]): string {
  return acts
    .map((a) => `${a.id}|${a.slot}|${a.time}|${a.name}|${a.description ?? ""}`)
    .join("§");
}

const CACHE_PREFIX = "travelgo:narrative:v7:";

/**
 * Normalise narratives that were saved with the old pullQuote shape
 * { activityId, text } → string
 */
function normalise(n: DayNarrative): DayNarrative {
  const pq = n.pullQuote as unknown;
  if (pq && typeof pq === "object" && "text" in pq) {
    return { ...n, pullQuote: (pq as { text: string }).text };
  }
  return n;
}

function readCache(key: string): DayNarrative | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? normalise(JSON.parse(raw) as DayNarrative) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: DayNarrative): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private browsing — ignore
  }
}

async function saveToDb(dayId: string, narrative: DayNarrative): Promise<void> {
  try {
    await api.days.update(dayId, { narrative });
  } catch (err) {
    console.warn("[useDayNarrative] DB save failed (non-blocking)", err);
  }
}

export function useDayNarrative(
  day: Day | null | undefined,
  activities: DescribeDayActivity[],
  /** Only fetch when enabled (i.e. racconto view is active) */
  enabled: boolean,
): UseDayNarrativeResult {
  const [forceTick, setForceTick] = useState(0);
  // Result of an AI fetch, tagged with the cacheKey + forceTick it was made for
  // so loading/error/ok can be derived during render (no setState-in-effect).
  const [fetched, setFetched] = useState<{
    key: string;
    tick: number;
    narrative: DayNarrative | null;
    error: boolean;
  } | null>(null);

  const dayId = day?.id;
  const hash = hashActivities(activities);
  const cacheKey = `${dayId}:${hash}`;
  const active = enabled && !!dayId && activities.length > 0;

  // Synchronous fast paths, derived (not stored): DB narrative (prop) then the
  // localStorage cache. Both skipped on a forced regenerate (forceTick > 0).
  // readCache is SSR-safe (returns null when localStorage is unavailable).
  const dayNarrative = day?.narrative;
  const dbNarrative = useMemo(
    () => (active && forceTick === 0 && dayNarrative ? normalise(dayNarrative as DayNarrative) : null),
    [active, forceTick, dayNarrative],
  );
  const cachedNarrative = useMemo(
    () => (active && forceTick === 0 && !dbNarrative ? readCache(cacheKey) : null),
    [active, forceTick, dbNarrative, cacheKey],
  );
  const syncNarrative = dbNarrative ?? cachedNarrative;
  const hasSync = syncNarrative !== null;

  useEffect(() => {
    if (!active) return;

    // Warm localStorage from the DB narrative for a fast path next time.
    if (dbNarrative) {
      writeCache(cacheKey, dbNarrative);
      return;
    }
    // A cached narrative already satisfies the request — nothing to fetch.
    if (hasSync) return;

    // ── Fetch from AI ─────────────────────────────────────────────
    let cancelled = false;
    (async () => {
      try {
        const data = await api.ai.describeDay<DayNarrative>({
          dayId,
          label: day!.label ?? day!.city ?? "Giorno",
          zone: day!.city ?? undefined,
          type: day!.day_type ?? undefined,
          summary: day!.summary ?? undefined,
          activities,
        });
        if (cancelled) return;
        setFetched({ key: cacheKey, tick: forceTick, narrative: data, error: false });
        writeCache(cacheKey, data);
        // Fire-and-forget — persist to DB so it survives across sessions
        saveToDb(dayId, data);
      } catch (err) {
        console.error("[useDayNarrative]", err);
        if (!cancelled) setFetched({ key: cacheKey, tick: forceTick, narrative: null, error: true });
      }
    })();

    return () => { cancelled = true; };
  // dayId/hash captured via cacheKey
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cacheKey, forceTick, dbNarrative, hasSync]);

  function regenerate() {
    try { localStorage.removeItem(CACHE_PREFIX + cacheKey); } catch { /* */ }
    setForceTick((t) => t + 1);
  }

  if (!active) return { narrative: null, status: "idle", regenerate };
  if (syncNarrative) return { narrative: syncNarrative, status: "ok", regenerate };

  const f = fetched && fetched.key === cacheKey && fetched.tick === forceTick ? fetched : null;
  if (f) return { narrative: f.narrative, status: f.error ? "error" : "ok", regenerate };
  return { narrative: null, status: "loading", regenerate };
}
