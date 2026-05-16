"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/features/app/AppHeader";
import { TripDayView } from "./TripDayView";
import { useUser } from "@/features/app/UserContext";
import type { Trip, Day, Activity } from "@/lib/dal/trips";

function EmptyTripState({ trip }: { trip: Trip }) {
  return (
    <div className="max-w-[1280px] mx-auto px-5 py-16 flex flex-col items-center text-center gap-4">
      <div className="text-[48px]">🗺️</div>
      <h2 className="text-[22px] font-semibold text-ink">{trip.title}</h2>
      <p className="text-[14px] text-ink-soft max-w-[340px]">
        Il viaggio è stato creato ma non hai ancora aggiunto le date.
        Aggiungi un intervallo di date per generare il programma giorno per giorno.
      </p>
      <div className="mt-2 px-5 py-3 rounded-xl border border-dashed border-border bg-surface text-[13px] text-ink-soft">
        Funzionalità per modificare le date del viaggio in arrivo.
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
  const { user, isLoggedIn, isDev, isTester } = useUser();

  const storageKey = `trip-edit-mode-${trip.id}`;
  const [editMode, setEditMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "true") setEditMode(true);
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(editMode));
  }, [editMode, storageKey]);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        tripName={trip.title}
        tripProgress={days.length > 0 ? `${days.length} giorni` : undefined}
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
          />
        )}
      </div>
    </div>
  );
}
