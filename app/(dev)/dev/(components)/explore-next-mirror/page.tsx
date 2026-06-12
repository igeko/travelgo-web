/**
 * app/(dev)/dev/(components)/explore-next-mirror/page.tsx
 *
 * Mirror visivo della pagina `/trips/[id]/explore-next`, per il debug del
 * chain → markers / routes / Timeline transfers. Stessa pipeline di
 * fetching e proiezione delle accommodation; il client component sotto
 * costruisce il chain e renderizza in parallelo:
 *
 *   - TimelineV2 (sinistra) con i Transfer in/out e i chain prev
 *   - ExploreMap (destra) coi pin del chain (chainToMarkers) e i path
 *     per giorno (chainToRouteSpecs)
 *
 * Read-only: niente add-to-trip, niente DnD, niente mutazioni — la
 * pagina è una "verifica visiva" del path. Usa ?trip=<uuid>; se manca
 * mostra un input.
 */

import { notFound } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { accommodationsFromNights } from "@/features/explore/resolveAccommodations";
import { selectNightRoute } from "@/lib/explore/nightRoute";
import type { LatLng } from "@/components/ui/Map";
import { ExploreNextMirrorClient } from "./Client";

export const dynamic = "force-dynamic";

const FALLBACK_CENTER: LatLng = { lat: 35.6762, lng: 139.6503 };

export default async function ExploreNextMirrorPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string }>;
}) {
  const { trip: tripId } = await searchParams;
  if (!tripId) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Explore Next mirror</h1>
        <p className="text-sm text-ink-soft">
          Mirror visivo di <code>/trips/[id]/explore-next</code> per debug
          path/pernottamenti. Inserisci l&apos;UUID del trip.
        </p>
        <InputForm />
      </div>
    );
  }

  const dal = await serverDal();
  const [snapshot, nightsResult] = await Promise.all([
    dal.trips.getSnapshot(tripId),
    dal.accommodations.listNightsByTrip(tripId),
  ]);
  if (!snapshot) notFound();

  const { trip, days } = snapshot;
  const nights = nightsResult.data ?? [];
  const daysWithLodging = accommodationsFromNights(nights, days);

  const locatedNights = nights.filter(
    (n) =>
      n.stay.activity.location_lat != null &&
      n.stay.activity.location_lng != null,
  );
  const center: LatLng = locatedNights.length
    ? {
        lat:
          locatedNights.reduce((sum, n) => sum + (n.stay.activity.location_lat as number), 0) /
          locatedNights.length,
        lng:
          locatedNights.reduce((sum, n) => sum + (n.stay.activity.location_lng as number), 0) /
          locatedNights.length,
      }
    : FALLBACK_CENTER;
  const nightRoute = selectNightRoute(days);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
        <div>
          <div className="text-tiny font-medium uppercase tracking-eyebrow text-ink-faint">
            Explore Next mirror · read-only
          </div>
          <div className="text-meta font-semibold text-ink">{trip.title}</div>
        </div>
        <div className="text-tiny text-ink-soft">
          <code>{tripId}</code> · {days.length} giorni · {nights.length} notti
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <ExploreNextMirrorClient
          tripId={tripId}
          days={daysWithLodging}
          center={center}
          zoom={locatedNights.length ? 10 : 5}
          nightRoute={nightRoute}
        />
      </main>
    </div>
  );
}

function InputForm() {
  return (
    <form className="flex gap-2" action="">
      <input
        type="text"
        name="trip"
        placeholder="trip UUID"
        className="flex-1 px-3 py-1.5 border border-border rounded font-mono text-sm"
      />
      <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded text-sm">
        Carica
      </button>
    </form>
  );
}
