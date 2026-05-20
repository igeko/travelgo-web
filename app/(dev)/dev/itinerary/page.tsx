"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { Itinerary } from "@/features/activity/Itinerary";
import type { Activity } from "@/lib/dal/domain";

const SAMPLE_ACTIVITIES = [
  {
    id: "1",
    day_id: "day-1",
    title: "Senso-ji Temple",
    short_desc: "Tokyo's most visited temple. Early morning visit before the crowds arrive.",
    slot: "morning",
    time: "09:00",
    location: "Asakusa, Tokyo",
    hero_image: null,
    budget_amount: 0,
    budget_currency: "JPY",
    budget_paid: true,
    url: null,
    sort_order: 1,
    lat: 35.7147,
    lng: 139.7967,
    placeId: "ChIJ8T1GpMGOGGARDYGSgpooDWw",
  },
  {
    id: "2",
    day_id: "day-1",
    title: "Ueno Park",
    short_desc: "Museums, zoo and cherry blossoms — the cultural heart of downtown Tokyo.",
    slot: "morning",
    time: "10:30",
    location: "Ueno, Tokyo",
    hero_image: null,
    budget_amount: null,
    budget_currency: null,
    budget_paid: false,
    url: null,
    sort_order: 2,
    lat: 35.7141,
    lng: 139.7741,
    placeId: "ChIJIfBAsjuOGGARfRBVyq3aZhY",
  },
  {
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
    url: null,
    sort_order: 3,
    lat: 35.6654,
    lng: 139.7707,
    placeId: "ChIJU8KGqTuLGGARu5d5AQ-RUzE",
  },
  {
    id: "4",
    day_id: "day-1",
    title: "teamLab Borderless",
    short_desc: "Immersive digital art museum — a world without borders or maps.",
    slot: "afternoon",
    time: "15:00",
    location: "Azabudai Hills, Tokyo",
    hero_image: null,
    budget_amount: 3200,
    budget_currency: "JPY",
    budget_paid: false,
    url: null,
    sort_order: 4,
    lat: 35.6572,
    lng: 139.7394,
    placeId: "ChIJrTLr-GyuEmsRBfy61i59si0",
  },
  {
    id: "5",
    day_id: "day-1",
    title: "Dinner in Akihabara",
    short_desc: "Robatayaki and neighborhood bars — the area lights up after sunset.",
    slot: "evening",
    time: "19:30",
    location: "Akihabara, Tokyo",
    hero_image: null,
    budget_amount: 6500,
    budget_currency: "JPY",
    budget_paid: false,
    url: null,
    sort_order: 5,
    lat: 35.7022,
    lng: 139.7741,
    placeId: "ChITR9NHqbuOGGARLhFTkZFTkZE",
  },
] as unknown as Activity[];

export default function ItineraryStories() {
  const [editMode, setEditMode] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(SAMPLE_ACTIVITIES);

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
        title="Itinerary"
        description="Full day itinerary: map + activity list sorted by time. Toggle edit mode to add/edit activities."
      >
        <StoryFrame
          name="Debugger"
          description="Activities sorted by time, grouped by slot. Map shows places with lat/lng (none in sample data — shows empty map state)."
        >
          <Itinerary
            activities={activities}
            editMode={editMode}
            onActivitySave={(id, data) =>
              setActivities((prev) =>
                prev.map((a) =>
                  a.id === id
                    ? { ...a, title: data.title, short_desc: data.description, slot: data.period as Activity["slot"] }
                    : a
                )
              )
            }
            onActivityDelete={(id) =>
              setActivities((prev) => prev.filter((a) => a.id !== id))
            }
            onAddActivity={() => console.log("add activity")}
          />
        </StoryFrame>
      </StoryPage>
    </>
  );
}
