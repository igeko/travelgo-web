import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { TripShell } from "./TripShell";

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
  const [trip, days] = await Promise.all([dal.trips.getTrip(id), dal.trips.getDays(id)]);
  if (!trip) notFound();

  const dayNumber = dayParam ? parseInt(dayParam, 10) : NaN;
  const initialDay =
    (!isNaN(dayNumber) && days.find((d) => d.day_number === dayNumber)) ||
    days[0] ||
    null;
  const initialActivities = initialDay ? await dal.trips.getDayActivities(initialDay.id) : [];

  return (
    <TripShell
      trip={trip}
      days={days}
      initialActivities={initialActivities}
      initialDayId={initialDay?.id ?? null}
    />
  );
}
