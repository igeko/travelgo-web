"use client";

/**
 * Sandbox · Explore Timeline V2 (real trip data)
 * URL: /dev/explore-timeline-v2
 *
 * Versione attiva su `/trips/[id]/explore-next`. Layout: Route Rail +
 * Night Divider (porting dal prototipo `/design/timeline-readability` V1,
 * iterazione 9 — card pernottamento su superficie stay soft).
 *
 * Default trip: "Japan 2026!". Source toggle "real" (snapshot via API) /
 * "mock" (riusa il MOCK_DAYS della sandbox v1 — stesso shape).
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { TripSnapshot } from "@/lib/dal";
import { TimelineV2 } from "@/features/explore/TimelineV2";
import { resolveAccommodations } from "@/features/explore/resolveAccommodations";
import { StatePicker } from "../_components/StatePicker";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { MOCK_DAYS } from "./mock";

const JAPAN_2026 = "47c851d1-ee78-4a85-99d0-431fb7c0bf8a";

type Source = "real" | "mock";

export default function ExploreTimelineV2SandboxPage() {
  const [source, setSource] = useState<Source>("real");
  const [tripId, setTripId] = useState(JAPAN_2026);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [injectTransfers, setInjectTransfers] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await api.trips.get(id.trim()));
    } catch (e) {
      setSnapshot(null);
      setError(e instanceof Error ? e.message : "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(JAPAN_2026);
  }, [load]);

  const days = resolveAccommodations(
    source === "mock" ? MOCK_DAYS : (snapshot?.days ?? []),
  );
  const totalActs = days.reduce((n, d) => n + d.activities.length, 0);

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-start gap-3 rounded-md border border-success-border bg-success-bg p-3 text-mini text-success-fg">
          <span className="rounded-pill bg-success-fg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-success-bg">
            Active
          </span>
          <p>
            Versione attiva su <code>/trips/[id]/explore-next</code>. La{" "}
            <strong>v1</strong> resta visibile come riferimento in{" "}
            <a href="/dev/explore-timeline" className="underline">
              /dev/explore-timeline
            </a>
            .
          </p>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-ink">Timeline (v2)</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Route Rail + Night Divider — porting di{" "}
          <code>/design/timeline-readability</code> V1. Rail 44px continuo,
          targa data 44px nell'header, banda notte come card stay soft a 3 righe
          fra i giorni. Editor inline (open) e drag&amp;drop invariati rispetto
          alla v1: stessi `ActivityStop` / `Transfer` reali.
        </p>

        {/* ── Control zone ─────────────────────────────────────── */}
        <section className="mb-8 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <StatePicker
            label="source"
            value={source}
            options={["real", "mock"] as const}
            onChange={setSource}
          />

          <label className={cn("flex flex-col gap-1", source === "mock" && "opacity-40 pointer-events-none")}>
            <span className="text-micro uppercase tracking-eyebrow text-ink-faint">Trip ID</span>
            <div className="flex gap-2">
              <input
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load(tripId)}
                spellCheck={false}
                className={cn(
                  "min-w-0 flex-1 rounded-sm border border-border-strong bg-surface-input px-3 py-1.5",
                  "font-mono text-mini text-ink outline-none focus-visible:border-ink",
                )}
              />
              <Button size="md" variant="solid" tone="neutral" onClick={() => load(tripId)}>
                Load
              </Button>
              <Button
                size="md"
                variant="outline"
                onClick={() => {
                  setTripId(JAPAN_2026);
                  load(JAPAN_2026);
                }}
              >
                Japan 2026
              </Button>
            </div>
          </label>

          <label className="flex items-center gap-2 text-mini text-ink-soft">
            <input
              type="checkbox"
              checked={injectTransfers}
              onChange={(e) => setInjectTransfers(e.target.checked)}
            />
            Inserisci transfer di esempio tra le soste (il viaggio non ha dati bridge)
          </label>

          <p className="text-micro text-ink-faint">
            {source === "mock"
              ? `Mock · ${days.length} giorni · ${totalActs} attività`
              : loading
                ? "Caricamento…"
                : error
                  ? `Errore: ${error}`
                  : snapshot
                    ? `${snapshot.trip.title} · ${days.length} giorni · ${totalActs} attività`
                    : "—"}
          </p>
        </section>

        {/* ── Timeline V2 ──────────────────────────────────────── */}
        {source === "mock" ? (
          <TimelineV2 days={days} injectSampleTransfers={injectTransfers} />
        ) : error ? (
          <div className="rounded-lg border border-danger-border bg-danger-bg p-6 text-mini text-danger-fg">
            {error}
            <p className="mt-2 text-ink-soft">
              Apri questa pagina in una sessione loggata (membro del viaggio), oppure passa a
              <strong> source: mock</strong> qui sopra per verificare il layout.
            </p>
          </div>
        ) : loading && !snapshot ? (
          <div className="rounded-lg border border-border bg-surface p-10 text-center text-mini text-ink-faint">
            Caricamento…
          </div>
        ) : days.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-10 text-center text-mini text-ink-faint">
            Nessun giorno per questo viaggio.
          </div>
        ) : (
          <TimelineV2 days={days} injectSampleTransfers={injectTransfers} />
        )}
      </main>
    </div>
  );
}
