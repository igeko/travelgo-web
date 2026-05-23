"use client";

/**
 * BoardingPassLive — progressive wrapper around <BoardingPass>.
 *
 * The server renders this with the trip facts it already has (and any meta
 * already cached on the trip). On mount, if the AI boarding meta for the
 * current locale is missing, it fetches it and fills in airport / country /
 * welcome. The pass renders instantly in its minimal state and hydrates when
 * the answer arrives — no blocking the first paint.
 */

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { api } from "@/lib/client";
import type { BoardingLocaleMeta } from "@/lib/trip-home/meta";
import type { TripAirport } from "@/lib/trip-home/airports";
import { BoardingPass } from "./BoardingPass";

type Props = {
  tripId: string;
  /** Trip facts in the persisted schema (passed straight to BoardingPass). */
  trip: React.ComponentProps<typeof BoardingPass>["trip"];
  recordLocator?: string;
  passengerName?: string;
  /** Destination title shown until the AI resolves a cleaner city. */
  destinationTitle: string;
  /** Boarding section already cached on the trip for the current locale, if any. */
  initialBoarding?: BoardingLocaleMeta | null;
  /** User-set airports — override the AI-inferred legs when present. */
  departureAirport?: TripAirport | null;
  arrivalAirport?: TripAirport | null;
};

export function BoardingPassLive({
  tripId,
  trip,
  recordLocator,
  passengerName,
  destinationTitle,
  initialBoarding,
  departureAirport,
  arrivalAirport,
}: Props) {
  const locale = useLocale();
  const [boarding, setBoarding] = useState<BoardingLocaleMeta | null>(initialBoarding ?? null);

  useEffect(() => {
    if (boarding) return;
    let active = true;
    api.trips
      .homeMeta(tripId, locale)
      .then((home) => active && setBoarding(home.boarding))
      .catch(() => {
        /* keep the minimal pass — the destination is still shown */
      });
    return () => {
      active = false;
    };
  }, [tripId, locale, boarding]);

  // User-set airports win over the AI guess; otherwise fall back to the boarding meta.
  const origin =
    departureAirport && (departureAirport.city || departureAirport.iata)
      ? { city: departureAirport.city, code: departureAirport.iata || undefined }
      : undefined;

  const destCity = arrivalAirport?.city || boarding?.city || destinationTitle;
  const destCode = arrivalAirport?.iata || boarding?.airport || undefined;

  return (
    <BoardingPass
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
  );
}
