"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { ActivityList } from "@/features/activity/ActivityList";
import type { Activity } from "@/lib/dal/trips";

const STUB: Pick<Activity, "trip_id" | "position" | "icon" | "url" | "location_place_id" | "location_lat" | "location_lng"> = {
  trip_id: "trip-1",
  position: 0,
  icon: null,
  url: null,
  location_place_id: null,
  location_lat: null,
  location_lng: null,
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
          description="Activities grouped by slot (morning, afternoon, evening, night). In edit mode each row reveals affordances and an inline form."
        >
          <div className="w-full">
            <ActivityList
              activities={activities}
              editMode={editMode}
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
        </StoryFrame>
      </StoryPage>
    </>
  );
}
