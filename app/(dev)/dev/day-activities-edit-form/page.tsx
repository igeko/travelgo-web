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
  { id: "a1", time: "08:30", title: "Sensō-ji", activityId: null, lat: 35.7148, lng: 139.7967, location: "Asakusa, Taito" },
  { id: "a2", time: "10:00", title: "Nakamise street food", activityId: null, lat: 35.7117, lng: 139.7966, location: "Nakamise-dori" },
  { id: "a3", time: "11:30", title: "Tokyo Skytree", activityId: null, lat: 35.7101, lng: 139.8107, location: "Sumida" },
  { id: "a4", time: "12:30", title: "Sushi Saito · pranzo", activityId: null, lat: 35.6671, lng: 139.7376, location: "Akasaka, Minato" },
  { id: "a5", time: "14:00", title: "Meiji Jingu", activityId: null, lat: 35.6764, lng: 139.6993, location: "Shibuya" },
  { id: "a6", time: "15:00", title: "Ueno Park", activityId: null, lat: 35.7156, lng: 139.7745, location: "Ueno, Taito" },
  { id: "a7", time: "16:30", title: "Akihabara", activityId: null, lat: 35.7022, lng: 139.7745, location: "Chiyoda" },
  { id: "a8", time: "18:00", title: "Shibuya Crossing", activityId: null, lat: 35.6595, lng: 139.7004, location: "Shibuya" },
  { id: "a9", time: "19:00", title: "Cena izakaya", activityId: null, lat: 35.6938, lng: 139.7034, location: "Shinjuku" },
  { id: "a10", time: "21:30", title: "Golden Gai", activityId: null, lat: 35.6939, lng: 139.7048, location: "Shinjuku" },
];

/** Activities display ordered by time (no-time rows last). */
function sortByTime(list: DayActivity[]): DayActivity[] {
  return [...list].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

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
  const [showOnDay, setShowOnDay] = useState(true);

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
          <div className="w-full max-w-4xl bg-surface border border-border rounded-md px-7 py-6">
            <DayActivitiesEditForm
              activities={items}
              onChange={(next) => setItems(sortByTime(next))}
              items={YUME_POOL}
              editorFor={(id, close) => renderEditor(items, setItems, id, close)}
              showMapOnDay={showOnDay}
              onShowMapOnDayChange={setShowOnDay}
            />
          </div>
        </StoryFrame>

        <StoryFrame name="Vuota" description="Stato vuoto · solo il bottone «Aggiungi attività».">
          <div className="w-full max-w-4xl bg-surface border border-border rounded-md px-7 py-6">
            <DayActivitiesEditForm
              activities={empty}
              onChange={(next) => setEmpty(sortByTime(next))}
              items={YUME_POOL}
              editorFor={(id, close) => renderEditor(empty, setEmpty, id, close)}
            />
          </div>
        </StoryFrame>
      </StoryPage>
    </TripGoProvider>
  );
}
