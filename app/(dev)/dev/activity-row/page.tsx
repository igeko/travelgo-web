"use client";

import { useState } from "react";
import { ActivityRow } from "@/features/activity/ActivityRow";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import {
  ControlsPanel,
  type ControlGroup,
} from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";
import type { ActivityRowState } from "@/features/activity/ActivityRow";
import type { ActivityStatus } from "@/components/ui/StatusBadge";

type StatusOption = ActivityStatus | "none";

export default function ActivityRowStories() {
  // Debugger state
  const [state, setState] = useState<ActivityRowState>("default");
  const [status, setStatus] = useState<StatusOption>("booked");
  const [showDescription, setShowDescription] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [icon, setIcon] = useState<string>("food");
  const [showCost, setShowCost] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const groups: ControlGroup[] = [
    {
      title: "State",
      controls: [
        {
          kind: "radio",
          id: "state",
          label: "Visual state",
          value: state,
          onChange: (v) => setState(v as ActivityRowState),
          options: [
            { value: "default", label: "Default" },
            { value: "now", label: "Now" },
            { value: "selected", label: "Selected" },
            { value: "in-edit", label: "In edit" },
          ],
        },
      ],
    },
    {
      title: "Booking",
      controls: [
        {
          kind: "radio",
          id: "status",
          label: "Status badge",
          value: status,
          onChange: (v) => setStatus(v as StatusOption),
          options: [
            { value: "none", label: "None" },
            { value: "todo", label: "To book" },
            { value: "booked", label: "Booked" },
            { value: "paid", label: "Paid" },
          ],
        },
      ],
    },
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
    {
      title: "Optional fields",
      controls: [
        {
          kind: "toggle",
          id: "desc",
          label: "Description",
          value: showDescription,
          onChange: setShowDescription,
        },
        {
          kind: "toggle",
          id: "loc",
          label: "Location (Map badge)",
          value: showLocation,
          onChange: setShowLocation,
        },
        {
          kind: "radio",
          id: "icon",
          label: "Map badge icon",
          value: icon,
          onChange: setIcon,
          options: [
            { value: "food", label: "Food" },
            { value: "coffee", label: "Coffee" },
            { value: "museum", label: "Museum" },
            { value: "view", label: "View" },
            { value: "none", label: "None (pin)" },
          ],
        },
        {
          kind: "toggle",
          id: "pin",
          label: "Pin number (overrides icon)",
          value: showPin,
          onChange: setShowPin,
        },
        {
          kind: "toggle",
          id: "cost",
          label: "Cost",
          value: showCost,
          onChange: setShowCost,
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
        title="ActivityRow"
        description="Daily timeline activity row. Use the controls on the right to switch state/status and toggle optional fields. Hover behavior is tested directly with the mouse."
      >
        <StoryFrame
          name="Debugger"
          description="Interactive row. Tweak controls on the right to see the component react in real time."
        >
          <ActivityRow
            time="12:30"
            title="Sushi and kaisen-don at Tsukiji"
            description={
              showDescription
                ? "At Tsukiji outer market you sit at the counter of a kaisen-don — rice and the day's raw fish. The Sushi Dai family has served the same breakfast since 1970."
                : undefined
            }
            pin={showLocation && showPin ? 3 : undefined}
            icon={icon === "none" ? null : icon}
            location={showLocation ? "Tsukiji, Tokyo" : undefined}
            cost={showCost ? "¥3,200" : undefined}
            costApprox={showCost ? "≈ €20" : undefined}
            status={status === "none" ? undefined : status}
            state={state}
            editMode={editMode}
            initialData={{
              title: "Sushi and kaisen-don at Tsukiji",
              description: "At Tsukiji outer market you sit at the counter of a kaisen-don — rice and the day's raw fish.",
              period: "morning",
              budgetAmount: 3200,
              budgetCurrency: "JPY",
              status: status === "none" ? null : status ?? null,
            }}
            onSave={(data) => console.log("save", data)}
            onDelete={() => console.log("delete")}
          />
        </StoryFrame>

      </StoryPage>
    </>
  );
}
