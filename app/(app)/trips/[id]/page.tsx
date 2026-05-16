import { notFound } from "next/navigation";
import { getTrip, getTripDays, getDayActivities } from "@/lib/dal/trips";
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

  const [trip, days] = await Promise.all([getTrip(id), getTripDays(id)]);
  if (!trip) notFound();

  const dayNumber = dayParam ? parseInt(dayParam, 10) : NaN;
  const initialDay =
    (!isNaN(dayNumber) && days.find((d) => d.day_number === dayNumber)) ||
    days[0] ||
    null;
  const initialActivities = initialDay ? await getDayActivities(initialDay.id) : [];

  return (
    <TripShell
      trip={trip}
      days={days}
      initialActivities={initialActivities}
      initialDayId={initialDay?.id ?? null}
    />
  );
}
