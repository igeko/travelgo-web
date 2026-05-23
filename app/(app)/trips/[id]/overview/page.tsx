import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";
import { TripHomeView } from "@/features/trip/TripHomeView";
import { normalizeDestination, type TripHomeMeta } from "@/lib/trip-home/meta";

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

  // Seed the client with sections already cached on the trip for this locale,
  // so a returning visit paints the home with no fetch.
  const home = trip.home_meta as TripHomeMeta | null;
  const src = normalizeDestination(trip.title);
  const initialBoarding =
    home?.boarding && home.boarding.source === src ? home.boarding.byLocale[locale] ?? null : null;
  const initialPlace =
    home?.place && home.place.source === src ? home.place.byLocale[locale] ?? null : null;

  return (
    <TripHomeView
      trip={trip}
      daysCount={days.length}
      recordLocator={`TG-${id.slice(0, 6).toUpperCase()}`}
      passengerName={passengerName}
      initialBoarding={initialBoarding}
      initialPlace={initialPlace}
    />
  );
}
