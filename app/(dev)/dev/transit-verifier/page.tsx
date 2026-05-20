"use client";

/**
 * Sandbox — TransitVerifier
 * URL: /dev/transit-verifier
 *
 * Componente standalone (fase 1): chiede a Go di verificare la tratta di
 * trasporto pubblico tra due punti via Routes API (TRANSIT) e restituisce
 * un BridgeData pronto da applicare. Verrà poi integrato dentro il
 * BridgeEditor del Timeline.
 *
 * Nota: fa una chiamata reale a /api/routes/transit (Google Routes API).
 */

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { TransitVerifier, type TransitEndpoint } from "@/features/activity/Timeline/TransitVerifier";
import type { BridgeData } from "@/lib/dal/domain";

/* ── Preset routes (real coordinates) ──────────────────────────── */
const PRESETS: Record<string, { label: string; origin: TransitEndpoint; destination: TransitEndpoint }> = {
  tokyo: {
    label: "Tokyo · Senso-ji → Shibuya",
    origin: { lat: 35.7147, lng: 139.7967, label: "Senso-ji Temple" },
    destination: { lat: 35.6595, lng: 139.7005, label: "Shibuya Crossing" },
  },
  paris: {
    label: "Paris · Louvre → Eiffel Tower",
    origin: { lat: 48.8606, lng: 2.3376, label: "Louvre" },
    destination: { lat: 48.8584, lng: 2.2945, label: "Eiffel Tower" },
  },
  rome: {
    label: "Rome · Colosseo → Vaticano",
    origin: { lat: 41.8902, lng: 12.4922, label: "Colosseo" },
    destination: { lat: 41.9029, lng: 12.4534, label: "Musei Vaticani" },
  },
};

export default function TransitVerifierStories() {
  const [presetKey, setPresetKey] = useState<keyof typeof PRESETS>("tokyo");
  const [showMap, setShowMap] = useState(false);
  const [applied, setApplied] = useState<BridgeData | null>(null);

  const preset = PRESETS[presetKey];

  const groups: ControlGroup[] = [
    {
      title: "Route",
      controls: [
        {
          kind: "radio",
          id: "preset",
          label: "Preset",
          value: presetKey,
          onChange: (v) => { setPresetKey(v as keyof typeof PRESETS); setApplied(null); },
          options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
        },
      ],
    },
    {
      title: "Options",
      controls: [
        {
          kind: "toggle",
          id: "show-map",
          label: "Show map preview",
          value: showMap,
          onChange: setShowMap,
        },
      ],
    },
  ];

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="TransitVerifier"
        description="Verifica la tratta di trasporto pubblico tra due punti via Routes API (TRANSIT) e produce un BridgeData. Componente standalone, da integrare nel BridgeEditor."
      >
        <StoryFrame
          name="Verify flow"
          description="Premi «Verifica tratta» per interrogare la Routes API. Le alternative reali sono selezionabili; «Applica» emette il BridgeData (mostrato sotto)."
        >
          <div className="flex flex-col gap-4 w-full max-w-md">
            <TransitVerifier
              key={presetKey}
              origin={preset.origin}
              destination={preset.destination}
              showMap={showMap}
              onApply={setApplied}
            />

            {applied && (
              <div className="rounded-md border border-border bg-surface-soft p-3">
                <p className="text-micro uppercase tracking-eyebrow text-ink-faint mb-1.5">Applied BridgeData</p>
                <pre className="text-tiny text-ink whitespace-pre-wrap break-words">
                  {JSON.stringify(applied, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
