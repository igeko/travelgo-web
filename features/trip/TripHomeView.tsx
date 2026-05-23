"use client";

/**
 * TripHomeView — client shell for the Trip Home.
 *
 * Reads the per-trip edit-mode flag (shared with the day-by-day via the same
 * localStorage key) and adapts: edit mode off shows the boarding-pass home
 * (place card + boarding pass), edit mode on shows the trip settings editor.
 * The header's Edit chip toggles that same flag. A single useHomeMeta call
 * feeds every home widget.
 */

import { useTranslations } from "next-intl";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { useUser } from "@/features/app/UserContext";
import { AppHeader } from "@/features/app/AppHeader";
import { BoardingPass } from "./BoardingPass";
import { PlaceCard } from "./PlaceCard";
import { TripEdit } from "./TripEdit";
import { useHomeMeta } from "./useHomeMeta";
import { cn } from "@/lib/cn";
import { PAGE_MAX, PAGE_PX } from "@/lib/layout";
import type { DbTrip } from "@/lib/dal/types";
import type { BoardingLocaleMeta, PlaceLocaleMeta } from "@/lib/trip-home/meta";
import { parseAirport } from "@/lib/trip-home/airports";

type Props = {
  trip: DbTrip;
  daysCount: number;
  recordLocator: string;
  passengerName?: string;
  initialBoarding?: BoardingLocaleMeta | null;
  initialPlace?: PlaceLocaleMeta | null;
};

export function TripHomeView({ trip, daysCount, recordLocator, passengerName, initialBoarding, initialPlace }: Props) {
  const t = useTranslations("TripShell");
  const { user, isLoggedIn, isDev, isTester } = useUser();
  const [editMode, setEditMode] = useLocalStorageState<boolean>(`trip-edit-mode-${trip.id}`, false);

  const { boarding, place } = useHomeMeta(trip.id, {
    boarding: initialBoarding ?? null,
    place: initialPlace ?? null,
  });

  // Boarding-pass legs: user-set airports win over the AI guess.
  const dep = parseAirport(trip.departure_airport);
  const arr = parseAirport(trip.arrival_airport);
  const origin = dep && (dep.city || dep.iata) ? { city: dep.city, code: dep.iata || undefined } : undefined;
  const destCity = arr?.city || boarding?.city || trip.title;
  const destCode = arr?.iata || boarding?.airport || undefined;

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        tripName={trip.subtitle || trip.title}
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
          <div className="w-full max-w-[900px] mx-auto">
            <TripEdit tripId={trip.id} trip={trip} onClose={() => setEditMode(false)} />
          </div>
        ) : (
          <div className="flex flex-col gap-[18px] md:flex-row md:items-stretch">
            <PlaceCard
              className="md:w-[280px] md:shrink-0"
              city={trip.title}
              country={boarding?.country}
              facts={place?.facts || undefined}
              caption={place?.caption || undefined}
            />
            <BoardingPass
              className="md:flex-1"
              trip={trip}
              recordLocator={recordLocator}
              passengerName={passengerName}
              origin={origin}
              destination={{
                city: destCity,
                code: destCode,
                country: boarding?.country,
                countryColor: boarding?.countryColor ?? undefined,
              }}
              goQuote={boarding?.welcome || undefined}
            />
          </div>
        )}
      </main>
    </div>
  );
}
