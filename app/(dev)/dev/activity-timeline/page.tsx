"use client";

/**
 * Sandbox — ActivityTimeline
 * URL: /dev/activity-timeline
 *
 * Pure timeline component — no chrome (Show Map, View Toggle, AI Organize
 * are provided by the host page).
 *
 * Nota: useTimeline fa fetch reali verso /api/days/[id]/blocks.
 * Con dayId = "sandbox" le chiamate ritornano 404 e i blocchi restano
 * quelli passati in initialBlocks (optimistic updates visibili, no persistenza).
 */

import { useState } from "react";
import { StoryPage, StoryFrame, PropsTable } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { ActivityTimeline } from "@/features/activity/ActivityTimeline";
import type { TimelineBlock } from "@/features/activity/types";
import type { Activity } from "@/lib/dal/trips";

/* ─────────────────────────────────────────────────────────────────
   Mock data
───────────────────────────────────────────────────────────────── */

const STUB: Omit<Activity, "id" | "day_id" | "title" | "slot" | "position"> = {
  trip_id: "sandbox-trip",
  time: null,
  short_desc: null,
  location: null,
  location_place_id: null,
  location_lat: null,
  location_lng: null,
  icon: null,
  hero_image: null,
  url: null,
  budget_amount: null,
  budget_currency: null,
  budget_paid: false,
  booking: null,
  place_enriched: null,
  // timeline fields
  type: "place",
  fuzzy: false,
  instance_note: null,
  booking_status: null,
  bridge_in_json: null,
  bridge_out_json: null,
  entity_id: null,
};

const INITIAL_BLOCKS: TimelineBlock[] = [
  // ── Morning ──────────────────────────────────────────────────────
  {
    ...STUB,
    id: "b1", day_id: "sandbox", position: 1,
    slot: "morning", time: "09:00",
    title: "Tsukiji Outer Market",
    location: "Tsukiji, Chuo, Tokyo",
    type: "place",
    booking_status: "booked",
    bridge_out_json: { transport: "walk", duration_min: 12, line: null, stops: null, note: null },
  },
  {
    ...STUB,
    id: "b2", day_id: "sandbox", position: 2,
    slot: "morning", time: "10:30",
    title: "teamLab Planets TOKYO",
    location: "Toyosu, Koto, Tokyo",
    type: "place",
    booking_status: "paid",
    bridge_out_json: { transport: "metro", duration_min: 8, line: "Hibiya Line", stops: "Toyosu → Shibuya", note: null },
  },
  {
    ...STUB,
    id: "b3", day_id: "sandbox", position: 3,
    slot: "morning", time: "12:30",
    title: "PRANZO · ICHIRAN RAMEN",
    type: "meal",
    fuzzy: true,
  },

  // ── Afternoon ─────────────────────────────────────────────────────
  {
    ...STUB,
    id: "b4", day_id: "sandbox", position: 4,
    slot: "afternoon", time: "14:00",
    title: "Shibuya Crossing",
    location: "Shibuya, Tokyo",
    type: "place",
    booking_status: "todo",
    bridge_out_json: { transport: "walk", duration_min: 5, line: null, stops: null, note: null },
  },
  {
    ...STUB,
    id: "b5", day_id: "sandbox", position: 5,
    slot: "afternoon",
    title: "PAUSA CAFFÈ",
    type: "pause",
    fuzzy: true,
    bridge_out_json: { transport: "taxi", duration_min: 20, line: null, stops: null, note: null },
  },
  {
    ...STUB,
    id: "b6", day_id: "sandbox", position: 6,
    slot: "afternoon", time: "16:00",
    title: "Meiji Shrine",
    location: "Harajuku, Shibuya, Tokyo",
    type: "place",
    booking_status: "todo",
  },

  // ── Evening ───────────────────────────────────────────────────────
  {
    ...STUB,
    id: "b7", day_id: "sandbox", position: 7,
    slot: "evening", time: "19:30",
    title: "Omoide Yokocho",
    location: "Shinjuku, Tokyo",
    type: "place",
    bridge_out_json: { transport: "walk", duration_min: 3, line: null, stops: null, note: null },
  },
  {
    ...STUB,
    id: "b8", day_id: "sandbox", position: 8,
    slot: "evening", time: "21:00",
    title: "PRENOTA CENA YAKINIKU",
    type: "action",
    fuzzy: true,
    instance_note: "Verifica disponibilità sabato sera",
  },
];

