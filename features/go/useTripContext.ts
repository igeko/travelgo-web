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
import { api } from "@/lib/client";
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
      let snapshot;
      try {
        snapshot = await api.trips.get(tripId!);
      } catch {
        if (cancelled) return;
        setError("Failed to load trip");
        setLoading(false);
        return;
      }
      if (cancelled) return;

      const activities: Activity[] = snapshot.days.flatMap((d) => d.activities);

      // The trip snapshot is slimmer than DbTrip/DbDay; getGoContext tolerates
      // the missing optional fields (traveler counts / theme).
      const info = {
        trip: snapshot.trip,
        days: snapshot.days,
        activities,
      } as unknown as TripInfo;

      setContext(getGoContext(info, focus));
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [tripId, focus, enabled]);

  return { context, loading, error };
}
