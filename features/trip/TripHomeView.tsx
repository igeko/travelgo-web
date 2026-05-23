"use client";

/**
 * TripHomeView — client shell for the Trip Home.
 *
 * Reads the per-trip edit-mode flag (shared with the day-by-day via the same
 * localStorage key) and adapts: edit mode off shows the boarding-pass home,
 * edit mode on shows the trip settings editor. The header's Edit chip toggles
 * that same flag.
 */

import { useTranslations } from "next-intl";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { useUser } from "@/features/app/UserContext";
import { AppHeader } from "@/features/app/AppHeader";
import { BoardingPassLive } from "./BoardingPassLive";
import { TripEdit } from "./TripEdit";
import { cn } from "@/lib/cn";
import { PAGE_MAX, PAGE_PX } from "@/lib/layout";
import type { DbTrip } from "@/lib/dal/types";
import type { BoardingLocaleMeta } from "@/lib/trip-home/meta";
import { parseAirport } from "@/lib/trip-home/airports";

type Props = {
  trip: DbTrip;
  daysCount: number;
  recordLocator: string;
  passengerName?: string;
  initialBoarding?: BoardingLocaleMeta | null;
};

export function TripHomeView({ trip, daysCount, recordLocator, passengerName, initialBoarding }: Props) {
  const t = useTranslations("TripShell");
  const { user, isLoggedIn, isDev, isTester } = useUser();
  const [editMode, setEditMode] = useLocalStorageState<boolean>(`trip-edit-mode-${trip.id}`, false);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        tripName={trip.title}
        tripProgress={daysCount > 0 ? t("daysCount", { count: daysCount }) : undefined}
        activeTab="trip"
        tripId={trip.id}
        editMode={editMode}
        onToggleEditMode={() => setEditMode((v) => !v)}
        isDev={isDev}
        isTester={isTester}
        isLoggedIn={isLoggedIn}
        initials={user?.initials ?? ""}
        avatarUrl={user?.avatarUrl ?? ""}
        fullName={user?.fullName ?? ""}
      />
      <main className={cn("flex-1 w-full mx-auto py-6 flex flex-col gap-[18px]", PAGE_MAX, PAGE_PX)}>
        {editMode ? (
          <TripEdit tripId={trip.id} trip={trip} onClose={() => setEditMode(false)} />
        ) : (
          <BoardingPassLive
            tripId={trip.id}
            trip={trip}
            recordLocator={recordLocator}
            passengerName={passengerName}
            destinationTitle={trip.title}
            initialBoarding={initialBoarding ?? null}
            departureAirport={parseAirport(trip.departure_airport)}
            arrivalAirport={parseAirport(trip.arrival_airport)}
          />
        )}
      </main>
    </div>
  );
}
