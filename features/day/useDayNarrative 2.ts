"use client";

import { useEffect, useRef, useState } from "react";
import type { DayNarrative, DescribeDayActivity } from "@/app/api/ai/describe-day/route";
import type { Day } from "@/lib/dal/trips";

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

async function saveToDb(dayId: string, narrative: DayNarrative): Promise<void> {
  try {
    await fetch(`/api/trips/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ narrative }),
    });
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

    // ── 1. DB narrative (skip on forced regenerate) ───────────────
    if (forceTick === 0 && day?.narrative) {
      const dbNarrative = day.narrative as DayNarrative;
      setNarrative(dbNarrative);
      setStatus("ok");
      // Also warm localStorage so we have a fast path on next render
      writeCache(cacheKey, dbNarrative);
      return;
    }

    // ── 2. localStorage cache (skip on forced regenerate) ─────────
    if (forceTick === 0) {
      const cached = readCache(cacheKey);
      if (cached) {
        setNarrative(cached);
        setStatus("ok");
        return;
      }
    }

    // ── 3. Fetch from AI ──────────────────────────────────────────
    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        const res = await fetch("/api/ai/describe-day", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayId,
            label: day!.label ?? day!.city ?? "Giorno",
            zone: day!.city ?? undefined,
            type: day!.day_type ?? undefined,
            summary: day!.summary ?? undefined,
            activities,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as DayNarrative;

        if (!cancelled) {
          setNarrative(data);
          setStatus("ok");
          writeCache(cacheKey, data);
          // Fire-and-forget — persist to DB so it survives across sessions
          saveToDb(dayId, data);
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
    try { localStorage.removeItem(CACHE_PREFIX + cacheKey); } catch { /* */ }
    forceRef.current += 1;
    setForceTick(forceRef.current);
    setNarrative(null);
  }

  return { narrative, status, regenerate };
}
