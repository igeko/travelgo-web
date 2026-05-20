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
  const active = enabled && !!tripId;
  // Identifies the current request; results are tagged with it so loading/error
  // can be derived during render (no synchronous setState inside the effect).
  const requestKey = active ? `${tripId}:${JSON.stringify(focus ?? null)}` : "";
  const [result, setResult] = useState<{
    key: string;
    context: string | undefined;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    (async () => {
      try {
        const snapshot = await api.trips.get(tripId!);
        if (cancelled) return;

        const activities: Activity[] = snapshot.days.flatMap((d) => d.activities);

        // The trip snapshot is slimmer than DbTrip/DbDay; getGoContext tolerates
        // the missing optional fields (traveler counts / theme).
        const info = {
          trip: snapshot.trip,
          days: snapshot.days,
          activities,
        } as unknown as TripInfo;

        setResult({ key: requestKey, context: getGoContext(info, focus), error: null });
      } catch {
        if (cancelled) return;
        setResult({ key: requestKey, context: undefined, error: "Failed to load trip" });
      }
    })();

    return () => { cancelled = true; };
  // tripId/focus are captured via requestKey
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, active]);

  if (!active) return { context: undefined, loading: false, error: null };
  const ready = result?.key === requestKey;
  return {
    context: ready ? result.context : undefined,
    loading: !ready,
    error: ready ? result.error : null,
  };
}
