import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";
import { cn } from "@/lib/cn";
import { PAGE_PX } from "@/lib/layout";

export default async function TripOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dal = await serverDal();
  const [trip, days] = await Promise.all([dal.trips.getTrip(id), dal.trips.getDays(id)]);

  if (!trip) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeaderServer
        activeNav="trips"
        tripName={trip.title}
        tripProgress={days.length > 0 ? `${days.length} giorni` : undefined}
        activeTab="trip"
        tripId={id}
      />
      <main className={cn("flex-1 max-w-[1280px] mx-auto w-full py-10", PAGE_PX)}>
        <p className="text-meta text-ink-faint">Pagina in costruzione.</p>
      </main>
    </div>
  );
}
