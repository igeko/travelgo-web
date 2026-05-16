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
import { browserDal } from "@/lib/dal";
import { getGoContext, type GoFocus, type TripInfo } from "./context";

type UseTripContextResult = {
  context: string | undefined;
  loading: boolean;
  error: string | null;
};

export function useTripContext(
  tripId: string | null | undefined,
  focus?: GoFocus,
): UseTripContextResult {
  const [context, setContext] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setContext(undefined);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      const dal = browserDal();

      const [tripRes, daysRes, activitiesRes, membersRes] = await Promise.all([
        dal.trips.findById(tripId!),
        dal.days.listByTrip(tripId!),
        dal.activities.listByTrip(tripId!),
        dal.members.listByTrip(tripId!),
      ]);

      if (cancelled) return;

      if (tripRes.error || !tripRes.data) {
        setError(tripRes.error?.message ?? "Trip not found");
        setLoading(false);
        return;
      }
      if (daysRes.error) {
        setError(daysRes.error.message);
        setLoading(false);
        return;
      }
      if (activitiesRes.error) {
        setError(activitiesRes.error.message);
        setLoading(false);
        return;
      }

      const info: TripInfo = {
        trip: tripRes.data,
        days: daysRes.data ?? [],
        activities: activitiesRes.data ?? [],
        travelersCount: membersRes.data?.length ?? undefined,
      };

      setContext(getGoContext(info, focus));
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [tripId, focus]);

  return { context, loading, error };
}