/* ─────────────────────────────────────────────────────────────────
   Sandbox page
───────────────────────────────────────────────────────────────── */

export default function ActivityTimelineSandbox() {
  const [editMode, setEditMode] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  const groups: ControlGroup[] = [
    {
      title: "Mode",
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
      title: "Reset",
      controls: [
        {
          kind: "toggle",
          id: "reset",
          label: "Reset blocks",
          value: false,
          onChange: () => setResetKey((k) => k + 1),
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
        title="ActivityTimeline"
        description="Pure timeline component (embedded). Show Map + AI Organize + View Toggle are provided by the host page, not by this component."
      >
        {/* ── Story: Timeline spine ── */}
        <StoryFrame
          name="Spine view — Tokyo day"
          description="3 sections (Morning / Afternoon / Evening), typed blocks (place/meal/pause/action), fuzzy variant, expandable bridges. In edit mode: hover to see pencil + trash. Pencil opens InstancePopover."
        >
          <div className="w-full max-w-[680px]">
            <ActivityTimeline
              key={resetKey}
              dayId="sandbox"
              tripId="sandbox-trip"
              initialBlocks={INITIAL_BLOCKS}
              editMode={editMode}
            />
          </div>
        </StoryFrame>

        {/* ── Story: Fuzzy blocks variant ── */}
        <StoryFrame
          name="Fuzzy variant"
          description="Blocks without precise location: dashed border, gray dot on spine, italic uppercase text. Used for meals/pauses/actions without address."
        >
          <div className="w-full max-w-[680px]">
            <ActivityTimeline
              key={`fuzzy-${resetKey}`}
              dayId="sandbox-fuzzy"
              tripId="sandbox-trip"
              initialBlocks={[
                { ...STUB, id: "f1", day_id: "sandbox-fuzzy", position: 1, slot: "morning", title: "BREAKFAST AT HOTEL", type: "meal", fuzzy: true },
                { ...STUB, id: "f2", day_id: "sandbox-fuzzy", position: 2, slot: "morning", title: "FREE TIME", type: "pause", fuzzy: true },
                { ...STUB, id: "f3", day_id: "sandbox-fuzzy", position: 3, slot: "afternoon", title: "BUY SOUVENIRS", type: "action", fuzzy: true, instance_note: "Budget max ¥5,000" },
              ]}
              editMode={editMode}
            />
          </div>
        </StoryFrame>

        {/* ── Story: Empty timeline ── */}
        <StoryFrame
          name="Empty timeline"
          description="Empty state — no blocks. In edit mode the add affordance is always visible."
        >
          <div className="w-full max-w-[680px]">
            <ActivityTimeline
              key={`empty-${resetKey}`}
              dayId="sandbox-empty"
              tripId="sandbox-trip"
              initialBlocks={[]}
              editMode={editMode}
            />
          </div>
        </StoryFrame>

        {/* ── Props table ── */}
        <StoryFrame name="Props API" description="">
          <PropsTable
            rows={[
              { prop: "dayId",          type: "string",          required: true,  description: "Day ID — used for fetch /api/days/[id]/blocks" },
              { prop: "tripId",         type: "string",          required: true,  description: "Trip ID — for autocomplete and auth" },
              { prop: "initialBlocks",  type: "TimelineBlock[]", required: true,  description: "Initial blocks server-fetched — avoids flash" },
              { prop: "editMode",       type: "boolean",         defaultValue: "false", description: "If true shows hover actions, add affordance" },
            ]}
          />
        </StoryFrame>
      </StoryPage>
    </>
  );
}
