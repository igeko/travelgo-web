import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { AppHeader } from "@/features/app/AppHeader";

export default async function TripOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dal = await serverDal();
  const [trip, days] = await Promise.all([dal.trips.getTrip(id), dal.trips.getDays(id)]);

  if (!trip) notFound();

  let isLoggedIn = false;
  let initials = "";
  let avatarUrl = "";
  let fullName = "";
  let isDev = false;

  try {
    const { data: user } = await dal.users.getCurrentUser();
    if (user) {
      isLoggedIn = true;
      fullName = user.user_metadata?.full_name ?? user.email ?? "";
      avatarUrl = user.user_metadata?.avatar_url ?? "";
      initials = fullName
        .split(/\s+/)
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("");
      isDev = await dal.users.hasPlatformRole(user.id, ["dev"]);
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
        <p className="text-meta text-ink-faint">Pagina in costruzione.</p>
      </main>
    </div>
  );
}
