"use client";

/**
 * features/go/useTripContext.ts
 *
 * Hook che carica i dati di un viaggio da Supabase e li converte
 * nella stringa di contesto da passare a GoChat (tripContext prop).
 *
 * Usage:
 *   const { context, loading, error } = useTripContext(tripId, focus);
 */

import { useEffect, useState } from "react";
import type { Activity } from "@/lib/dal/domain";
import { getGoContext, type GoFocus, type TripInfo } from "./context";

type UseTripContextResult = {
  context: string | undefined;
  loading: boolean;
  error: string | null;
};

export function useTripContext(
  tripId: string | null | undefined,
  focus?: GoFocus,
  enabled = true,
): UseTripContextResult {
  const [context, setContext] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !tripId) {
      setContext(undefined);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      const res = await fetch(`/api/trips/${tripId}`);
      if (cancelled) return;

      if (!res.ok) {
        setError(`Failed to load trip (${res.status})`);
        setLoading(false);
        return;
      }

      const snapshot = await res.json();
      if (cancelled) return;

      const activities: Activity[] = snapshot.days.flatMap((d: any) => d.activities);

      const info: TripInfo = {
        trip: snapshot.trip,
        days: snapshot.days,
        activities,
      };

      setContext(getGoContext(info, focus));
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [tripId, focus, enabled]);

  return { context, loading, error };
}
