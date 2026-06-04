"use client";

/**
 * Sandbox · Explore Transfer (interactive)
 * URL: /dev/explore-transfer
 */

import { useState } from "react";
import {
  Transfer,
  type TransferLeg,
  type TransferMode,
  type TransferState,
  type TransferStep,
} from "@/features/explore/Transfer";
import { StatePicker } from "../_components/StatePicker";

const MODES: TransferMode[] = ["transit", "car"];
const STATES: TransferState[] = ["default", "hover", "open"];

const LEGS: TransferLeg[] = [
  { kind: "walk", label: "8 min" },
  { kind: "bus", label: "105" },
  { kind: "walk", label: "10 min" },
];

const STEPS: TransferStep[] = [
  { kind: "walk", title: "A piedi 8 minuti" },
  {
    kind: "bus",
    title: "Autobus 105 ·",
    place: "Giulio Cesare/Lepanto (MA)",
    subtitle: "10:39 · Colosseo (Mb) → Plebiscito · 3 fermate",
  },
  {
    kind: "bus",
    title: "Autobus 105 ·",
    place: "Giulio Cesare/Lepanto (MA)",
    subtitle: "10:39 · Colosseo (Mb) → Plebiscito · 3 fermate",
  },
  { kind: "walk", title: "A piedi 10 minuti" },
];

export default function ExploreTransferSandboxPage() {
  const [mode, setMode] = useState<TransferMode>("transit");
  const [forced, setForced] = useState<TransferState>("default");
  const [hovering, setHovering] = useState(false);

  const state: TransferState = forced === "default" && hovering ? "hover" : forced;

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">Transfer</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Figma <strong>Transfer</strong> · connettore tra soste. Hover col mouse, click per
          aprire, ✕ per chiudere. Cambia modo e stato qui sotto.
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
              steps={STEPS}
              onOpen={() => setForced("open")}
              onClose={() => setForced("default")}
            />
          </div>
        </section>

        <p className="mt-4 text-mini text-ink-faint">
          Modo <span className="font-medium text-ink-soft">{mode}</span> · stato{" "}
          <span className="font-medium text-ink-soft">{state}</span>
        </p>
      </main>
    </div>
  );
}
