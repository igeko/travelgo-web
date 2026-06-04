"use client";

/**
 * Sandbox · Explore Timeline (real trip data)
 * URL: /dev/explore-timeline
 *
 * Loads a trip snapshot (api.trips.get) and renders the Explore Timeline
 * organism from its real scheduled activities. Default trip: "Japan 2026!".
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { TripSnapshot } from "@/lib/dal";
import { Timeline } from "@/features/explore/Timeline";
import { StatePicker } from "../_components/StatePicker";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { MOCK_DAYS } from "./mock";

const JAPAN_2026 = "47c851d1-ee78-4a85-99d0-431fb7c0bf8a";

type Source = "real" | "mock";

export default function ExploreTimelineSandboxPage() {
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

  // Auto-load the default trip once on mount. The mock toggle only swaps
  // what's rendered — it never refetches — so `source` stays out of deps.
  useEffect(() => {
    load(JAPAN_2026);
  }, [load]);

  const days = source === "mock" ? MOCK_DAYS : (snapshot?.days ?? []);
  const totalActs = days.reduce((n, d) => n + d.activities.length, 0);

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">Timeline</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Figma <strong>Timeline</strong> · organismo Explore alimentato dalle attività
          programmate reali del viaggio. Gli orari sulla spina sono allineati alle attività.
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

        {/* ── Timeline ─────────────────────────────────────────── */}
        {source === "mock" ? (
          <Timeline days={days} injectSampleTransfers={injectTransfers} />
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
          <Timeline days={days} injectSampleTransfers={injectTransfers} />
        )}
      </main>
    </div>
  );
}
