"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { DayEditForm } from "@/features/day/DayEditForm";
import type { HeroBannerSubBanner } from "@/features/day/LodgingEditForm";
import type { DayActivity } from "@/features/day/DayActivitiesEditForm";
import { ActivityEditForm } from "@/features/activity/ActivityEditForm";
import { TripGoProvider } from "@/features/go/TripGoContext";
import type { TripActivityOption } from "@/features/activity/types";

const YUME_POOL: TripActivityOption[] = [
  { id: "y1", title: "teamLab Planets", location: "Toyosu", scheduled: [] },
  { id: "y2", title: "teamLab Borderless", location: "Azabudai", scheduled: [] },
  { id: "y3", title: "Tea ceremony · Hama-rikyū", location: "Chuo", scheduled: [] },
  { id: "y4", title: "Tokyo Skytree", location: "Sumida", scheduled: [] },
  { id: "y5", title: "Yoyogi park", location: "Shibuya", scheduled: [] },
  { id: "y6", title: "Golden Gai bars", location: "Shinjuku", scheduled: [] },
];

const INITIAL_ACTIVITIES: DayActivity[] = [
  { id: "a1", time: "08:30", title: "Sensō-ji", activityId: null },
  { id: "a2", time: "10:00", title: "Nakamise street food", activityId: null },
  { id: "a3", time: "12:30", title: "Sushi Saito · pranzo", activityId: null },
  { id: "a4", time: "15:00", title: "Ueno Park", activityId: null },
];

export default function DayEditFormStories() {
  const [prefilled, setPrefilled] = useState(true);
  const [withLodging, setWithLodging] = useState(true);
  const [withActivities, setWithActivities] = useState(true);
  const [withTimeline, setWithTimeline] = useState(true);
  const [withDelete, setWithDelete] = useState(true);

  const [activities, setActivities] = useState<DayActivity[]>(INITIAL_ACTIVITIES);
  const [lastSaved, setLastSaved] = useState<Record<string, unknown> | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Mode",
      controls: [
        { kind: "toggle", id: "prefilled", label: "Pre-compilato", value: prefilled, onChange: setPrefilled },
        { kind: "toggle", id: "with-lodging", label: "Con alloggio iniziale", value: withLodging, onChange: setWithLodging },
        { kind: "toggle", id: "with-activities", label: "Sezione attività", value: withActivities, onChange: setWithActivities },
        { kind: "toggle", id: "with-timeline", label: "Sezione timeline", value: withTimeline, onChange: setWithTimeline },
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
    <TripGoProvider>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="DayEditForm"
        description="Form unica di modifica giorno · tre sezioni nel menu a destra: DayInfoEditForm (anagrafica) + LodgingEditForm (alloggio) + DayActivitiesEditForm (lista attività). Anagrafica/alloggio passano dal Salva unico; le attività sono entità separate e si committano via onActivitiesChange."
      >
        <StoryFrame
          name="Debugger"
          description="Cambia sezione dal menu a destra. Le attività usano ActivitySearchField (digita 'team' per l'autocomplete, o un titolo nuovo per 'crea nuova') e TimeField."
        >
          <div className="flex flex-col gap-3 w-full max-w-2xl">
            <DayEditForm
              key={`${prefilled}-${withLodging}-${withActivities}-${withDelete}`}
              dayNumber={3}
              dateLabel="Mar 12 mag"
              hero={prefilled ? heroSample : undefined}
              lodging={prefilled && withLodging ? lodgingSample : null}
              activities={prefilled ? activities : []}
              onActivitiesChange={withActivities ? (next) => setActivities(
                [...next].sort((a, b) => {
                  if (!a.time && !b.time) return 0;
                  if (!a.time) return 1;
                  if (!b.time) return -1;
                  return a.time.localeCompare(b.time);
                }),
              ) : undefined}
              activityItems={YUME_POOL}
              timelineSlot={withTimeline ? (
                <div className="rounded-md border border-dashed border-border bg-surface-soft p-8 text-center text-mini text-ink-faint">
                  &lt;Timeline /&gt; — componente reale in app
                </div>
              ) : undefined}
              activityEditorFor={(id, close) => {
                const a = activities.find((x) => x.id === id);
                if (!a) return null;
                return (
                  <ActivityEditForm
                    isNew={false}
                    initialData={{
                      title: a.title,
                      period: "morning",
                      hour: a.time ? parseInt(a.time.slice(0, 2), 10) : undefined,
                      minute: a.time ? parseInt(a.time.slice(3, 5), 10) : undefined,
                    }}
                    onSave={() => close()}
                    onCancel={close}
                    onDelete={() => { setActivities((p) => p.filter((x) => x.id !== id)); close(); }}
                  />
                );
              }}
              onSaveDayInfo={(heroData) => { setLastSaved({ section: "day", hero: heroData }); setLastAction("saved"); }}
              onSaveLodging={(lodgingData) => { setLastSaved({ section: "lodging", lodging: lodgingData ? { ...lodgingData, place: lodgingData.place?.formatted ?? null } : null }); setLastAction("saved"); }}
              onCancel={() => setLastAction("cancelled")}
              onDelete={withDelete ? () => setLastAction("deleted") : undefined}
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

        <StoryFrame name="Vuoto (nuovo giorno)" description="Form vuota, senza alloggio e senza pulsante Elimina.">
          <div className="w-full max-w-2xl">
            <DayEditForm dayNumber={1} onCancel={() => {}} />
          </div>
        </StoryFrame>
      </StoryPage>
    </TripGoProvider>
  );
}
