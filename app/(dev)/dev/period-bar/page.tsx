"use client";

import { useState } from "react";
import {
  DEFAULT_PERIODS,
  PeriodBar,
  type Period,
  type PeriodBarSize,
} from "@/components/ui/PeriodBar";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import {
  ControlsPanel,
  type ControlGroup,
} from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";

/* Period presets for the sandbox */
const PRESETS: Record<string, Period[]> = {
  "four-default": DEFAULT_PERIODS,
  "three-period": [
    { id: "morning", name: "MORNING", range: "05–12" },
    { id: "afternoon", name: "AFTERNOON", range: "12–18" },
    { id: "evening", name: "EVENING", range: "18–22" },
  ],
  "two-period": [
    { id: "day", name: "DAY", range: "06–18" },
    { id: "night", name: "NIGHT", range: "18–06" },
  ],
};

type PresetKey = keyof typeof PRESETS;

export default function PeriodBarStories() {
  const [presetKey, setPresetKey] = useState<PresetKey>("four-default");
  const [value, setValue] = useState("morning");
  const [size, setSize] = useState<PeriodBarSize>("slim");
  const [activeTime, setActiveTime] = useState("09:00");
  const [showActiveTime, setShowActiveTime] = useState(true);
  const [disabled, setDisabled] = useState(false);

  const periods = PRESETS[presetKey];

  // Snap value to a valid id when preset changes
  const safeValue = periods.find((p) => p.id === value)?.id ?? periods[0].id;

  const groups: ControlGroup[] = [
    {
      title: "Layout",
      controls: [
        {
          kind: "radio",
          id: "size",
          label: "Size",
          value: size,
          onChange: (v) => setSize(v as PeriodBarSize),
          options: [
            { value: "slim", label: "slim (default)" },
            { value: "default", label: "default" },
          ],
        },
      ],
    },
    {
      title: "Periods",
      controls: [
        {
          kind: "radio",
          id: "preset",
          label: "Available periods (preset)",
          value: presetKey,
          onChange: (v) => setPresetKey(v as PresetKey),
          options: [
            { value: "four-default", label: "4 · default" },
            { value: "three-period", label: "3 · morning/afternoon/evening" },
            { value: "two-period", label: "2 · day/night" },
          ],
        },
        {
          kind: "radio",
          id: "value",
          label: "Selected period",
          value: safeValue,
          onChange: setValue,
          options: periods.map((p) => ({ value: p.id, label: p.name })),
        },
      ],
    },
    {
      title: "Active time",
      controls: [
        {
          kind: "toggle",
          id: "show-time",
          label: "Show active time",
          value: showActiveTime,
          onChange: setShowActiveTime,
        },
        {
          kind: "text",
          id: "time",
          label: "Time (HH:mm)",
          value: activeTime,
          placeholder: "09:00",
          onChange: setActiveTime,
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
        title="PeriodBar"
        description="Segmented control for the part of the day. Two sizes: `slim` (default, used inside the activity edit form) and `default` (roomier, for standalone day-level selectors). Width adapts via 1fr per cell."
      >
        <StoryFrame
          name="Debugger"
          description="Pick a period from the bar or from the panel. Toggle activeTime to see it replace the range on the active cell only."
        >
          <PeriodBar
            value={safeValue}
            onChange={setValue}
            periods={periods}
            activeTime={showActiveTime ? activeTime : undefined}
            size={size}
            disabled={disabled}
          />
        </StoryFrame>

        <StoryFrame
          name="Sizes side by side"
          description="The two sizes share the same logic — only paddings and font-sizes differ."
        >
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-2">
                slim · default
              </div>
              <PeriodBar
                value="morning"
                onChange={() => {}}
                periods={DEFAULT_PERIODS}
                activeTime="09:30"
                size="slim"
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-2">
                default
              </div>
              <PeriodBar
                value="morning"
                onChange={() => {}}
                periods={DEFAULT_PERIODS}
                activeTime="09:30"
                size="default"
              />
            </div>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Width adapts to container"
          description="Width follows the container. Cells stay balanced (1fr each)."
        >
          <div className="flex flex-col gap-3">
            <div className="w-[320px] border border-dashed border-border rounded-md p-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-2">
                Container 320px · slim
              </div>
              <PeriodBar
                value="afternoon"
                onChange={() => {}}
                periods={DEFAULT_PERIODS}
              />
            </div>
            <div className="w-full border border-dashed border-border rounded-md p-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-2">
                Full-width container · slim
              </div>
              <PeriodBar
                value="evening"
                onChange={() => {}}
                periods={DEFAULT_PERIODS}
              />
            </div>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Three periods · default size"
          description="Periods are configurable. Removing one rebalances the rest."
        >
          <PeriodBar
            value="afternoon"
            onChange={() => {}}
            periods={PRESETS["three-period"]}
            size="default"
          />
        </StoryFrame>
      </StoryPage>
    </>
  );
}
