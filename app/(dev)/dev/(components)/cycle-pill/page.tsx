"use client";

import { useState } from "react";
import { CyclePill, type CycleOption } from "@/components/ui/CyclePill";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import {
  ControlsPanel,
  type ControlGroup,
} from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";

/* Option presets for the sandbox */

type ActivityStatus = null | "todo" | "booked" | "paid";
type Priority = "low" | "medium" | "high";

const ACTIVITY_STATUS_OPTIONS: CycleOption<ActivityStatus>[] = [
  { value: null, label: "Not set", dotColor: "var(--color-ink-faint)" },
  { value: "todo", label: "To book", dotColor: "#e24b4a" },
  { value: "booked", label: "Booked", dotColor: "#ef9f27" },
  { value: "paid", label: "Paid", dotColor: "#97c459" },
];

const PRIORITY_OPTIONS: CycleOption<Priority>[] = [
  { value: "low", label: "Low", dotColor: "#97c459" },
  { value: "medium", label: "Medium", dotColor: "#ef9f27" },
  { value: "high", label: "High", dotColor: "#e24b4a" },
];

const ON_OFF_OPTIONS: CycleOption<boolean>[] = [
  { value: false, label: "Off", dotColor: "var(--color-ink-faint)" },
  { value: true, label: "On", dotColor: "#97c459" },
];

type PresetKey = "activity-status" | "priority" | "on-off";

export default function CyclePillStories() {
  const [presetKey, setPresetKey] = useState<PresetKey>("activity-status");
  const [statusValue, setStatusValue] = useState<ActivityStatus>(null);
  const [priorityValue, setPriorityValue] = useState<Priority>("medium");
  const [onOffValue, setOnOffValue] = useState<boolean>(false);
  const [disabled, setDisabled] = useState(false);

  const groups: ControlGroup[] = [
    {
      title: "Preset",
      controls: [
        {
          kind: "radio",
          id: "preset",
          label: "Options preset",
          value: presetKey,
          onChange: (v) => setPresetKey(v as PresetKey),
          options: [
            { value: "activity-status", label: "Activity status (4)" },
            { value: "priority", label: "Priority (3)" },
            { value: "on-off", label: "On / Off (2)" },
          ],
        },
      ],
    },
    {
      title: "State",
      controls: [
        {
          kind: "toggle",
          id: "disabled",
          label: "Disabled",
          value: disabled,
          onChange: setDisabled,
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
        title="CyclePill"
        description="Ink-filled pill with a colored dot, a label and a chevron. Clicking cycles through the configured options. Options are fully configurable (any value type, any label, any dot color)."
      >
        <StoryFrame
          name="Debugger"
          description="Click the pill to cycle through options. Switch presets to see how options shape the behavior. The first option of each preset is conventionally the 'unselected' state."
        >
          <div className="flex justify-center py-2">
            {presetKey === "activity-status" && (
              <CyclePill
                value={statusValue}
                onChange={setStatusValue}
                options={ACTIVITY_STATUS_OPTIONS}
                disabled={disabled}
              />
            )}
            {presetKey === "priority" && (
              <CyclePill
                value={priorityValue}
                onChange={setPriorityValue}
                options={PRIORITY_OPTIONS}
                disabled={disabled}
              />
            )}
            {presetKey === "on-off" && (
              <CyclePill
                value={onOffValue}
                onChange={setOnOffValue}
                options={ON_OFF_OPTIONS}
                disabled={disabled}
              />
            )}
          </div>
        </StoryFrame>

        <StoryFrame
          name="Activity booking status"
          description="The original use case from day_edit. Cycles through Not set → To book → Booked → Paid → Not set."
        >
          <ActivityStatusDemo />
        </StoryFrame>

        <StoryFrame
          name="Priority · 3 options"
          description="Same component, different shape. Shows the generic nature of the API."
        >
          <PriorityDemo />
        </StoryFrame>

        <StoryFrame
          name="Single option · no cycling"
          description="When `options` has a single entry, the chevron disappears and the pill becomes a static badge."
        >
          <CyclePill
            value="locked"
            onChange={() => {}}
            options={[
              { value: "locked", label: "Locked", dotColor: "var(--color-ink-faint)" },
            ]}
          />
        </StoryFrame>

        <StoryFrame
          name="Side by side · all 4 status states"
          description="What you'd see by clicking through the activity status preset."
        >
          <div className="flex flex-wrap gap-3">
            {ACTIVITY_STATUS_OPTIONS.map((opt) => (
              <CyclePill
                key={String(opt.value)}
                value={opt.value}
                onChange={() => {}}
                options={ACTIVITY_STATUS_OPTIONS}
              />
            ))}
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}

/* Small wrappers to keep the state local for the demo stories */
function ActivityStatusDemo() {
  const [v, setV] = useState<ActivityStatus>(null);
  return (
    <CyclePill value={v} onChange={setV} options={ACTIVITY_STATUS_OPTIONS} />
  );
}

function PriorityDemo() {
  const [v, setV] = useState<Priority>("medium");
  return <CyclePill value={v} onChange={setV} options={PRIORITY_OPTIONS} />;
}
