"use client";

/**
 * useTripRealtime
 * ─────────────────────────────────────────────────────────────────
 * Gestisce due canali Supabase Realtime per un trip:
 *
 * 1. DB changes — ascolta INSERT/UPDATE/DELETE su days, activities,
 *    activity_sections per il trip corrente e chiama i callback
 *    corrispondenti.
 *
 * 2. Presence — traccia gli utenti connessi alla stessa trip,
 *    espone la lista dei "viewer" attivi.
 *
 * Usage:
 *   const { viewers, isConnected } = useTripRealtime(tripId, userId, {
 *     onDayChange: (payload) => refetchDays(),
 *     onActivityChange: (payload) => refetchActivities(),
 *   });
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from "react";
import { realtime, type RowChange, type ViewerPresence } from "@/lib/client/realtime";

export type TripViewer = ViewerPresence;

export type TripRealtimeCallbacks = {
  onDayChange?: (payload: RowChange) => void;
  onActivityChange?: (payload: RowChange) => void;
  onSectionChange?: (payload: RowChange) => void;
};

export function useTripRealtime(
  tripId: string | undefined,
  currentUser: { id: string; fullName: string; avatarUrl?: string } | null,
  callbacks: TripRealtimeCallbacks = {},
) {
  const [viewers, setViewers] = useState<TripViewer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!tripId || !currentUser) return;

    const sub = realtime.subscribeTrip({
      tripId,
      self: {
        userId: currentUser.id,
        fullName: currentUser.fullName,
        avatarUrl: currentUser.avatarUrl ?? "",
        onlineAt: new Date().toISOString(),
      },
      onDayChange: (p) => callbacksRef.current.onDayChange?.(p),
      onActivityChange: (p) => callbacksRef.current.onActivityChange?.(p),
      onSectionChange: (p) => callbacksRef.current.onSectionChange?.(p),
      onViewers: setViewers,
      onConnected: setIsConnected,
    });

    return () => {
      sub.unsubscribe();
      setIsConnected(false);
      setViewers([]);
    };
  }, [tripId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { viewers, isConnected };
}
