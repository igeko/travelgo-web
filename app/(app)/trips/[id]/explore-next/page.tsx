import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";
import { resolveAccommodations } from "@/features/explore/resolveAccommodations";
import { ExploreNextShell } from "./ExploreNextShell";

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
        <ExploreNextShell days={daysWithLodging} />
      </main>
    </div>
  );
}
