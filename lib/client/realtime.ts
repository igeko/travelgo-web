/**
 * lib/client/realtime.ts — frontend client for live trip updates.
 *
 * Wraps the (currently Supabase) realtime SDK so hooks/components never
 * import `getBrowserClient` or the provider's channel API directly. The
 * provider-specific bits (channel naming, postgres_changes, presence
 * sync/track) live here; callers get plain callbacks and an unsubscribe.
 */
import { getBrowserClient } from "@/lib/dal/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/** A DB row-change event, decoupled from the provider's generic shape. */
export type RowChange = RealtimePostgresChangesPayload<Record<string, unknown>>;

/** Presence metadata tracked for each connected viewer. */
export type ViewerPresence = {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  onlineAt: string;
};

export type SubscribeTripOptions = {
  tripId: string;
  /** This client's presence payload (also used to exclude self from viewers). */
  self: ViewerPresence;
  onDayChange?: (change: RowChange) => void;
  onActivityChange?: (change: RowChange) => void;
  onSectionChange?: (change: RowChange) => void;
  /** Current set of OTHER connected viewers (self excluded). */
  onViewers?: (viewers: ViewerPresence[]) => void;
  /** Connection status transitions. */
  onConnected?: (connected: boolean) => void;
};

export type TripSubscription = { unsubscribe: () => void };

export const realtime = {
  /**
   * Subscribe to a trip's DB changes + presence. Returns an unsubscribe
   * handle; call it on teardown.
   */
  subscribeTrip(opts: SubscribeTripOptions): TripSubscription {
    const supabase = getBrowserClient();
    const channel = supabase.channel(`trip:${opts.tripId}`, {
      config: { presence: { key: opts.self.userId } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "days", filter: `trip_id=eq.${opts.tripId}` },
        (payload) => opts.onDayChange?.(payload),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities", filter: `trip_id=eq.${opts.tripId}` },
        (payload) => opts.onActivityChange?.(payload),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_sections" },
        (payload) => opts.onSectionChange?.(payload),
      );

    if (opts.onViewers) {
      // "sync" fires on every presence change (join/leave included), so a
      // single handler that recomputes the full set is sufficient.
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<ViewerPresence>();
        // A user with multiple tabs/connections appears multiple times; keep
        // one entry per userId so consumers can key on it safely.
        const byUser = new Map<string, ViewerPresence>();
        for (const p of Object.values(state).flat()) {
          if (p.userId === opts.self.userId || byUser.has(p.userId)) continue;
          byUser.set(p.userId, {
            userId: p.userId,
            fullName: p.fullName,
            avatarUrl: p.avatarUrl,
            onlineAt: p.onlineAt,
          });
        }
        opts.onViewers!([...byUser.values()]);
      });
    }

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        opts.onConnected?.(true);
        await channel.track(opts.self);
      }
      if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        opts.onConnected?.(false);
      }
    });

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  },
};
