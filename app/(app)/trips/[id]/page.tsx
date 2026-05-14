import { notFound } from "next/navigation";
import { getTrip, getTripDays, getDayActivities } from "@/lib/dal/trips";
import { getServerClient } from "@/lib/dal/supabase";
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

  const [trip, days, supabase] = await Promise.all([
    getTrip(id),
    getTripDays(id),
    getServerClient(),
  ]);

  if (!trip || !days.length) notFound();

  const dayNumber = dayParam ? parseInt(dayParam, 10) : NaN;
  const initialDay =
    (!isNaN(dayNumber) && days.find((d) => d.day_number === dayNumber)) ||
    days[0];
  const initialActivities = await getDayActivities(initialDay.id);

  /* Auth */
  let isLoggedIn = false;
  let initials = "";
  let avatarUrl = "";
  let fullName = "";
  let isDev = false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      fullName = user.user_metadata?.full_name ?? user.email ?? "";
      avatarUrl = user.user_metadata?.avatar_url ?? "";
      initials = fullName
        .split(/\s+/)
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("");

      const { data: roleRow } = await supabase
        .from("user_platform_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "dev")
        .maybeSingle();
      isDev = !!roleRow;
    }
  } catch { /* env mancanti */ }

  return (
    <TripShell
      trip={trip}
      days={days}
      initialActivities={initialActivities}
      initialDayId={initialDay.id}
      isLoggedIn={isLoggedIn}
      initials={initials}
      avatarUrl={avatarUrl}
      fullName={fullName}
      isDev={isDev}
    />
  );
}
