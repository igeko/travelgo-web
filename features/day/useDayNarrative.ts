"use client";

import { useEffect, useRef, useState } from "react";
import type { DayNarrative, DescribeDayActivity } from "@/app/api/ai/describe-day/route";
import type { Day } from "@/lib/dal/trips";

/* ─────────────────────────────────────────────────────────────────
   useDayNarrative
   Fetches (or returns cached) the AI narrative for a day.

   Cache strategy:
   - Key: `narrative:${dayId}:${activitiesHash}`
   - Stored in localStorage so it survives page refreshes.
   - If the activities change (hash mismatch) → re-fetch.
───────────────────────────────────────────────────────────────── */

export type NarrativeStatus = "idle" | "loading" | "ok" | "error";

export type UseDayNarrativeResult = {
  narrative: DayNarrative | null;
  status: NarrativeStatus;
  /** Force a re-fetch, ignoring the cache */
  regenerate: () => void;
};

/** Cheap stable hash of the activity content relevant for the narrative */
function hashActivities(acts: DescribeDayActivity[]): string {
  return acts
    .map((a) => `${a.id}|${a.slot}|${a.time}|${a.name}|${a.description ?? ""}`)
    .join("§");
}

const CACHE_PREFIX = "travelgo:narrative:";

function readCache(key: string): DayNarrative | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as DayNarrative) : null;
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

export function useDayNarrative(
  day: Day | null | undefined,
  activities: DescribeDayActivity[],
  /** Only fetch when enabled (i.e. racconto view is active) */
  enabled: boolean
): UseDayNarrativeResult {
  const [narrative, setNarrative] = useState<DayNarrative | null>(null);
  const [status, setStatus] = useState<NarrativeStatus>("idle");
  const forceRef = useRef(0);
  const [forceTick, setForceTick] = useState(0);

  const dayId = day?.id;
  const hash = hashActivities(activities);
  const cacheKey = `${dayId}:${hash}`;

  useEffect(() => {
    if (!enabled || !dayId || activities.length === 0) {
      setStatus("idle");
      return;
    }

    // Check cache first (unless regenerate was called)
    if (forceTick === 0) {
      const cached = readCache(cacheKey);
      if (cached) {
        setNarrative(cached);
        setStatus("ok");
        return;
      }
    }

    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        const res = await fetch("/api/ai/describe-day", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayId,
            label: day.label ?? day.city ?? "Giorno",
            zone: day.city ?? undefined,
            type: day.day_type ?? undefined,
            summary: day.summary ?? undefined,
            activities,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as DayNarrative;

        if (!cancelled) {
          setNarrative(data);
          setStatus("ok");
          writeCache(cacheKey, data);
        }
      } catch (err) {
        console.error("[useDayNarrative]", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, dayId, hash, forceTick]);

  function regenerate() {
    // Clear cache for this key and force a re-fetch
    try { localStorage.removeItem(CACHE_PREFIX + cacheKey); } catch { /* */ }
    forceRef.current += 1;
    setForceTick(forceRef.current);
    setNarrative(null);
  }

  return { narrative, status, regenerate };
}
