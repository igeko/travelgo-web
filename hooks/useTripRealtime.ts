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
import { getBrowserClient } from "@/lib/dal/supabase";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type TripViewer = {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  onlineAt: string;
};

export type TripRealtimeCallbacks = {
  onDayChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onActivityChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onSectionChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
};

type PresenceState = {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  onlineAt: string;
};

export function useTripRealtime(
  tripId: string | undefined,
  currentUser: { id: string; fullName: string; avatarUrl?: string } | null,
  callbacks: TripRealtimeCallbacks = {},
) {
  const [viewers, setViewers] = useState<TripViewer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!tripId || !currentUser) return;

    const supabase = getBrowserClient();
    const channelName = `trip:${tripId}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUser.id } },
    });

    // ── DB changes ──────────────────────────────────────────────
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "days", filter: `trip_id=eq.${tripId}` },
        (payload) => callbacksRef.current.onDayChange?.(payload),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities", filter: `trip_id=eq.${tripId}` },
        (payload) => callbacksRef.current.onActivityChange?.(payload),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_sections" },
        (payload) => callbacksRef.current.onSectionChange?.(payload),
      );

    // ── Presence ─────────────────────────────────────────────────
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const active: TripViewer[] = Object.values(state)
          .flat()
          .filter((p) => p.userId !== currentUser.id)
          .map((p) => ({
            userId: p.userId,
            fullName: p.fullName,
            avatarUrl: p.avatarUrl,
            onlineAt: p.onlineAt,
          }));
        setViewers(active);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setViewers((prev) => {
          const incoming = newPresences
            .filter((p) => (p as PresenceState).userId !== currentUser.id)
            .map((p) => p as PresenceState)
            .map((p) => ({
              userId: p.userId,
              fullName: p.fullName,
              avatarUrl: p.avatarUrl,
              onlineAt: p.onlineAt,
            }));
          const ids = new Set(incoming.map((v) => v.userId));
          return [...prev.filter((v) => !ids.has(v.userId)), ...incoming];
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const leftIds = new Set(leftPresences.map((p) => (p as PresenceState).userId));
        setViewers((prev) => prev.filter((v) => !leftIds.has(v.userId)));
      });

    // Subscribe e track presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          userId: currentUser.id,
          fullName: currentUser.fullName,
          avatarUrl: currentUser.avatarUrl ?? "",
          onlineAt: new Date().toISOString(),
        });
      }
      if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
      setViewers([]);
    };
  }, [tripId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { viewers, isConnected };
}
