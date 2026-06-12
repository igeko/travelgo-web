import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";
import { accommodationsFromNights } from "@/features/explore/resolveAccommodations";
import { selectNightRoute } from "@/lib/explore/nightRoute";
import type { LatLng } from "@/components/ui/Map";
import { ExploreNextShell } from "./ExploreNextShell";

// La pagina viene rigenerata server-side dopo ogni mutazione (Add to Trip,
// Remove). Forziamo dynamic per evitare che Next.js cachi l'RSC payload
// e router.refresh() restituisca dati stantii.
export const dynamic = "force-dynamic";

/** Tokyo — fallback centre when the trip has no geocoded days yet. */
const FALLBACK_CENTER: LatLng = { lat: 35.6762, lng: 139.6503 };

/**
 * Explore (next) — surface parallela alla Explore attuale, usata come palestra
 * per la prossima iterazione: RouteMap full-bleed, panel sinistro (search +
 * Timeline) e ExploreToolbar verticale a destra. I tre componenti sono per ora
 * volutamente non integrati con la mappa: la composizione è puramente di
 * layout, l'orchestrazione si aggiunge incrementalmente.
 */
export default async function TripExploreNextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dal = await serverDal();
  const [snapshot, nightsResult] = await Promise.all([
    dal.trips.getSnapshot(id),
    dal.accommodations.listNightsByTrip(id),
  ]);
  if (!snapshot) notFound();

  const { trip, days } = snapshot;
  // Project accommodation_nights onto each day. Each night carries its
  // stay + Property activity, so the Timeline gets stay_id + lat/lng/url/…
  // straight from the canonical source — no more reading days.accommodation_*.
  const nights = nightsResult.data ?? [];
  const daysWithLodging = accommodationsFromNights(nights, days);

  // Map centre: average the Property activity coordinates of every night.
  // Falls back to Tokyo when no stay has been geocoded yet.
  const locatedNights = nights.filter(
    (n): n is typeof n & {
      stay: typeof n.stay & {
        activity: typeof n.stay.activity & { location_lat: number; location_lng: number };
      };
    } =>
      n.stay.activity.location_lat != null && n.stay.activity.location_lng != null,
  );
  const center: LatLng = locatedNights.length
    ? {
        lat:
          locatedNights.reduce((sum, n) => sum + n.stay.activity.location_lat, 0) /
          locatedNights.length,
        lng:
          locatedNights.reduce((sum, n) => sum + n.stay.activity.location_lng, 0) /
          locatedNights.length,
      }
    : FALLBACK_CENTER;
  // selectNightRoute still reads the legacy days.accommodation_* columns;
  // we'll migrate it once the night-route overlay is reactivated.
  const nightRoute = selectNightRoute(days);

  return (
    <div className="h-dvh flex flex-col bg-bg">
      <AppHeaderServer
        activeNav="trips"
        tripName={trip.title}
        tripProgress={days.length > 0 ? `${days.length} giorni` : undefined}
        activeTab="explore-next"
        tripId={id}
      />
      <main className="flex-1 min-h-0 relative">
        <ExploreNextShell
          tripId={id}
          days={daysWithLodging}
          center={center}
          zoom={locatedNights.length ? 12 : 5}
          nightRoute={nightRoute}
        />
      </main>
    </div>
  );
}
