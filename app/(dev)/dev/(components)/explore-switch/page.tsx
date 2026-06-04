"use client";

/**
 * Sandbox · Explore SegmentToggle (Figma "Switch")
 * URL: /dev/explore-switch
 */

import { useState } from "react";
import { SegmentToggle } from "@/features/explore/SegmentToggle";
import { IconBed, IconMapPin } from "@/components/ui/icons";

type SleepStop = "sleep" | "stop";

const SLEEP_STOP = [
  { key: "sleep" as const, label: "Sleep", icon: IconBed },
  { key: "stop" as const, label: "Stop", icon: IconMapPin },
];

export default function ExploreSwitchSandboxPage() {
  const [live, setLive] = useState<SleepStop>("sleep");

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">SegmentToggle</h1>
        <p className="mb-8 text-sm text-ink-soft">
          Figma <strong>Switch</strong> (SwitcherV2) · toggle segmentato icona+label.
          Track <code>bg-bg</code>, segmento attivo bianco. Usato nella card Activity
          (Sleep/Stop). Primitivo controllato, nessuna logica di dominio.
        </p>

        {/* Live */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-ink">Live</h2>
          <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
            <div className="w-[160px]">
              <SegmentToggle
                value={live}
                onChange={setLive}
                options={SLEEP_STOP}
                ariaLabel="Lodging mode"
              />
            </div>
            <p className="text-mini text-ink-soft">
              Selected: <strong className="text-ink">{live}</strong>
            </p>
          </div>
        </section>

        {/* Both states (matches Figma variants) */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-ink">Variants</h2>
          <div className="flex flex-wrap gap-8 rounded-lg border border-border bg-surface p-6">
            <div className="flex flex-col gap-2">
              <span className="text-micro uppercase tracking-eyebrow text-ink-faint">
                Sleep selected
              </span>
              <div className="w-[160px]">
                <SegmentToggle value="sleep" onChange={() => {}} options={SLEEP_STOP} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-micro uppercase tracking-eyebrow text-ink-faint">
                Stop selected
              </span>
              <div className="w-[160px]">
                <SegmentToggle value="stop" onChange={() => {}} options={SLEEP_STOP} />
              </div>
            </div>
          </div>
        </section>

        {/* Generic — no icons, 3 options */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">Generic (no icons)</h2>
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="w-[260px]">
              <SegmentToggle
                value="all"
                onChange={() => {}}
                options={[
                  { key: "all", label: "All" },
                  { key: "todo", label: "To do" },
                  { key: "done", label: "Done" },
                ]}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
