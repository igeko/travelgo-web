import { notFound } from "next/navigation";
import { getTrip, getTripDays } from "@/lib/dal/trips";
import { getServerClient } from "@/lib/dal/supabase";
import { AppHeader } from "@/features/app/AppHeader";

export default async function TripOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [trip, days, supabase] = await Promise.all([
    getTrip(id),
    getTripDays(id),
    getServerClient(),
  ]);

  if (!trip) notFound();

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
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        tripName={trip.title}
        tripProgress={days.length > 0 ? `${days.length} giorni` : undefined}
        activeTab="trip"
        isDev={isDev}
        isLoggedIn={isLoggedIn}
        initials={initials}
        avatarUrl={avatarUrl}
        fullName={fullName}
        tripId={id}
      />
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-5 py-10">
        <p className="text-[13px] text-ink-faint">Pagina in costruzione.</p>
      </main>
    </div>
  );
}
