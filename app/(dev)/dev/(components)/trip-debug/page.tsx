/**
 * app/(dev)/dev/(components)/trip-debug/page.tsx
 *
 * Pagina di diagnosi per la pipeline `effectiveDays → buildTripChain →
 * chainToRouteSpecs` di Explore Next. Server component: prende `?trip=<uuid>`,
 * ricostruisce lo snapshot + le accommodation projection esattamente come
 * la pagina reale, applica il chain, mostra:
 *
 *   1. days[].activities → coords + typeof (per beccare numeric→string)
 *   2. days[].accommodation derivata da accommodation_nights
 *   3. TripStop[] prodotto da buildTripChain
 *   4. RouteSpec[] prodotto da chainToRouteSpecs (con i punti finali che
 *      verranno inviati a Google Routes)
 *   5. Il body esatto della POST /api/routes che la mappa farebbe per
 *      ogni gruppo — pronto da copiare per un curl di verifica
 *
 * Usa l'auth corrente, RLS-scoped come la Explore page. Niente azioni,
 * solo lettura. Sta sotto /dev → bloccata in prod via DevLayout.
 */

import { serverDal } from "@/lib/dal";
import { accommodationsFromNights } from "@/features/explore/resolveAccommodations";
import { buildTripChain, chainToRouteSpecs } from "@/features/explore/tripChain";

