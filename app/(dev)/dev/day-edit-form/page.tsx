"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { DayEditForm, type DayData } from "@/features/day/DayEditForm";
import type { HeroBannerSubBanner } from "@/features/day/LodgingEditForm";

export default function DayEditFormStories() {
  const [prefilled, setPrefilled] = useState(true);
  const [withLodging, setWithLodging] = useState(true);
  const [withDelete, setWithDelete] = useState(true);

  const [lastSaved, setLastSaved] = useState<DayData | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Mode",
      controls: [
        { kind: "toggle", id: "prefilled", label: "Pre-compilato", value: prefilled, onChange: setPrefilled },
        { kind: "toggle", id: "with-lodging", label: "Con alloggio iniziale", value: withLodging, onChange: setWithLodging },
        { kind: "toggle", id: "with-delete", label: "Mostra Elimina", value: withDelete, onChange: setWithDelete },
      ],
    },
  ];

  const heroSample = {
    title: "Senso-ji & Asakusa",
    subtitle: "Tokyo",
    summary: "Mattina al tempio prima della folla, poi street food a Nakamise.",
    practicalNote: "Comprare la Suica in stazione.",
    type: "City" as const,
  };

  const lodgingSample: HeroBannerSubBanner = {
    type: "Hotel",
    name: "Park Hotel Tokyo",
    href: "https://parkhoteltokyo.com",
    budgetAmount: 180,
    budgetCurrency: "EUR",
  };

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="DayEditForm"
        description="Form unica di modifica giorno, composta dai due editor estratti da HeroBanner: DayInfoEditForm (anagrafica) + LodgingEditForm (alloggio), con footer unico che legge i draft via ref.getData(). La rifiniamo piano piano."
      >
        <StoryFrame
          name="Debugger"
          description="Modifica i campi e premi Salva: il pannello sotto mostra cosa riceverebbe onSave()."
        >
          <div className="flex flex-col gap-3 w-full max-w-2xl">
            <DayEditForm
              key={`${prefilled}-${withLodging}-${withDelete}`}
              dayNumber={3}
              dateLabel="Mar 12 mag"
              hero={prefilled ? heroSample : undefined}
              lodging={prefilled && withLodging ? lodgingSample : null}
              onSave={(d) => { setLastSaved(d); setLastAction("saved"); }}
              onCancel={() => setLastAction("cancelled")}
              onDelete={withDelete ? () => setLastAction("deleted") : undefined}
            />

            {(lastSaved || lastAction) && (
              <div className="rounded-lg bg-surface-soft border border-border p-4 text-[12px] font-mono text-ink-soft leading-relaxed">
                <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">Last callback</div>
                <div className="mb-1"><span className="text-ink-faint">action: </span><span className="text-ink font-medium">{lastAction}</span></div>
                {lastSaved && lastAction === "saved" && (
                  <pre className="whitespace-pre-wrap text-ink">{JSON.stringify(
                    {
                      hero: lastSaved.hero,
                      lodging: lastSaved.lodging
                        ? { ...lastSaved.lodging, place: lastSaved.lodging.place?.formatted ?? null }
                        : null,
                    },
                    null,
                    2,
                  )}</pre>
                )}
              </div>
            )}
          </div>
        </StoryFrame>

        <StoryFrame name="Vuoto (nuovo giorno)" description="Form vuota, senza alloggio e senza pulsante Elimina.">
          <div className="w-full max-w-2xl">
            <DayEditForm dayNumber={1} onSave={() => {}} onCancel={() => {}} />
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
