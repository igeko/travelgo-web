import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";
import { resolveAccommodations } from "@/features/explore/resolveAccommodations";
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
  const snapshot = await dal.trips.getSnapshot(id);
  if (!snapshot) notFound();

  const { trip, days } = snapshot;
  // La Timeline organism legge `accommodation` per ogni giorno (catena
  // use_previous + night index). Lo stesso resolver usato dalla Timeline
  // canonica — qui niente di nuovo.
  const daysWithLodging = resolveAccommodations(days);

  // Stessa derivazione della pagina /explore — media delle coordinate degli
  // accommodation o fallback Tokyo, più il night-route precalcolato per
  // l'overlay opzionale.
  const located = days.filter(
    (d): d is typeof d & { accommodation_lat: number; accommodation_lng: number } =>
      d.accommodation_lat != null && d.accommodation_lng != null,
  );
  const center: LatLng = located.length
    ? {
        lat: located.reduce((sum, d) => sum + d.accommodation_lat, 0) / located.length,
        lng: located.reduce((sum, d) => sum + d.accommodation_lng, 0) / located.length,
      }
    : FALLBACK_CENTER;
  const nightRoute = selectNightRoute(days);

  return (
    <div className="h-screen flex flex-col bg-bg">
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
          zoom={located.length ? 12 : 5}
          nightRoute={nightRoute}
        />
      </main>
    </div>
  );
}
