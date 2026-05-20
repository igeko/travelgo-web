"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { AppHeader } from "@/features/app/AppHeader";
import { TripDayView } from "./TripDayView";
import { useUser } from "@/features/app/UserContext";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import { TripViewers } from "@/features/trip/TripViewers";
import type { Trip, Day, Activity } from "@/lib/dal/domain";

function EmptyTripState({ trip }: { trip: Trip }) {
  const t = useTranslations("TripShell");
  return (
    <div className="max-w-[1280px] mx-auto px-5 py-16 flex flex-col items-center text-center gap-4">
      <div className="text-[48px]">🗺️</div>
      <h2 className="text-[22px] font-semibold text-ink">{trip.title}</h2>
      <p className="text-[14px] text-ink-soft max-w-[340px]">
        {t("empty.body")} {t("empty.hint")}
      </p>
      <div className="mt-2 px-5 py-3 rounded-xl border border-dashed border-border bg-surface text-meta text-ink-soft">
        {t("empty.comingSoon")}
      </div>
    </div>
  );
}

type Props = {
  trip: Trip;
  days: Day[];
  initialActivities: Activity[];
  initialDayId: string | null;
};

export function TripShell({ trip, days, initialActivities, initialDayId }: Props) {
  const t = useTranslations("TripShell");
  const { user, isLoggedIn, isDev, isTester } = useUser();

  const storageKey = `trip-edit-mode-${trip.id}`;
  const [editMode, setEditMode] = useLocalStorageState<boolean>(storageKey, false);
  const [debugMode, setDebugMode] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Realtime — sincronizzazione tra client
  const handleRemoteChange = useCallback(() => {
    setReloadTick((t) => t + 1);
  }, []);

  const currentUser = user ? { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl } : null;
  const { viewers, isConnected } = useTripRealtime(trip.id, currentUser, {
    onDayChange: handleRemoteChange,
    onActivityChange: handleRemoteChange,
    onSectionChange: handleRemoteChange,
  });

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        tripName={trip.title}
        tripProgress={days.length > 0 ? t("daysCount", { count: days.length }) : undefined}
        activeTab="day-by-day"
        tripId={trip.id}
        editMode={editMode}
        onToggleEditMode={() => setEditMode((v) => !v)}
        isDev={isDev}
        isTester={isTester}
        debugMode={debugMode}
        onToggleDebugMode={() => setDebugMode((v) => !v)}
        isLoggedIn={isLoggedIn}
        initials={user?.initials ?? ""}
        avatarUrl={user?.avatarUrl ?? ""}
        fullName={user?.fullName ?? ""}
      />
      {/* Presenza altri utenti — sotto l'header, sopra il contenuto */}
      {viewers.length > 0 && (
        <div className="bg-surface border-b border-border px-5 py-2 flex items-center">
          <TripViewers viewers={viewers} isConnected={isConnected} />
        </div>
      )}

      <div className="flex-1">
        {days.length === 0 ? (
          <EmptyTripState trip={trip} />
        ) : (
          <TripDayView
            trip={trip}
            days={days}
            initialActivities={initialActivities}
            initialDayId={initialDayId!}
            editMode={editMode}
            debugMode={debugMode}
            reloadTick={reloadTick}
          />
        )}
      </div>
    </div>
  );
}
