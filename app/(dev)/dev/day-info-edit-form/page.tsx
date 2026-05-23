"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { DayInfoEditForm, type HeroBannerData } from "@/features/day/DayInfoEditForm";

export default function DayInfoEditFormStories() {
  const [prefilled, setPrefilled] = useState(true);
  const [lastSaved, setLastSaved] = useState<HeroBannerData | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Mode",
      controls: [
        { kind: "toggle", id: "prefilled", label: "Pre-compilato", value: prefilled, onChange: setPrefilled },
      ],
    },
  ];

  const sample = {
    title: "Senso-ji & Asakusa",
    subtitle: "Tokyo",
    summary: "Mattina al tempio prima della folla, poi street food a Nakamise.",
    practicalNote: "Comprare la Suica in stazione.",
    type: "City" as const,
  };

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="DayInfoEditForm"
        description="Editor anagrafica del giorno, estratto da HeroBanner. Standalone con footer proprio (Salva/Annulla); HeroBanner e DayEditForm lo riusano con hideFooter + ref.getData()."
      >
        <StoryFrame name="Debugger" description="Modifica e salva: il pannello mostra il payload HeroBannerData.">
          <div className="flex flex-col gap-3 w-full max-w-xl">
            <DayInfoEditForm
              key={`${prefilled}`}
              title={prefilled ? sample.title : ""}
              subtitle={prefilled ? sample.subtitle : undefined}
              summary={prefilled ? sample.summary : undefined}
              practicalNote={prefilled ? sample.practicalNote : undefined}
              type={prefilled ? sample.type : undefined}
              onSave={(d) => { setLastSaved(d); setLastAction("saved"); }}
              onCancel={() => setLastAction("cancelled")}
            />

            {(lastSaved || lastAction) && (
              <div className="rounded-lg bg-surface-soft border border-border p-4 text-[12px] font-mono text-ink-soft leading-relaxed">
                <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">Last callback</div>
                <div className="mb-1"><span className="text-ink-faint">action: </span><span className="text-ink font-medium">{lastAction}</span></div>
                {lastSaved && lastAction === "saved" && (
                  <pre className="whitespace-pre-wrap text-ink">{JSON.stringify(lastSaved, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
