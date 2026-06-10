import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { accommodationsFromNights } from "@/features/explore/resolveAccommodations";
import { TripShell } from "./TripShell";

// La pagina viene rigenerata server-side dopo ogni mutazione del lodging
// (create/update/remove via /api/accommodation-stays). Forziamo dynamic
// per evitare che Next cachi l'RSC payload e router.refresh restituisca
// dati stantii (stesso pattern di explore-next).
export const dynamic = "force-dynamic";

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { id } = await params;
  const { day: dayParam } = await searchParams;

  const dal = await serverDal();
  // Carichiamo nights insieme a trip+days: il pannello lodging della
  // daybyday ora legge dalla mappa canonical `accommodation_nights` →
  // `accommodation_stays` (modello nuovo). I campi legacy
  // `days.accommodation_*` restano in DB ma non vengono più letti.
  const [trip, days, nightsResult] = await Promise.all([
    dal.trips.getTrip(id),
    dal.trips.getDays(id),
    dal.accommodations.listNightsByTrip(id),
  ]);
  if (!trip) notFound();

  const nights = nightsResult.data ?? [];
  const daysWithLodging = accommodationsFromNights(nights, days);

  const dayNumber = dayParam ? parseInt(dayParam, 10) : NaN;
  const initialDay =
    (!isNaN(dayNumber) && daysWithLodging.find((d) => d.day_number === dayNumber)) ||
    daysWithLodging[0] ||
    null;
  const initialActivities = initialDay ? await dal.trips.getDayActivities(initialDay.id) : [];

  return (
    <TripShell
      trip={trip}
      days={daysWithLodging}
      initialActivities={initialActivities}
      initialDayId={initialDay?.id ?? null}
    />
  );
}