export default async function TripDebugPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string }>;
}) {
  const { trip: tripId } = await searchParams;
  if (!tripId) return <DebugShell><InputForm /></DebugShell>;

  const dal = await serverDal();
  const [snapshot, nightsResult] = await Promise.all([
    dal.trips.getSnapshot(tripId),
    dal.accommodations.listNightsByTrip(tripId),
  ]);
  if (!snapshot) {
    return (
      <DebugShell>
        <InputForm value={tripId} />
        <p className="mt-4 text-sm text-red-600">Trip non trovato (o non autorizzato).</p>
      </DebugShell>
    );
  }
  const nights = nightsResult.data ?? [];
  const daysWithLodging = accommodationsFromNights(nights, snapshot.days);
  const chain = buildTripChain(daysWithLodging);
  const routes = chainToRouteSpecs(chain, () => 0.8, "#0d2c3d");

  return (
    <DebugShell>
      <InputForm value={tripId} />

      <h2 className="text-lg font-semibold">{snapshot.trip.title}</h2>
      <p className="text-sm text-ink-soft">
        Trip <code>{tripId}</code> · {snapshot.days.length} giorni · {nights.length} notti accommodation
      </p>

      {/* ── 1. Days raw ─────────────────────────────────────────── */}
      <Section title="1) Giorni — activities + accommodation (con typeof coords)">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-soft text-left">
              <Th>Day</Th>
              <Th>Activities</Th>
              <Th>Accommodation</Th>
            </tr>
          </thead>
          <tbody>
            {daysWithLodging.map((d) => (
              <tr key={d.id} className="border-b border-border align-top">
                <Td>
                  <b>{d.day_number}</b>
                  <div className="text-ink-faint">{d.date}</div>
                  <div className="text-ink-faint truncate max-w-[8rem]" title={d.id}>{d.id.slice(0, 8)}…</div>
                </Td>
                <Td>
                  {d.activities.length === 0 && <span className="text-ink-faint">—</span>}
                  {d.activities
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((a) => (
                      <div key={a.id} className="mb-1">
                        <code>#{a.position}</code> {a.title}
                        <div className="text-ink-faint">
                          lat={String(a.location_lat)} <Type v={a.location_lat} /> · lng=
                          {String(a.location_lng)} <Type v={a.location_lng} />
                        </div>
                      </div>
                    ))}
                </Td>
                <Td>
                  {!d.accommodation && <span className="text-ink-faint">—</span>}
                  {d.accommodation && (
                    <>
                      <div>{d.accommodation.name}</div>
                      <div className="text-ink-faint">
                        stay_id={d.accommodation.stay_id?.slice(0, 8)}… · night
                        {" "}{d.accommodation.night_index + 1}/{d.accommodation.nights_total}
                      </div>
                      <div className="text-ink-faint">
                        lat={String(d.accommodation.lat)} <Type v={d.accommodation.lat} /> · lng=
                        {String(d.accommodation.lng)} <Type v={d.accommodation.lng} />
                      </div>
                    </>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── 2. Chain ────────────────────────────────────────────── */}
      <Section title={`2) TripStop[] — chain canonico (${chain.length} stop)`}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-soft text-left">
              <Th>#</Th><Th>kind</Th><Th>dayId</Th><Th>title</Th><Th>lat</Th><Th>lng</Th>
            </tr>
          </thead>
          <tbody>
            {chain.map((s) => (
              <tr key={s.id} className="border-b border-border">
                <Td>{s.chainIndex}</Td>
                <Td>{s.kind}</Td>
                <Td className="font-mono text-ink-faint">{s.dayId.slice(0, 8)}…</Td>
                <Td>{s.title}</Td>
                <Td>{String(s.lat)} <Type v={s.lat} /></Td>
                <Td>{String(s.lng)} <Type v={s.lng} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── 3. RouteSpec ────────────────────────────────────────── */}
      <Section title={`3) RouteSpec[] — gruppi per dayId (${routes.length})`}>
        {routes.length === 0 && <p className="text-ink-faint text-sm">Nessun gruppo (chain &lt; 2 stop).</p>}
        {routes.map((r) => (
          <div key={r.id} className="mb-3">
            <div className="font-mono text-xs"><b>{r.id}</b> · travelMode={r.travelMode} · {r.points.length} punti</div>
            <ol className="ml-5 text-xs list-decimal">
              {r.points.map((p, i) => (
                <li key={i} className="font-mono">
                  {String(p.lat)} <Type v={p.lat} />, {String(p.lng)} <Type v={p.lng} />
                </li>
              ))}
            </ol>
          </div>
        ))}
      </Section>

      {/* ── 4. Request body Google ───────────────────────────────── */}
      <Section title="4) Body POST /api/routes per ogni gruppo (curl-ready)">
        {routes.map((r) => (
          <div key={r.id} className="mb-3">
            <div className="font-mono text-xs mb-1"><b>{r.id}</b></div>
            <pre className="bg-ink/5 p-2 text-[10px] overflow-x-auto rounded">{JSON.stringify({
              points: r.points,
              travelMode: r.travelMode,
            }, null, 2)}</pre>
          </div>
        ))}
      </Section>
    </DebugShell>
  );
}

function DebugShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Trip debug — Explore Next chain</h1>
      <p className="text-sm text-ink-soft">
        Ricostruisce la pipeline `days → buildTripChain → chainToRouteSpecs` esattamente come la
        pagina reale, per beccare divergenze (coord come stringa, accommodation mancante, ecc.).
      </p>
      {children}
    </div>
  );
}

function InputForm({ value }: { value?: string }) {
  return (
    <form className="flex gap-2" action="">
      <input
        type="text"
        name="trip"
        defaultValue={value ?? ""}
        placeholder="trip UUID"
        className="flex-1 px-3 py-1.5 border border-border rounded font-mono text-sm"
      />
      <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded text-sm">
        Carica
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded p-3">
      <h3 className="font-semibold text-sm mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-1 font-medium">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1 ${className ?? ""}`}>{children}</td>;
}

/** Inline badge col typeof a runtime — accende la spia se Postgres `numeric`
 *  arriva al client come stringa anziché number, causando rotture downstream. */
function Type({ v }: { v: unknown }) {
  const t = typeof v;
  const color = t === "number" ? "text-emerald-600" : t === "string" ? "text-red-600 font-bold" : "text-ink-faint";
  return <span className={`text-[10px] ${color}`}>[{t}]</span>;
}
