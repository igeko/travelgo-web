"use client";

/**
 * Sandbox — ActivityTimeline
 * URL: /dev/activity-timeline
 *
 * Pure timeline component — no chrome (Show Map, View Toggle, AI Organize
 * are provided by the host page).
 *
 * Editor JSON: modifica i blocchi in ingresso (initialBlocks) e premi
 * "Applica" per testare al volo i diversi stati. I preset caricano set pronti.
 *
 * Nota: useTimeline fa fetch reali verso /api/days/[id]/blocks.
 * Con dayId = "sandbox" le chiamate ritornano 404 e i blocchi restano
 * quelli passati in initialBlocks (optimistic updates visibili, no persistenza).
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import { StoryPage, StoryFrame, PropsTable } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { Timeline } from "@/features/activity/Timeline";
import type { TimelineBlock } from "@/features/activity/types";

/* ─────────────────────────────────────────────────────────────────
   Mock data
───────────────────────────────────────────────────────────────── */

const BASE: TimelineBlock = {
  id: "",
  activity_id: "activity-stub",
  day_id: "sandbox",
  trip_id: "sandbox-trip",
  slot: "morning",
  position: 0,
  time: null,
  title: "",
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

/** Factory: ritorna esplicitamente un TimelineBlock partendo dal BASE. */
function mk(over: Partial<TimelineBlock>): TimelineBlock {
  return { ...BASE, ...over };
}

const TOKYO_BLOCKS: TimelineBlock[] = [
  // ── Morning ──────────────────────────────────────────────────────
  mk({
    id: "b1", position: 1,
    slot: "morning", time: "09:00",
    title: "Tsukiji Outer Market",
    location: "Tsukiji, Chuo, Tokyo",
    type: "place",
    booking_status: "booked",
  }),
  mk({
    id: "b2", position: 2,
    slot: "morning", time: "10:30",
    title: "teamLab Planets TOKYO",
    location: "Toyosu, Koto, Tokyo",
    type: "place",
    booking_status: "paid",
    // transit mostrato SOPRA il blocco (in arrivo da Tsukiji)
    bridge_in_json: { transport: "walk", duration_min: 12, line: null, stops: null, note: null },
  }),
  mk({
    id: "b3", position: 3,
    slot: "morning", time: "12:30",
    title: "PRANZO · ICHIRAN RAMEN",
    type: "meal",
    fuzzy: true,
    bridge_in_json: { transport: "metro", duration_min: 8, line: "Hibiya Line", stops: "Toyosu → Shibuya", note: null },
  }),

  // ── Afternoon ─────────────────────────────────────────────────────
  mk({
    id: "b4", position: 4,
    slot: "afternoon", time: "14:00",
    title: "Shibuya Crossing",
    location: "Shibuya, Tokyo",
    type: "place",
    booking_status: "todo",
  }),
  mk({
    id: "b5", position: 5,
    slot: "afternoon",
    title: "PAUSA CAFFÈ",
    type: "pause",
    fuzzy: true,
    bridge_in_json: { transport: "walk", duration_min: 5, line: null, stops: null, note: null },
  }),
  mk({
    id: "b6", position: 6,
    slot: "afternoon", time: "16:00",
    title: "Meiji Shrine",
    location: "Harajuku, Shibuya, Tokyo",
    type: "place",
    booking_status: "todo",
    bridge_in_json: { transport: "taxi", duration_min: 20, line: null, stops: null, note: null },
  }),

  // ── Evening ───────────────────────────────────────────────────────
  mk({
    id: "b7", position: 7,
    slot: "evening", time: "19:30",
    title: "Omoide Yokocho",
    location: "Shinjuku, Tokyo",
    type: "place",
  }),
  mk({
    id: "b8", position: 8,
    slot: "evening", time: "21:00",
    title: "PRENOTA CENA YAKINIKU",
    type: "action",
    fuzzy: true,
    instance_note: "Verifica disponibilità sabato sera",
    bridge_in_json: { transport: "walk", duration_min: 3, line: null, stops: null, note: null },
  }),
];

const FUZZY_BLOCKS: TimelineBlock[] = [
  mk({ id: "f1", position: 1, slot: "morning", title: "BREAKFAST AT HOTEL", type: "meal", fuzzy: true }),
  mk({ id: "f2", position: 2, slot: "morning", title: "FREE TIME", type: "pause", fuzzy: true }),
  mk({ id: "f3", position: 3, slot: "afternoon", title: "BUY SOUVENIRS", type: "action", fuzzy: true, instance_note: "Budget max ¥5,000" }),
];

/** Solo attività "vere" (nessun blocco fuzzy, nessun bridge). */
const ACTIVITY_BLOCKS: TimelineBlock[] = TOKYO_BLOCKS
  .filter((b) => !b.fuzzy)
  .map((b) => ({ ...b, bridge_in_json: null, bridge_out_json: null }));

const PRESETS: { id: string; label: string; blocks: TimelineBlock[] }[] = [
  { id: "tokyo", label: "Tokyo day", blocks: TOKYO_BLOCKS },
  { id: "activity", label: "Solo activity", blocks: ACTIVITY_BLOCKS },
  { id: "fuzzy", label: "Solo fuzzy", blocks: FUZZY_BLOCKS },
  { id: "empty", label: "Vuoto", blocks: [] },
];

function toJson(blocks: TimelineBlock[]): string {
  return JSON.stringify(blocks, null, 2);
}

/* ─────────────────────────────────────────────────────────────────
   Sandbox page
───────────────────────────────────────────────────────────────── */

export default function ActivityTimelineSandbox() {
  const [editMode, setEditMode] = useState(true);
  const [tripId, setTripId] = useState("47c851d1-ee78-4a85-99d0-431fb7c0bf8a");
  const [dayId, setDayId] = useState("0b82ada3-296f-425a-ae49-e51581abdb5c");

  // JSON editor state
  const [jsonText, setJsonText] = useState<string>(() => toJson(TOKYO_BLOCKS));
  const [blocks, setBlocks] = useState<TimelineBlock[]>(TOKYO_BLOCKS);
  const [error, setError] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);

  function apply(text: string = jsonText) {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("Il JSON deve essere un array di blocchi.");
      }
      setBlocks(parsed as TimelineBlock[]);
      setError(null);
      setRenderKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function format() {
    try {
      setJsonText(toJson(JSON.parse(jsonText)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function loadPreset(preset: (typeof PRESETS)[number]) {
    setJsonText(toJson(preset.blocks));
    setBlocks(preset.blocks);
    setError(null);
    setRenderKey((k) => k + 1);
  }

  // Carica le attività reali del giorno dal DB (così la timeline rispecchia
  // il giorno e l'add rileva correttamente i duplicati / aggiunge i nuovi).
  async function loadFromDb() {
    try {
      const real = await api.activities.listForDay(dayId);
      setBlocks(real as unknown as TimelineBlock[]);
      setJsonText(toJson(real as unknown as TimelineBlock[]));
      setError(null);
      setRenderKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

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
      title: "Trip",
      controls: [
        {
          kind: "text",
          id: "tripId",
          label: "Trip ID",
          value: tripId,
          placeholder: "trip uuid",
          onChange: setTripId,
        },
        {
          kind: "text",
          id: "dayId",
          label: "Day ID",
          value: dayId,
          placeholder: "day uuid",
          onChange: setDayId,
        },
      ],
    },
  ];

  const btnBase =
    "px-2.5 py-1 rounded-md text-tiny font-medium transition-colors border";

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="Timeline"
        description="Pure timeline component (embedded, v2). Editor JSON per testare gli stati: modifica initialBlocks e premi Applica, oppure carica un preset."
      >
        {/* ── Story: editable timeline ── */}
        <StoryFrame
          name="Editor JSON → Timeline"
          description="Modifica l'array di blocchi (initialBlocks) e premi Applica. Ogni Applica rimonta la Timeline col nuovo input. Usa i preset per partire da uno stato pronto."
        >
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mr-1">
              Preset
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => loadPreset(p)}
                className={cn(btnBase, "bg-surface text-ink border-border hover:border-border-strong")}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={loadFromDb}
              className={cn(btnBase, "bg-ink text-white border-ink hover:opacity-90")}
              title="Carica le attività reali del giorno (Day ID) dal database"
            >
              Carica giorno (DB)
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {/* Live preview */}
            <div className="bg-white rounded-lg p-4 flex justify-center">
              <Timeline
                key={`${renderKey}-${dayId}`}
                dayId={dayId}
                tripId={tripId}
                initialBlocks={blocks}
                editMode={editMode}
              />
            </div>

            {/* Editor (sotto la preview) */}
            <div className="flex flex-col gap-2">
              <textarea
                value={jsonText}
                spellCheck={false}
                onChange={(e) => setJsonText(e.target.value)}
                onKeyDown={(e) => {
                  // Cmd/Ctrl+Enter → Applica
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    apply();
                  }
                }}
                className="w-full h-[360px] rounded-lg border border-border bg-ink text-[#e8e8e0] font-mono text-[12px] leading-relaxed p-3 resize-y focus:outline-none focus:border-ink"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => apply()}
                  className={cn(btnBase, "bg-ink text-white border-ink hover:opacity-90")}
                >
                  Applica
                  <span className="ml-1.5 text-[10px] opacity-60">⌘⏎</span>
                </button>
                <button
                  type="button"
                  onClick={format}
                  className={cn(btnBase, "bg-surface text-ink border-border hover:border-border-strong")}
                >
                  Formatta
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset(PRESETS[0])}
                  className={cn(btnBase, "bg-surface text-ink border-border hover:border-border-strong")}
                >
                  Reset
                </button>
                {error ? (
                  <span className="text-tiny text-danger-fg">⚠ {error}</span>
                ) : (
                  <span className="text-tiny text-success-fg">
                    JSON valido · {blocks.length} {blocks.length === 1 ? "blocco" : "blocchi"}
                  </span>
                )}
              </div>
            </div>
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
