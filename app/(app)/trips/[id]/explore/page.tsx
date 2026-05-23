import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";
import type { LatLng } from "@/components/ui/Map";
import { ExploreMap } from "./ExploreMap";
import { ExploreGoLauncher } from "./ExploreGoLauncher";
import { ExploreDebugPanel } from "./ExploreDebugPanel";

/** Tokyo — fallback center when the trip has no geocoded days yet. */
const FALLBACK_CENTER: LatLng = { lat: 35.6762, lng: 139.6503 };

export default async function TripExplorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dal = await serverDal();
  const [trip, days] = await Promise.all([dal.trips.getTrip(id), dal.trips.getDays(id)]);

  if (!trip) notFound();

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

  return (
    <div className="h-screen flex flex-col bg-bg">
      <AppHeaderServer
        activeNav="trips"
        tripName={trip.title}
        tripProgress={days.length > 0 ? `${days.length} giorni` : undefined}
        activeTab="explore"
        tripId={id}
      />
      <main className="flex-1 min-h-0">
        <ExploreMap tripId={id} center={center} zoom={located.length ? 12 : 5} />
      </main>
      <ExploreGoLauncher tripId={id} position="left" />
      <ExploreDebugPanel />
    </div>
  );
}
