"use client";

/**
 * Sandbox — ActivityTimeline
 * URL: /dev/activity-timeline
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

type View = "lista" | "timeline" | "racconto";

export default function ActivityTimelineSandbox() {
  const [editMode, setEditMode] = useState(true);
  const [view, setView]         = useState<View>("timeline");
  const [resetKey, setResetKey] = useState(0);

  const groups: ControlGroup[] = [
    {
      title: "Modalità",
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
      title: "Vista",
      controls: [
        {
          kind: "radio",
          id: "view",
          label: "View",
          options: [
            { value: "lista",    label: "Lista"    },
            { value: "timeline", label: "Timeline" },
            { value: "racconto", label: "Racconto" },
          ],
          value: view,
          onChange: (v) => setView(v as View),
        },
      ],
    },
    {
      title: "Reset",
      controls: [
        {
          kind: "toggle",
          id: "reset",
          label: "Reset blocchi",
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
        description="Day editor spine view. Gestisce internamente stato + optimistic updates tramite useTimeline. In questa sandbox le chiamate API ritornano 404 (dayId = 'sandbox') ma il componente rimane funzionale in locale."
      >
        {/* ── Story: Timeline view ── */}
        <StoryFrame
          name="Spine view — giorno a Tokyo"
          description="3 sezioni (Morning / Afternoon / Evening), blocchi tipizzati (place/meal/pause/action), variante fuzzy, bridge espandibili. In edit mode: hover per vedere pencil + trash + drag handle. Pencil apre l'InstancePopover."
        >
          <div className="w-full max-w-[680px]">
            <ActivityTimeline
              key={resetKey}
              dayId="sandbox"
              tripId="sandbox-trip"
              initialBlocks={INITIAL_BLOCKS}
              editMode={editMode}
              view={view}
              onViewChange={setView}
            />
          </div>
        </StoryFrame>

        {/* ── Story: Solo fuzzy blocks ── */}
        <StoryFrame
          name="Variante fuzzy"
          description="Blocchi senza location precisa: bordo tratteggiato, dot grigio sulla spine, testo italic uppercase. Usata per pasti/pause/azioni senza indirizzo."
        >
          <div className="w-full max-w-[680px]">
            <ActivityTimeline
              key={`fuzzy-${resetKey}`}
              dayId="sandbox-fuzzy"
              tripId="sandbox-trip"
              initialBlocks={[
                { ...STUB, id: "f1", day_id: "sandbox-fuzzy", position: 1, slot: "morning", title: "COLAZIONE IN HOTEL", type: "meal", fuzzy: true },
                { ...STUB, id: "f2", day_id: "sandbox-fuzzy", position: 2, slot: "morning", title: "TEMPO LIBERO", type: "pause", fuzzy: true },
                { ...STUB, id: "f3", day_id: "sandbox-fuzzy", position: 3, slot: "afternoon", title: "CERCA SOUVENIR", type: "action", fuzzy: true, instance_note: "Budget max ¥5,000" },
              ]}
              editMode={editMode}
              view={view}
              onViewChange={setView}
            />
          </div>
        </StoryFrame>

        {/* ── Story: Lista vuota ── */}
        <StoryFrame
          name="Timeline vuota"
          description="Stato empty — nessun blocco. In edit mode l'add affordance è sempre visibile in basso."
        >
          <div className="w-full max-w-[680px]">
            <ActivityTimeline
              key={`empty-${resetKey}`}
              dayId="sandbox-empty"
              tripId="sandbox-trip"
              initialBlocks={[]}
              editMode={editMode}
              view={view}
              onViewChange={setView}
            />
          </div>
        </StoryFrame>

        {/* ── Props table ── */}
        <StoryFrame name="Props API" description="">
          <PropsTable
            rows={[
              { prop: "dayId",          type: "string",          required: true,  description: "ID del giorno — usato per fetch /api/days/[id]/blocks" },
              { prop: "tripId",         type: "string",          required: true,  description: "ID del trip — per autocomplete e auth" },
              { prop: "initialBlocks",  type: "TimelineBlock[]", required: true,  description: "Blocchi iniziali server-fetched — evita flash" },
              { prop: "editMode",       type: "boolean",         defaultValue: "false", description: "Se true mostra hover actions, add affordance, AI organize" },
              { prop: "view",           type: '"lista" | "timeline" | "racconto"', defaultValue: '"timeline"', description: "Vista attiva — Timeline è la spine view" },
              { prop: "onViewChange",   type: "(v: View) => void", description: "Callback cambio vista — usato dal ViewToggle in toolbar" },
              { prop: "onShowMap",      type: "() => void",      description: "Callback pulsante Show map — se omesso il pulsante non appare" },
            ]}
          />
        </StoryFrame>
      </StoryPage>
    </>
  );
}
