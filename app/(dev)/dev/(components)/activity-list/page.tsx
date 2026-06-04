"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { ActivityList } from "@/features/activity/ActivityList";
import { writeYumeDrag } from "@/features/yumeji/yumeDrag";
import type { Activity } from "@/lib/dal/domain";

/** Mini palette of draggable yume to demo dropping into the list. */
function YumePalette() {
  const yume = [
    { id: "y-skytree", title: "Tokyo Skytree", location: "Sumida" },
    { id: "y-meiji", title: "Meiji Jingu", location: "Shibuya" },
    { id: "y-akiba", title: "Akihabara", location: "Chiyoda" },
  ];
  return (
    <div className="w-44 shrink-0">
      <p className="text-[9px] tracking-eyebrow uppercase text-orange-deep font-medium mb-2">Yume (trascina →)</p>
      <ul className="flex flex-col gap-1.5">
        {yume.map((y) => (
          <li
            key={y.id}
            draggable
            onDragStart={(e) => writeYumeDrag(e.dataTransfer, y)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border bg-surface text-mini text-ink cursor-grab active:cursor-grabbing hover:border-border-strong"
          >
            <span className="w-7 h-7 rounded-md bg-surface-soft shrink-0" />
            <span className="min-w-0">
              <span className="block font-medium truncate">{y.title}</span>
              <span className="block text-tiny text-ink-faint truncate">{y.location}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STUB: Pick<Activity, "trip_id" | "activity_id" | "position" | "icon" | "url" | "location_place_id" | "location_lat" | "location_lng" | "place_enriched" | "booking" | "type" | "fuzzy" | "instance_note" | "booking_status" | "bridge_in_json" | "bridge_out_json" | "entity_id"> = {
  trip_id: "trip-1",
  activity_id: "activity-stub",
  position: 0,
  icon: null,
  url: null,
  location_place_id: null,
  location_lat: null,
  location_lng: null,
  place_enriched: null,
  booking: null,
  type: "place",
  fuzzy: false,
  instance_note: null,
  booking_status: null,
  bridge_in_json: null,
  bridge_out_json: null,
  entity_id: null,
};

/* ── Sample data ── */
const SAMPLE_ACTIVITIES: Activity[] = [
  {
    ...STUB,
    id: "1",
    day_id: "day-1",
    title: "Kabukiza visit",
    short_desc: "Tokyo's main kabuki theater. The exterior with its curtains is already worth a stop.",
    slot: "morning",
    time: "09:00",
    location: "Higashi-Ginza",
    hero_image: null,
    budget_amount: 1800,
    budget_currency: "JPY",
    budget_paid: true,
  },
  {
    ...STUB,
    id: "2",
    day_id: "day-1",
    title: "A walk through Ginza",
    short_desc: "From historic architecture to luxury boutiques. 5 stops in 2.4 km.",
    slot: "morning",
    time: "10:30",
    location: "Ginza, Tokyo",
    hero_image: null,
    budget_amount: null,
    budget_currency: null,
    budget_paid: false,
  },
  {
    ...STUB,
    id: "3",
    day_id: "day-1",
    title: "Sushi and kaisen-don at Tsukiji",
    short_desc: "At Tsukiji outer market you sit at the counter of a kaisen-don — rice and the day's raw fish.",
    slot: "morning",
    time: "12:30",
    location: "Tsukiji, Tokyo",
    hero_image: null,
    budget_amount: 3200,
    budget_currency: "JPY",
    budget_paid: false,
  },
  {
    ...STUB,
    id: "4",
    day_id: "day-1",
    title: "Hama-Rikyu garden",
    short_desc: "The Tokugawa clan's oasis in the heart of the city — a pond with a floating tea house.",
    slot: "afternoon",
    time: "15:00",
    location: "Shiodome, Tokyo",
    hero_image: null,
    budget_amount: 300,
    budget_currency: "JPY",
    budget_paid: false,
  },
  {
    ...STUB,
    id: "5",
    day_id: "day-1",
    title: "Dinner in Roppongi",
    short_desc: "Robatayaki and neighborhood bars — the area lights up after sunset.",
    slot: "evening",
    time: "19:30",
    location: "Roppongi, Tokyo",
    hero_image: null,
    budget_amount: 6500,
    budget_currency: "JPY",
    budget_paid: false,
  },
];

export default function ActivityListStories() {
  const [editMode, setEditMode] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(SAMPLE_ACTIVITIES);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Edit mode",
      controls: [
        {
          kind: "toggle",
          id: "editMode",
          label: "Edit mode",
          value: editMode,
          onChange: setEditMode,
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
        title="ActivityList"
        description="Full activity list with slot grouping. Toggle edit mode to see drag handles, pencil buttons, and inline edit forms."
      >
        <StoryFrame
          name="Debugger"
          description="Activities grouped by slot. In edit mode trascina uno Yume dalla palette su una riga (metà alta = prima, metà bassa = dopo) per programmarlo nella posizione scelta."
        >
          <div className="flex w-full items-start gap-5">
            {editMode && <YumePalette />}
            <div className="flex-1 min-w-0">
            <ActivityList
              activities={activities}
              editMode={editMode}
              onScheduleYume={(yumeId, { title, slot, time }) => {
                setActivities((prev) => [
                  ...prev,
                  { ...STUB, id: `sched-${Date.now()}`, activity_id: yumeId, day_id: "day-1", title, slot, time, short_desc: null, location: null, hero_image: null, budget_amount: null, budget_currency: null, budget_paid: false },
                ]);
                setLastAction(`scheduled: ${title} → ${slot} ${time ?? ""}`);
              }}
              onActivitySave={(id, data) => {
                setActivities((prev) =>
                  prev.map((a) =>
                    a.id === id
                      ? { ...a, title: data.title, short_desc: data.description, slot: data.period as Activity["slot"] }
                      : a
                  )
                );
                setLastAction(`saved: ${data.title}`);
              }}
              onActivityDelete={(id) => {
                setActivities((prev) => prev.filter((a) => a.id !== id));
                setLastAction(`deleted: ${id}`);
              }}
            />

            {lastAction && (
              <div className="mt-4 rounded-lg bg-surface-soft border border-border p-3 text-[12px] font-mono text-ink-soft">
                <span className="text-ink-faint">last action: </span>
                <span className="text-ink">{lastAction}</span>
              </div>
            )}
            </div>
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
