"use client";

/**
 * Sandbox · Explore Transfer (interactive)
 * URL: /dev/explore-transfer
 *
 * Demo del Transfer con il nuovo open-state interattivo (rif. /design
 * /transfer-mode): ModeSwitch + RouteVerifier. Le coords sono due POI
 * reali di Tokyo così walk/car/transit funzionano contro le Routes API.
 * onApply logga il bridge nella sezione "log apply" sotto.
 */

import { useState } from "react";
import {
  Transfer,
  type TransferLeg,
  type TransferMode,
  type TransferState,
} from "@/features/explore/Transfer";
import type { BridgeData } from "@/lib/dal/domain";
import { StatePicker } from "../_components/StatePicker";

const MODES: TransferMode[] = ["transit", "car", "walk"];
const STATES: TransferState[] = ["default", "hover", "open"];

const LEGS: TransferLeg[] = [
  { kind: "walk", label: "8 min" },
  { kind: "bus", label: "105" },
  { kind: "walk", label: "10 min" },
];

// Asakusa → Shinjuku Station (Tokyo) — i tre mode hanno tutti senso.
const ORIGIN = {
  lat: 35.7148,
  lng: 139.7967,
  placeId: "ChIJ8T1GpMGOGGAR_OXbHWzIfO0",
  label: "Asakusa",
};
const DESTINATION = {
  lat: 35.6896,
  lng: 139.7006,
  placeId: "ChIJ4_HrAkOMGGARsgU6XHkOhi0",
  label: "Shinjuku Station",
};

export default function ExploreTransferSandboxPage() {
  const [mode, setMode] = useState<TransferMode>("transit");
  const [forced, setForced] = useState<TransferState>("open");
  const [hovering, setHovering] = useState(false);
  const [appliedLog, setAppliedLog] = useState<BridgeData[]>([]);

  const state: TransferState = forced === "default" && hovering ? "hover" : forced;

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">Transfer</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Open state interattivo da{" "}
          <code className="rounded bg-surface-soft px-1 text-mini">/design/transfer-mode</code>:
          ModeSwitch + RouteVerifier (live API). Le coords sono Asakusa → Shinjuku Station.
          Click su <strong>Usa questa</strong> per loggare il bridge sotto.
        </p>

        <div className="mb-6 flex flex-wrap gap-6">
          <StatePicker label="mode" value={mode} options={MODES} onChange={setMode} />
          <StatePicker label="state" value={forced} options={STATES} onChange={setForced} />
        </div>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div
            className="max-w-[340px]"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <Transfer
              mode={mode}
              state={state}
              legs={LEGS}
              origin={ORIGIN}
              destination={DESTINATION}
              onApply={(b) => setAppliedLog((prev) => [b, ...prev].slice(0, 8))}
              onOpen={() => setForced("open")}
              onClose={() => setForced("default")}
            />
          </div>
        </section>

        {appliedLog.length > 0 && (
          <section className="mt-6 rounded-lg border border-border bg-surface p-4">
            <p className="mb-2 text-mini font-semibold text-ink">
              Bridge applicati (più recente in alto)
            </p>
            <ul className="flex flex-col gap-1.5">
              {appliedLog.map((b, i) => (
                <li key={i} className="font-mono text-mini text-ink-soft">
                  <span className="font-semibold text-ink">{b.transport}</span> · {b.duration_min} min
                  {b.line ? ` · ${b.line}` : ""}
                  {b.note ? ` · ${b.note}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-4 text-mini text-ink-faint">
          Modo <span className="font-medium text-ink-soft">{mode}</span> · stato{" "}
          <span className="font-medium text-ink-soft">{state}</span>
        </p>
      </main>
    </div>
  );
}
