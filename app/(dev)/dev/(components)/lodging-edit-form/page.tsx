"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import {
  LodgingEditForm,
  type HeroBannerSubBanner,
  type HeroBannerSubBannerData,
} from "@/features/day/LodgingEditForm";

export default function LodgingEditFormStories() {
  const [prefilled, setPrefilled] = useState(true);
  const [withRemove, setWithRemove] = useState(true);
  const [lastSaved, setLastSaved] = useState<HeroBannerSubBannerData | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Mode",
      controls: [
        { kind: "toggle", id: "prefilled", label: "Pre-compilato", value: prefilled, onChange: setPrefilled },
        { kind: "toggle", id: "with-remove", label: "Mostra Rimuovi", value: withRemove, onChange: setWithRemove },
      ],
    },
  ];

  const sample: HeroBannerSubBanner = {
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
        title="LodgingEditForm"
        description="Editor alloggio (sub-banner), estratto da HeroBanner. Standalone con footer proprio; HeroBanner e DayEditForm lo riusano con hideFooter + ref.getData()."
      >
        <StoryFrame name="Debugger" description="Modifica e salva: il pannello mostra il payload HeroBannerSubBannerData.">
          <div className="flex flex-col gap-3 w-full max-w-xl">
            <LodgingEditForm
              key={`${prefilled}-${withRemove}`}
              initial={prefilled ? sample : null}
              onSave={(d) => { setLastSaved(d); setLastAction("saved"); }}
              onCancel={() => setLastAction("cancelled")}
              onRemove={withRemove ? () => setLastAction("removed") : undefined}
            />

            {(lastSaved || lastAction) && (
              <div className="rounded-lg bg-surface-soft border border-border p-4 text-[12px] font-mono text-ink-soft leading-relaxed">
                <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">Last callback</div>
                <div className="mb-1"><span className="text-ink-faint">action: </span><span className="text-ink font-medium">{lastAction}</span></div>
                {lastSaved && lastAction === "saved" && (
                  <pre className="whitespace-pre-wrap text-ink">{JSON.stringify(
                    { ...lastSaved, place: lastSaved.place?.formatted ?? null },
                    null,
                    2,
                  )}</pre>
                )}
              </div>
            )}
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
