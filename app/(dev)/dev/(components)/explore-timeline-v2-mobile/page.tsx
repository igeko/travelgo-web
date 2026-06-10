"use client";

/**
 * Sandbox · Explore Timeline V2 · Mobile
 * URL: /dev/explore-timeline-v2-mobile
 *
 * Porting in produzione del mock `/design/timeline-readability` (sezione
 * Mobile). La Timeline vive dentro un phone-frame 300×620 — stesso
 * pattern visivo della Gallery del design (peek/half/full), ma qui c'è
 * solo lo stato "full" perché in questa iterazione costruiamo il
 * componente Timeline mobile, non lo sheet container.
 *
 * Source toggle "real" (snapshot via API) / "mock" (riusa MOCK_DAYS della
 * sandbox v1 — stesso shape).
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { TripSnapshot } from "@/lib/dal";
import { TimelineV2Mobile } from "@/features/explore/TimelineV2Mobile";
import { resolveAccommodations } from "@/features/explore/resolveAccommodations";
import { StatePicker } from "../_components/StatePicker";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { MOCK_DAYS } from "../explore-timeline/mock";

const JAPAN_2026 = "47c851d1-ee78-4a85-99d0-431fb7c0bf8a";

type Source = "real" | "mock";

export default function ExploreTimelineV2MobileSandboxPage() {
  const [source, setSource] = useState<Source>("mock");
  const [tripId, setTripId] = useState(JAPAN_2026);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [injectTransfers, setInjectTransfers] = useState(true);

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
        <h1 className="mb-2 text-3xl font-bold text-ink">Timeline (v2) · mobile</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Porting del mock <code>/design/timeline-readability</code> (sezione
          Mobile). Day strip orizzontale sticky in alto, rail 30px, row sm
          (badge 20px, font 12px, grip 40% sempre visibile per touch),
          NightCard compatta. Drop-in dentro un bottom-sheet — qui la
          incorniciamo in un phone-frame 300×620 per validare le proporzioni.
        </p>

        {/* ── Control zone ─────────────────────────────────────── */}
        <section className="mb-8 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <StatePicker
            label="source"
            value={source}
            options={["real", "mock"] as const}
            onChange={setSource}
          />

          <label
            className={cn(
              "flex flex-col gap-1",
              source === "mock" && "opacity-40 pointer-events-none",
            )}
          >
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
            Inserisci transfer di esempio tra le soste
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

        {/* ── Phone frame ───────────────────────────────────────── */}
        <section className="flex justify-center">
          <PhoneFrame>
            {source === "mock" ? (
              <TimelineV2Mobile days={days} injectSampleTransfers={injectTransfers} />
            ) : error ? (
              <div className="rounded-md border border-danger-border bg-danger-bg p-3 text-mini text-danger-fg">
                {error}
                <p className="mt-2 text-ink-soft">
                  Apri questa pagina in una sessione loggata, oppure passa a{" "}
                  <strong>source: mock</strong>.
                </p>
              </div>
            ) : loading && !snapshot ? (
              <div className="rounded-md border border-border bg-surface p-6 text-center text-mini text-ink-faint">
                Caricamento…
              </div>
            ) : days.length === 0 ? (
              <div className="rounded-md border border-border bg-surface p-6 text-center text-mini text-ink-faint">
                Nessun giorno.
              </div>
            ) : (
              <TimelineV2Mobile days={days} injectSampleTransfers={injectTransfers} />
            )}
          </PhoneFrame>
        </section>

        {/* ── Note di handoff ──────────────────────────────────── */}
        <section className="mt-10 rounded-lg border border-border bg-surface p-4 text-mini leading-relaxed text-ink-soft">
          <h2 className="mb-2 text-meta font-semibold text-ink">Note di handoff</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-4">
            <li>
              Stesso shape di Props di <code>TimelineV2</code>: drop-in.{" "}
              <strong>NON</strong> è responsive da sola — il caller sceglie
              quando montarla (es. <code>lg:hidden</code> per il mobile vs la
              desktop dietro <code>hidden lg:block</code>).
            </li>
            <li>
              Lo stato <code>open</code> di una row non è ridisegnato a misura
              mobile in questa iterazione: la card editor (StopEditorCard) resta
              quella desktop. Su sheet stretti resta leggibile, ma il prossimo
              passo è probabilmente uno sheet full-screen quando una row apre.
            </li>
            <li>
              Drag&amp;drop: stesso pattern della desktop (TouchSensor 200ms
              delay). Il grip resta sempre visibile al 40% (touch fallback al
              posto dell&apos;hover-only).
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

/** Cornice telefono 300×620 — stesso ratio del mock /design/timeline-readability. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full max-w-[300px] rounded-[28px] bg-[#1a1410] p-[6px] shadow-float"
      style={{ aspectRatio: "300 / 620" }}
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-[10px] z-50 h-[18px] w-[70px] -translate-x-1/2 rounded-[10px] bg-[#1a1410]"
      />
      <div className="relative h-full w-full overflow-y-auto rounded-[22px] bg-surface">
        {children}
      </div>
    </div>
  );
}
