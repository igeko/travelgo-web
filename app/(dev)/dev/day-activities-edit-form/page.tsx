"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { DayActivitiesEditForm, type DayActivity } from "@/features/day/DayActivitiesEditForm";
import { ActivityEditForm, type ActivityData } from "@/features/activity/ActivityEditForm";
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

const INITIAL: DayActivity[] = [
  { id: "a1", time: "08:30", title: "Sensō-ji", activityId: null },
  { id: "a2", time: "10:00", title: "Nakamise street food", activityId: null },
  { id: "a3", time: "12:30", title: "Sushi Saito · pranzo", activityId: null },
  { id: "a4", time: "15:00", title: "Ueno Park", activityId: null },
  { id: "a5", time: "19:00", title: "Cena izakaya", activityId: null },
];

function toData(a: DayActivity): Partial<ActivityData> {
  return {
    title: a.title,
    period: "morning",
    hour: a.time ? parseInt(a.time.slice(0, 2), 10) : undefined,
    minute: a.time ? parseInt(a.time.slice(3, 5), 10) : undefined,
  };
}

export default function DayActivitiesEditFormStories() {
  const [items, setItems] = useState<DayActivity[]>(INITIAL);
  const [empty, setEmpty] = useState<DayActivity[]>([]);

  function renderEditor(
    list: DayActivity[],
    setList: React.Dispatch<React.SetStateAction<DayActivity[]>>,
    id: string,
    close: () => void,
  ) {
    const a = list.find((x) => x.id === id);
    if (!a) return null;
    return (
      <ActivityEditForm
        isNew={false}
        initialData={toData(a)}
        onSave={() => close()}
        onCancel={close}
        onDelete={() => { setList((p) => p.filter((x) => x.id !== id)); close(); }}
      />
    );
  }

  return (
    <TripGoProvider>
      <StoryPage
        title="DayActivitiesEditForm"
        description="Sezione lista attività del DayEditForm. Add = riga inline leggera (titolo via ActivitySearchField + TimeField, stesso colore/spazi delle righe). Edit (matita) apre l'ActivityEditForm completo sotto la riga (via editorFor). Controllato: il parent possiede activities + onChange."
      >
        <StoryFrame
          name="Lista pre-compilata"
          description="Hover sulle righe per le azioni · '+' tra due righe per inserire (digita 'team' per l'autocomplete o un titolo nuovo per 'crea nuova') · matita = editor completo sotto."
        >
          <div className="w-full max-w-xl bg-surface border border-border rounded-md px-7 py-6">
            <DayActivitiesEditForm
              activities={items}
              onChange={setItems}
              items={YUME_POOL}
              editorFor={(id, close) => renderEditor(items, setItems, id, close)}
            />
          </div>
        </StoryFrame>

        <StoryFrame name="Vuota" description="Stato vuoto · solo il bottone «Aggiungi attività».">
          <div className="w-full max-w-xl bg-surface border border-border rounded-md px-7 py-6">
            <DayActivitiesEditForm
              activities={empty}
              onChange={setEmpty}
              items={YUME_POOL}
              editorFor={(id, close) => renderEditor(empty, setEmpty, id, close)}
            />
          </div>
        </StoryFrame>
      </StoryPage>
    </TripGoProvider>
  );
}
