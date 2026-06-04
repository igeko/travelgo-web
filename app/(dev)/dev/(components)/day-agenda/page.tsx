"use client";

import { useState } from "react";
import { DayAgenda, type DayAgendaActivity } from "@/features/day/DayAgenda";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";

const SAMPLE_ACTIVITIES: Record<string, DayAgendaActivity[]> = {
  "day-0": [
    { id: "a0-1", title: "Land at Haneda Airport" },
    { id: "a0-2", title: "Check-in at Shinjuku hotel" },
    { id: "a0-3", title: "Dinner in Omoide Yokocho" },
  ],
  "day-1": [
    { id: "a1-1", title: "Senso-ji Temple" },
    { id: "a1-2", title: "Nakamise shopping street" },
    { id: "a1-3", title: "Sumida Park riverside walk" },
    { id: "a1-4", title: "Tokyo Skytree at sunset" },
  ],
  "day-2": [
    { id: "a2-1", title: "Imperial Palace East Gardens" },
    { id: "a2-2", title: "Lunch in Marunouchi" },
  ],
  "day-3": [
    { id: "a3-1", title: "Bus to Kawaguchiko" },
    { id: "a3-2", title: "Chureito Pagoda viewpoint" },
    { id: "a3-3", title: "Lake Kawaguchi cruise" },
    { id: "a3-4", title: "Onsen evening" },
  ],
  "day-4": [],
};

export default function DayAgendaStories() {
  const [startDate, setStartDate] = useState("2026-07-31");
  const [durationDays, setDurationDays] = useState(5);
  const [useActivities, setUseActivities] = useState(true);
  const [selectable, setSelectable] = useState(true);
  const [selectedActivityId, setSelectedActivityId] = useState("a1-1");

  const groups: ControlGroup[] = [
    {
      title: "Dates",
      controls: [
        {
          kind: "date",
          id: "startDate",
          label: "Start date",
          value: startDate,
          onChange: setStartDate,
        },
        {
          kind: "number",
          id: "durationDays",
          label: "Duration (days)",
          value: durationDays,
          min: 1,
          max: 14,
          onChange: setDurationDays,
        },
      ],
    },
    {
      title: "Content",
      controls: [
        {
          kind: "toggle",
          id: "useActivities",
          label: "Show sample activities",
          value: useActivities,
          onChange: setUseActivities,
        },
      ],
    },
    {
      title: "Selection",
      controls: [
        {
          kind: "toggle",
          id: "selectable",
          label: "Selectable activities (onSelectActivity)",
          value: selectable,
          onChange: setSelectable,
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
        title="DayAgenda"
        description="Like DayList, but each row shows the day on the left and the ordered stack of that day's activities on the right — titles only. Single activities are selectable (controlled)."
      >
        <StoryFrame
          name="Debugger"
          description="Drive every prop from the panel. Toggle activities and per-activity selection. Days with no activities fall back to an empty hint."
        >
          <div className="max-w-[420px]">
            <DayAgenda
              startDate={startDate}
              durationDays={durationDays}
              activities={useActivities ? SAMPLE_ACTIVITIES : undefined}
              selectedActivityId={selectable ? selectedActivityId : undefined}
              onSelectActivity={selectable ? setSelectedActivityId : undefined}
            />
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
