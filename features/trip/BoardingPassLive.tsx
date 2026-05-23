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
};

export function BoardingPassLive({
  tripId,
  trip,
  recordLocator,
  passengerName,
  destinationTitle,
  initialBoarding,
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

  return (
    <BoardingPass
      trip={trip}
      recordLocator={recordLocator}
      passengerName={passengerName}
      destination={
        boarding
          ? {
              city: boarding.city,
              code: boarding.airport,
              country: boarding.country,
              countryColor: boarding.countryColor ?? undefined,
            }
          : { city: destinationTitle }
      }
      goQuote={boarding?.welcome || undefined}
    />
  );
}
