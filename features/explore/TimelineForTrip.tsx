"use client";

/**
 * features/explore/TimelineForTrip.tsx
 * ─────────────────────────────────────────────────────────────────
 * Smart wrapper for the Explore Timeline. Given a tripId, fetches the
 * snapshot, resolves accommodations from the legacy days.accommodation_*
 * columns and renders the presentational Timeline organism.
 *
 * Keeps Timeline itself a pure dumb component — same snapshot can be
 * passed in directly (e.g. from a server component) without re-fetching.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { TripSnapshot } from "@/lib/dal";
import { cn } from "@/lib/cn";
import { Timeline, type TimelineDayData } from "./Timeline";
import { resolveAccommodations } from "./resolveAccommodations";

export function TimelineForTrip({
  tripId,
  injectSampleTransfers,
  className,
}: {
  tripId: string;
  injectSampleTransfers?: boolean;
  className?: string;
}) {
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.trips
      .get(tripId)
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load trip");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (loading && !snapshot) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-surface p-10 text-center text-mini text-ink-faint",
          className,
        )}
      >
        Caricamento…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "rounded-lg border border-danger-border bg-danger-bg p-6 text-mini text-danger-fg",
          className,
        )}
      >
        {error}
      </div>
    );
  }

  if (!snapshot || snapshot.days.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-surface p-10 text-center text-mini text-ink-faint",
          className,
        )}
      >
        Nessun giorno per questo viaggio.
      </div>
    );
  }

  const days: TimelineDayData[] = resolveAccommodations(snapshot.days);
  return (
    <Timeline
      days={days}
      injectSampleTransfers={injectSampleTransfers}
      className={className}
    />
  );
}
