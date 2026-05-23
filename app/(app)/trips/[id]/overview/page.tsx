import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";
import { BoardingPassLive } from "@/features/trip/BoardingPassLive";
import { normalizeDestination, type TripHomeMeta } from "@/lib/trip-home/meta";
import { cn } from "@/lib/cn";
import { PAGE_PX } from "@/lib/layout";

export default async function TripOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dal, services, locale] = await Promise.all([serverDal(), serverServices(), getLocale()]);
  const [{ data: trip }, days, { user }] = await Promise.all([
    dal.trips.findById(id),
    dal.trips.getDays(id),
    services.users.me(),
  ]);

  if (!trip) notFound();

  const passengerName = user?.fullName?.trim().split(/\s+/)[0] || undefined;

  // Seed the client with the boarding section already cached on the trip for
  // this locale, so a returning visit paints the full pass with no fetch.
  const boarding = (trip.home_meta as TripHomeMeta | null)?.boarding;
  const initialBoarding =
    boarding && boarding.source === normalizeDestination(trip.title)
      ? boarding.byLocale[locale] ?? null
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeaderServer
        activeNav="trips"
        tripName={trip.title}
        tripProgress={days.length > 0 ? `${days.length} giorni` : undefined}
        activeTab="trip"
        tripId={id}
      />
      <main className={cn("flex-1 max-w-[1100px] mx-auto w-full py-6 flex flex-col gap-[18px]", PAGE_PX)}>
        <BoardingPassLive
          tripId={id}
          trip={trip}
          recordLocator={`TG-${id.slice(0, 6).toUpperCase()}`}
          passengerName={passengerName}
          destinationTitle={trip.title}
          initialBoarding={initialBoarding}
        />
      </main>
    </div>
  );
}
