"use client";

import { useMemo, useState } from "react";
import { DayList } from "@/features/day/DayList";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import {
  ControlsPanel,
  type ControlGroup,
} from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";

type DurationMode = "duration" | "endDate";

// Sample details for the first few days — toggleable in the controls
const SAMPLE_DETAILS: Record<string, { zone?: string; place?: string }> = {
  "day-0": { zone: "TOKYO", place: "Arrival in Tokyo" },
  "day-1": { zone: "TOKYO", place: "Asakusa district and Sumida Gardens" },
  "day-2": { zone: "TOKYO", place: "Imperial Palace and East Gardens" },
  "day-3": { zone: "TOKYO / MT FUJI", place: "Mt Fuji excursion (lakes)" },
  "day-4": { zone: "TOKYO", place: "Ueno and Yanesen — Yanaka" },
  "day-5": { zone: "TOKYO → NIKKO", place: "Camper pickup" },
  "day-6": { zone: "NIKKO", place: "Toshogu Shrine and Rinno-ji" },
};

export default function DayListStories() {
  const [startDate, setStartDate] = useState("2026-07-31");
  const [durationMode, setDurationMode] = useState<DurationMode>("duration");
  const [durationDays, setDurationDays] = useState(21);
  const [endDate, setEndDate] = useState("2026-08-20");
  const [title, setTitle] = useState("Day by day");
  const [selectedDayId, setSelectedDayId] = useState("day-3");
  const [useDetails, setUseDetails] = useState(true);

  // Compute the "selected day" radio options based on the current length
  const dayOptions = useMemo(() => {
    const length =
      durationMode === "duration"
        ? Math.max(1, durationDays)
        : computeInclusiveDays(startDate, endDate);
    // Cap the radio to 10 entries so it doesn't flood the panel
    const cap = Math.min(length, 10);
    return Array.from({ length: cap }, (_, i) => ({
      value: `day-${i}`,
      label: String(i + 1),
    }));
  }, [durationMode, durationDays, startDate, endDate]);

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
          kind: "radio",
          id: "durationMode",
          label: "Duration mode",
          value: durationMode,
          onChange: (v) => setDurationMode(v as DurationMode),
          options: [
            { value: "duration", label: "durationDays" },
            { value: "endDate", label: "endDate" },
          ],
        },
        durationMode === "duration"
          ? {
              kind: "number" as const,
              id: "durationDays",
              label: "Duration (days)",
              value: durationDays,
              min: 1,
              max: 60,
              onChange: setDurationDays,
            }
          : {
              kind: "date" as const,
              id: "endDate",
              label: "End date",
              value: endDate,
              onChange: setEndDate,
            },
      ],
    },
    {
      title: "Header",
      controls: [
        {
          kind: "text",
          id: "title",
          label: "Title",
          value: title,
          placeholder: "Day by day",
          onChange: setTitle,
        },
      ],
    },
    {
      title: "Selection",
      controls: [
        {
          kind: "radio",
          id: "selectedDayId",
          label: `Selected day${dayOptions.length < (durationMode === "duration" ? durationDays : computeInclusiveDays(startDate, endDate)) ? " (first 10)" : ""}`,
          value: selectedDayId,
          onChange: setSelectedDayId,
          options: dayOptions,
        },
      ],
    },
    {
      title: "Content",
      controls: [
        {
          kind: "toggle",
          id: "useDetails",
          label: "Show sample dayDetails",
          value: useDetails,
          onChange: setUseDetails,
        },
      ],
    },
  ];

  const dayDetails = useDetails ? SAMPLE_DETAILS : undefined;

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="DayList"
        description="Trip days aside. Takes startDate + (durationDays or endDate) and generates the list. Controlled selection: the parent must provide selectedDayId and onSelect."
      >
        <StoryFrame
          name="Debugger"
          description="Every DayList prop is driven from the panel on the right. Change the start date, duration, mode, title, and click days to select them."
        >
          <div className="max-w-[340px]">
            <DayList
              startDate={startDate}
              durationDays={
                durationMode === "duration" ? durationDays : undefined
              }
              endDate={durationMode === "endDate" ? endDate : undefined}
              title={title || undefined}
              selectedDayId={selectedDayId}
              onSelect={setSelectedDayId}
              dayDetails={dayDetails}
            />
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}

/* Helpers · panel-only (DayList has its own internal date helpers) */
function computeInclusiveDays(startISO: string, endISO: string): number {
  const [ys, ms, ds] = startISO.split("-").map(Number);
  const [ye, me, de] = endISO.split("-").map(Number);
  const s = new Date(ys, ms - 1, ds);
  const e = new Date(ye, me - 1, de);
  const diff = Math.round(
    (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff + 1);
}
