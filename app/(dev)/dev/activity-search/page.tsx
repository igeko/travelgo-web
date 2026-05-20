"use client";

import { useState } from "react";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { ActivitySearchField } from "@/features/activity/ActivitySearchField";
import type { TripActivityOption } from "@/features/activity/types";

const DEMO_TRIP_ID = "47c851d1-ee78-4a85-99d0-431fb7c0bf8a";

/* ── Sample data — Tokyo trip ── */
const SAMPLE: TripActivityOption[] = [
  { id: "a1", title: "Tsukiji Outer Market", location: "Chuo, Tokyo", scheduled: [{ date: "2026-09-12", time: "09:00", status: "booked" }] },
  { id: "a2", title: "teamLab Planets TOKYO", location: "Toyosu, Koto", scheduled: [{ date: "2026-09-12", time: "10:30", status: "paid" }] },
  { id: "a3", title: "Shibuya Crossing", location: "Shibuya, Tokyo", scheduled: [{ date: "2026-09-13", time: "14:00", status: "todo" }] },
  { id: "a4", title: "Meiji Shrine", location: "Harajuku, Shibuya", scheduled: [{ date: "2026-09-13", time: "16:00", status: "todo" }] },
  { id: "a5", title: "Senso-ji Temple", location: "Asakusa, Taito", scheduled: [] },
  { id: "a6", title: "Shinjuku Gyoen", location: "Shinjuku, Tokyo", scheduled: [{ date: "2026-09-14", time: "10:00", status: "booked" }, { date: "2026-09-17", time: "16:00", status: "todo" }] },
  { id: "a7", title: "Omoide Yokocho", location: "Shinjuku, Tokyo", scheduled: [{ date: "2026-09-15", time: "19:30", status: null }] },
  { id: "a8", title: "Tokyo National Museum", location: "Ueno, Taito", scheduled: [] },
  { id: "a9", title: "Akihabara Electric Town", location: "Chiyoda, Tokyo", scheduled: [] },
  { id: "a10", title: "Tokyo Skytree", location: "Sumida, Tokyo", scheduled: [{ date: "2026-09-16", time: "20:00", status: "booked" }] },
];

type Source = "mock" | "live";
type Layout = "floating" | "inline";
type Size = "sm" | "md";

export default function ActivitySearchStories() {
  const [source, setSource] = useState<Source>("mock");
  const [tripId, setTripId] = useState(DEMO_TRIP_ID);
  const [layout, setLayout] = useState<Layout>("inline");
  const [size, setSize] = useState<Size>("md");
  const [label, setLabel] = useState("");
  const [labelAlwaysVisible, setLabelAlwaysVisible] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [selected, setSelected] = useState<TripActivityOption | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Data",
      controls: [
        {
          kind: "radio",
          id: "source",
          label: "Source",
          value: source,
          options: [
            { value: "mock", label: "Mock (Tokyo)" },
            { value: "live", label: "Live trip" },
          ],
          onChange: (v) => {
            setSource(v as Source);
            setSelected(null);
          },
        },
        {
          kind: "text",
          id: "tripId",
          label: "Trip ID (live)",
          value: tripId,
          placeholder: "trip uuid",
          onChange: (v) => {
            setTripId(v);
            setSelected(null);
          },
        },
      ],
    },
    {
      title: "Layout & labels",
      controls: [
        {
          kind: "radio",
          id: "layout",
          label: "Layout",
          value: layout,
          options: [
            { value: "floating", label: "Floating" },
            { value: "inline", label: "Inline panel" },
          ],
          onChange: (v) => setLayout(v as Layout),
        },
        {
          kind: "radio",
          id: "size",
          label: "Size",
          value: size,
          options: [
            { value: "md", label: "Medium" },
            { value: "sm", label: "Small" },
          ],
          onChange: (v) => setSize(v as Size),
        },
        {
          kind: "text",
          id: "label",
          label: "Field label",
          value: label,
          placeholder: "(none)",
          onChange: setLabel,
        },
        {
          kind: "toggle",
          id: "labelAlwaysVisible",
          label: "Label always visible",
          value: labelAlwaysVisible,
          onChange: setLabelAlwaysVisible,
        },
        {
          kind: "text",
          id: "placeholder",
          label: "Placeholder",
          value: placeholder,
          placeholder: "(i18n default)",
          onChange: setPlaceholder,
        },
      ],
    },
  ];

  const isLive = source === "live";

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="ActivitySearchField"
        description="Combobox to search the activities of a trip. Results are grouped into To plan / Already planned, with the local day label, time and booking status of each occurrence. Full keyboard navigation (↑ ↓ Enter Esc) and ARIA combobox/listbox semantics."
      >
        <StoryFrame
          name={isLive ? "Live trip" : "Mock data"}
          description={
            isLive
              ? "Fetches the trip's activities from /api/activities/search (requires you to be a member of the trip). Switch source and layout from the controls panel."
              : "Static Tokyo sample. Switch to a live trip or change the layout from the controls panel."
          }
        >
          <div className="max-w-[560px]">
            <ActivitySearchField
              key={`${source}-${isLive ? tripId : "mock"}`}
              value={selected}
              onChange={setSelected}
              {...(isLive ? { tripId } : { items: SAMPLE })}
              defaultOpen={layout === "inline"}
              size={size}
              label={label || undefined}
              labelAlwaysVisible={labelAlwaysVisible}
              placeholder={placeholder || undefined}
            />
          </div>
        </StoryFrame>

        <DocsFrame>
          <PropsTable
            rows={[
              { prop: "value", type: "TripActivityOption | null", required: true, description: "Currently selected activity (controlled)." },
              { prop: "onChange", type: "(a: TripActivityOption | null) => void", required: true, description: "Fired on select / clear." },
              { prop: "tripId", type: "string", description: "Fetches the trip's activities once. Ignored when items is provided." },
              { prop: "items", type: "TripActivityOption[]", description: "Pre-supplied activities (skips fetching). For tests / sandbox." },
              { prop: "placeholder", type: "string", defaultValue: "ActivitySearch.placeholder", description: "Input placeholder." },
              { prop: "label", type: "string", description: "Floating field label." },
              { prop: "labelAlwaysVisible", type: "boolean", defaultValue: "false", description: "Keep the floating label visible instead of only on hover/focus." },
              { prop: "size", type: '"sm" | "md"', defaultValue: '"md"', description: "Visual size, mirroring SoftField." },
              { prop: "defaultOpen", type: "boolean", defaultValue: "false", description: "Render as an always-open inline panel instead of a floating dropdown." },
              { prop: "className", type: "string", description: "Extra classes on the wrapper." },
            ]}
          />
          <CodeBlock
            code={`import { ActivitySearchField } from "@/features/activity/ActivitySearchField";

const [activity, setActivity] = useState<TripActivityOption | null>(null);

// Live — fetches the trip's activities
<ActivitySearchField tripId={tripId} value={activity} onChange={setActivity} />`}
          />
        </DocsFrame>
      </StoryPage>
    </>
  );
}
