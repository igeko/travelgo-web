"use client";

import { useEffect } from "react";
import { useTripGo } from "@/features/go/TripGoContext";
import { useTripContext } from "@/features/go/useTripContext";
import type { GoChatPosition } from "@/features/go/GoChatFloat";

/**
 * Opens the Go chat float by default on the Explore page and keeps its trip
 * context hydrated. Renders nothing — side effects only.
 */
export function ExploreGoLauncher({
  tripId,
  position = "right",
}: {
  tripId: string;
  position?: GoChatPosition;
}) {
  const { setTripContext, openGo, setGoPosition, setGoWideWidth } = useTripGo();
  const { context } = useTripContext(tripId);

  // Anchor the float, then open Go once when the Explore page mounts.
  useEffect(() => {
    setGoPosition(position);
    openGo();
  }, [openGo, setGoPosition, position]);

  // On the map, the wide panel grows less in width (400px); reset on leave.
  useEffect(() => {
    setGoWideWidth(400);
    return () => setGoWideWidth(650);
  }, [setGoWideWidth]);

  // Keep Go's trip context up to date.
  useEffect(() => {
    if (context) setTripContext(context);
  }, [context, setTripContext]);

  return null;
}
