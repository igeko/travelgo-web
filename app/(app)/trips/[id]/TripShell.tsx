"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/features/app/AppHeader";
import { TripDayView } from "./TripDayView";
import type { Trip, Day, Activity } from "@/lib/dal/trips";

type Props = {
  trip: Trip;
  days: Day[];
  initialActivities: Activity[];
  initialDayId: string;
  /* Auth props forwarded from server */
  isLoggedIn: boolean;
  initials: string;
  avatarUrl: string;
  fullName: string;
};

export function TripShell({
  trip,
  days,
  initialActivities,
  initialDayId,
  isLoggedIn,
  initials,
  avatarUrl,
  fullName,
}: Props) {
  const storageKey = `trip-edit-mode-${trip.id}`;
  const [editMode, setEditMode] = useState(false);

  // Legge localStorage solo dopo il mount, evitando l'hydration mismatch
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
        tripProgress={`${days.length} giorni`}
        activeTab="day-by-day"
        editMode={editMode}
        onToggleEditMode={() => setEditMode((v) => !v)}
        isLoggedIn={isLoggedIn}
        initials={initials}
        avatarUrl={avatarUrl}
        fullName={fullName}
      />
      <div className="flex-1">
        <TripDayView
          trip={trip}
          days={days}
          initialActivities={initialActivities}
          initialDayId={initialDayId}
          editMode={editMode}
        />
      </div>
    </div>
  );
}
