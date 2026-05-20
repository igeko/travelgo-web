"use client";

import { useState } from "react";
import { CreateTripForm, type CreateTripData } from "@/features/trips/CreateTripForm";
import type { PlaceResult } from "@/components/ui/AddressField";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel } from "../_components/ControlsPanel";
import { DestinationField } from "@/components/ui/DestinationField";

export default function CreateTripPage() {
  const [submitted, setSubmitted] = useState<CreateTripData | null>(null);

  /* Controls */
  const [initialDestination, setInitialDestination] = useState<PlaceResult | null>(null);

  /* Re-mount form key — bumped each time controls change so initialDestination takes effect */
  const [formKey, setFormKey] = useState(0);

  function applyDestination(place: PlaceResult | null) {
    setInitialDestination(place);
    setSubmitted(null);
    setFormKey((k) => k + 1);
  }

  if (submitted) {
    return (
      <>
        <SandboxRightPanel>
          <ControlsPanel groups={controlGroups(initialDestination, applyDestination)} />
        </SandboxRightPanel>

        <div className="px-10 py-12 max-w-lg">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-1">Trips</div>
          <h1 className="text-2xl font-semibold text-ink mb-6">CreateTripForm</h1>
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-2">Submitted data</div>
            <pre className="text-[11px] font-mono text-ink-soft whitespace-pre-wrap break-all">
              {JSON.stringify({
                destination: submitted.destination
                  ? { name: submitted.destination.name, placeId: submitted.destination.placeId }
                  : null,
                dates: {
                  start: submitted.dates.start?.toISOString().slice(0,10) ?? null,
                  end:   submitted.dates.end?.toISOString().slice(0,10) ?? null,
                },
                adults: submitted.adults,
                children: submitted.children,
                themes: submitted.themes,
                themeNote: submitted.themeNote || null,
              }, null, 2)}
            </pre>
            <button
              type="button"
              onClick={() => setSubmitted(null)}
              className="mt-4 text-[12px] text-orange hover:underline"
            >
              ← Reset
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={controlGroups(initialDestination, applyDestination)} />
      </SandboxRightPanel>

      <div className="px-10 py-12">
        <div className="mb-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-1">Trips</div>
          <h1 className="text-2xl font-semibold text-ink">CreateTripForm</h1>
          <p className="mt-2 text-sm text-ink-soft max-w-prose">
            Form di creazione viaggio. Standalone — il wrapper modale lo mette l&apos;app.
            Destinazione → reveal Go → cards opzionali (Dates, Travelers, Theme).
          </p>
        </div>

        {/* Simulated modal chrome */}
        <div className="max-w-[580px] bg-surface border border-border rounded-xl p-7 shadow-[0_10px_40px_rgba(13,44,61,0.12)]">
          <CreateTripForm
            key={formKey}
            onCancel={() => alert("cancel")}
            onSubmit={setSubmitted}
            initialDestination={initialDestination}
          />
        </div>
      </div>
    </>
  );
}

/* ── Controls definition (extracted so it's reusable in both branches) ── */
function controlGroups(
  initialDestination: PlaceResult | null,
  applyDestination: (p: PlaceResult | null) => void,
) {
  return [
    {
      title: "Pre-fill",
      controls: [
        {
          kind: "custom" as const,
          id: "destination",
          label: "Destination",
          render: () => (
            <div className="mt-1">
              <DestinationField
                mode="single"
                value={initialDestination}
                onChange={applyDestination}
                placeholder="Search destination…"
                placeTypes="(regions)"
              />
              {initialDestination && (
                <button
                  type="button"
                  onClick={() => applyDestination(null)}
                  className="mt-1.5 text-[11px] text-ink-soft underline decoration-ink/20 hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
          ),
        },
      ],
    },
  ];
}
