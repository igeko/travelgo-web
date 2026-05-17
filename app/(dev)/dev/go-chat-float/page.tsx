"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import { GoChatFloat } from "@/features/go/GoChatFloat";
import { getGoContext, type TripInfo, type GoFocus } from "@/features/go/context";
import { useTripContext } from "@/features/go/useTripContext";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { cn } from "@/lib/cn";
import type { GoChatDebugCall } from "@/features/go/GoChat";

/* ─────────────────────────────────────────────────────────────────
   Mock trip data
───────────────────────────────────────────────────────────────── */

const MOCK_TRIP_INFO: TripInfo = {
  trip: {
    id: "trip-001",
    title: "Japan",
    subtitle: null,
    start_date: "2026-07-31",
    end_date: "2026-08-20",
    cover_image: null,
    budget_total: 5000,
    currency: "EUR",
    local_currency: "JPY",
    display_currency: "EUR",
    adults_count: 2,
    children_count: 2,
    theme_tags: ["Nature", "Food", "Culture"],
    theme_description: null,
    created_by: "user-001",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  days: [
    { id: "day-1", trip_id: "trip-001", day_number: 1, date: "2026-07-31", city: "Tokyo", label: null, notes: null, day_type: "city", is_ghost: false, use_previous_accommodation: null, accommodation_type: null, accommodation_name: "Shinjuku Hotel", accommodation_address: null, accommodation_url: null, accommodation_notes: null, accommodation_place_id: null, accommodation_lat: null, accommodation_lng: null, accommodation_cost_amount: null, accommodation_cost_currency: null, accommodation_cost_paid: false, image_url: null, created_at: "", updated_at: "" },
    { id: "day-2", trip_id: "trip-001", day_number: 2, date: "2026-08-01", city: "Tokyo", label: null, notes: null, day_type: "city", is_ghost: false, use_previous_accommodation: null, accommodation_type: null, accommodation_name: null, accommodation_address: null, accommodation_url: null, accommodation_notes: null, accommodation_place_id: null, accommodation_lat: null, accommodation_lng: null, accommodation_cost_amount: null, accommodation_cost_currency: null, accommodation_cost_paid: false, image_url: null, created_at: "", updated_at: "" },
    { id: "day-3", trip_id: "trip-001", day_number: 3, date: "2026-08-02", city: "Nikko", label: null, notes: null, day_type: "nature", is_ghost: false, use_previous_accommodation: null, accommodation_type: null, accommodation_name: null, accommodation_address: null, accommodation_url: null, accommodation_notes: null, accommodation_place_id: null, accommodation_lat: null, accommodation_lng: null, accommodation_cost_amount: null, accommodation_cost_currency: null, accommodation_cost_paid: false, image_url: null, created_at: "", updated_at: "" },
    { id: "day-4", trip_id: "trip-001", day_number: 4, date: "2026-08-03", city: "Kyoto", label: null, notes: null, day_type: "city", is_ghost: false, use_previous_accommodation: null, accommodation_type: null, accommodation_name: null, accommodation_address: null, accommodation_url: null, accommodation_notes: null, accommodation_place_id: null, accommodation_lat: null, accommodation_lng: null, accommodation_cost_amount: null, accommodation_cost_currency: null, accommodation_cost_paid: false, image_url: null, created_at: "", updated_at: "" },
  ],
  activities: [
    { id: "act-1", day_id: "day-1", trip_id: "trip-001", slot: "morning", position: 0, time: "09:00", title: "Senso-ji Temple", short_desc: "Iconic Buddhist temple in Asakusa", details: null, notes: null, location: "Asakusa, Tokyo", location_place_id: null, location_lat: null, location_lng: null, coords: null, icon: null, category: null, hero_image: null, booking: null, url: null, budget_amount: null, budget_currency: null, budget_paid: false, budget_category: null, created_at: "", updated_at: "" },
    { id: "act-2", day_id: "day-1", trip_id: "trip-001", slot: "evening", position: 1, time: "19:00", title: "Shibuya Crossing", short_desc: "World's busiest pedestrian crossing", details: null, notes: null, location: "Shibuya, Tokyo", location_place_id: null, location_lat: null, location_lng: null, coords: null, icon: null, category: null, hero_image: null, booking: null, url: null, budget_amount: null, budget_currency: null, budget_paid: false, budget_category: null, created_at: "", updated_at: "" },
    { id: "act-3", day_id: "day-2", trip_id: "trip-001", slot: "afternoon", position: 0, time: "14:00", title: "TeamLab Borderless", short_desc: "Immersive digital art museum", details: null, notes: null, location: "Odaiba, Tokyo", location_place_id: null, location_lat: null, location_lng: null, coords: null, icon: null, category: null, hero_image: null, booking: null, url: null, budget_amount: 3200, budget_currency: "JPY", budget_paid: false, budget_category: null, created_at: "", updated_at: "" },
    { id: "act-4", day_id: "day-4", trip_id: "trip-001", slot: "morning", position: 0, time: "07:00", title: "Fushimi Inari", short_desc: "Thousands of torii gates up the mountain", details: null, notes: null, location: "Fushimi, Kyoto", location_place_id: null, location_lat: null, location_lng: null, coords: null, icon: null, category: null, hero_image: null, booking: null, url: null, budget_amount: null, budget_currency: null, budget_paid: false, budget_category: null, created_at: "", updated_at: "" },
    { id: "act-5", day_id: "day-4", trip_id: "trip-001", slot: "afternoon", position: 1, time: "14:00", title: "Nishiki Market", short_desc: "Kyoto's kitchen — street food and local produce", details: null, notes: null, location: "Downtown Kyoto", location_place_id: null, location_lat: null, location_lng: null, coords: null, icon: null, category: null, hero_image: null, booking: null, url: null, budget_amount: null, budget_currency: null, budget_paid: false, budget_category: null, created_at: "", updated_at: "" },
  ],
  travelersCount: 4,
};

const MOCK_FOCUS_OPTIONS: { label: string; value: GoFocus | null }[] = [
  { label: "None", value: null },
  { label: "Day 1 – Tokyo", value: { type: "day", dayNumber: 1 } },
  { label: "Day 4 – Kyoto", value: { type: "day", dayNumber: 4 } },
  { label: "Fushimi Inari", value: { type: "activity", activityId: "act-4" } },
];

/* ─────────────────────────────────────────────────────────────────
   Debug state
───────────────────────────────────────────────────────────────── */

type DebugState = { entries: GoChatDebugCall[]; active: string | null };
type DebugAction =
  | { type: "UPSERT"; entry: GoChatDebugCall }
  | { type: "SELECT"; id: string }
  | { type: "CLEAR" };

function debugReducer(state: DebugState, action: DebugAction): DebugState {
  switch (action.type) {
    case "UPSERT": {
      const exists = state.entries.some((e) => e.id === action.entry.id);
      if (exists) return { ...state, entries: state.entries.map((e) => e.id === action.entry.id ? action.entry : e), active: state.active ?? action.entry.id };
      return { entries: [action.entry, ...state.entries], active: action.entry.id };
    }
    case "SELECT": return { ...state, active: action.id };
    case "CLEAR": return { entries: [], active: null };
    default: return state;
  }
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function GoChatFloatPage() {
  const [debugState, debugDispatch] = useReducer(debugReducer, { entries: [], active: null });
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"mock" | "real">("mock");
  const DEFAULT_TRIP_ID = "47c851d1-ee78-4a85-99d0-431fb7c0bf8a";
  const [tripIdInput, setTripIdInput] = useState(DEFAULT_TRIP_ID);
  const [tripIdActive, setTripIdActive] = useState<string | null>(DEFAULT_TRIP_ID);
  const [focusIndex, setFocusIndex] = useState(0);

  const mockFocus = MOCK_FOCUS_OPTIONS[focusIndex]?.value ?? undefined;
  const mockContext = useMemo(() => getGoContext(MOCK_TRIP_INFO, mockFocus), [focusIndex]);
  const { context: realContext, loading: realLoading, error: realError } = useTripContext(source === "real" ? tripIdActive : null);
  const tripContext = source === "mock" ? mockContext : realContext;

  const handleDebugCall = useCallback((call: GoChatDebugCall) => {
    debugDispatch({ type: "UPSERT", entry: call });
  }, []);

  const activeEntry = debugState.entries.find((e) => e.id === debugState.active) ?? null;

  return (
    <>
      <SandboxRightPanel>
        <div className="flex flex-col h-full">
          {/* Context preview */}
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange mb-2">Trip context</div>
            <pre className="text-[9px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-lg px-2.5 py-2 max-h-[140px] overflow-y-auto">
              {tripContext}
            </pre>
          </div>

          {/* Debug header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
            <span className="text-[10px] uppercase tracking-[0.08em] text-ink-faint font-medium">
              Debug
              {debugState.entries.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange text-white text-[9px] font-bold">
                  {debugState.entries.length}
                </span>
              )}
            </span>
            {debugState.entries.length > 0 && (
              <button type="button" onClick={() => debugDispatch({ type: "CLEAR" })} className="text-[10px] text-ink-soft hover:text-ink underline decoration-ink/20">
                Clear
              </button>
            )}
          </div>

          {debugState.entries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-ink-faint font-serif italic px-6 text-center">
              No calls yet. Open Go and write something.
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex flex-col divide-y divide-border border-b border-border shrink-0 max-h-[140px] overflow-y-auto">
                {debugState.entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => debugDispatch({ type: "SELECT", id: entry.id })}
                    className={cn("flex items-center gap-2 px-3 py-2 text-left transition-colors", debugState.active === entry.id ? "bg-surface-soft" : "hover:bg-surface-soft")}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", entry.streaming ? "bg-orange animate-pulse" : entry.error ? "bg-red-500" : "bg-[#3d6e0e]")} />
                    <span className="text-[11px] text-ink font-medium flex-1 truncate">
                      {entry.messages[entry.messages.length - 1]?.content ?? "…"}
                    </span>
                    <span className="text-[10px] text-ink-faint shrink-0">
                      {entry.durationMs != null ? `${entry.durationMs}ms` : "…"}
                    </span>
                  </button>
                ))}
              </div>
              {activeEntry && <div className="flex-1 overflow-y-auto"><DebugDetail entry={activeEntry} /></div>}
            </div>
          )}
        </div>
      </SandboxRightPanel>

      {/* Main */}
      <div className="px-10 py-12">
        <div className="mb-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-1">AI</div>
          <h1 className="text-2xl font-semibold text-ink">GoChatFloat</h1>
          <p className="mt-2 text-sm text-ink-soft max-w-prose">
            Chat Go floating · panel fixed bottom-right · suggestions inline con card espandibili · foto lazy via Google Places.
          </p>
        </div>

        <div className="flex flex-col gap-8 max-w-[600px]">

          {/* Source */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-2">Context source</div>
            <div className="flex gap-2 mb-4">
              {(["mock", "real"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSource(s)}
                  className={cn("px-3 py-1.5 rounded-pill text-[11px] font-medium border transition-colors",
                    source === s ? "bg-ink text-white border-ink" : "bg-transparent text-ink-soft border-border hover:border-ink-soft")}>
                  {s === "mock" ? "Mock (Japan)" : "Supabase"}
                </button>
              ))}
            </div>

            {source === "mock" && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-2">Focus</div>
                <div className="flex gap-2 flex-wrap">
                  {MOCK_FOCUS_OPTIONS.map((opt, i) => (
                    <button key={i} type="button" onClick={() => setFocusIndex(i)}
                      className={cn("px-3 py-1.5 rounded-pill text-[11px] font-medium border transition-colors",
                        focusIndex === i ? "bg-ink text-white border-ink" : "bg-transparent text-ink-soft border-border hover:border-ink-soft")}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {source === "real" && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-2">Trip ID</div>
                <form onSubmit={(e) => { e.preventDefault(); setTripIdActive(tripIdInput.trim() || null); }} className="flex gap-2">
                  <input type="text" value={tripIdInput} onChange={(e) => setTripIdInput(e.target.value)}
                    placeholder="uuid…"
                    className="flex-1 text-[12px] font-mono bg-surface border border-border rounded-lg px-3 py-2 text-ink placeholder:text-ink-faint outline-none focus:border-ink-soft" />
                  <button type="submit" className="px-3 py-2 rounded-lg bg-ink text-white text-[11px] font-medium hover:bg-[#1a3d52] transition-colors">Load</button>
                </form>
                {realLoading && <div className="mt-2 text-[11px] text-ink-faint font-serif italic">Loading…</div>}
                {realError && <div className="mt-2 text-[11px] text-red-500 font-mono">{realError}</div>}
                {realContext && !realLoading && <div className="mt-2 text-[10px] text-[#3d6e0e] font-medium">✓ Context loaded</div>}
              </div>
            )}
          </section>

          {/* Trigger */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">Float panel</div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-pill text-[12px] font-medium border transition-colors",
                open
                  ? "bg-surface text-ink-soft border-border cursor-default"
                  : "bg-ink text-white border-ink hover:bg-[#1a3d52] cursor-pointer",
              )}
            >
              {open ? "Go is open ↘" : "Open Go ↘"}
            </button>
            <p className="mt-3 text-[11px] text-ink-faint font-serif italic">
              Try: "suggest restaurants in Kyoto", "what to do in Tokyo", "find me a temple"
            </p>
          </section>

        </div>
      </div>

      {/* The float panel itself */}
      <GoChatFloat
        open={open}
        onClose={() => setOpen(false)}
        tripContext={tripContext}
        onDebugCall={handleDebugCall}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DebugDetail
───────────────────────────────────────────────────────────────── */

type DetailTab = "system" | "messages" | "response";

function DebugDetail({ entry }: { entry: GoChatDebugCall }) {
  const [tab, setTab] = useState<DetailTab>("messages");

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "system", label: "System" },
    { id: "messages", label: "Messages" },
    { id: "response", label: "Response" },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex border-b border-border shrink-0">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn("flex-1 py-1.5 text-[10px] font-medium uppercase tracking-[0.07em] transition-colors",
              tab === t.id ? "text-ink border-b border-ink" : "text-ink-faint hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {tab === "system" && (
          entry.systemPrompt
            ? <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-lg px-3 py-2.5">{entry.systemPrompt}</pre>
            : <div className="text-[11px] text-ink-faint font-serif italic">Available after first response.</div>
        )}

        {tab === "messages" && (
          <div className="flex flex-col gap-3">
            {entry.messages.map((msg, i) => (
              <div key={i}>
                <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange mb-1">{msg.role}</div>
                <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-lg px-3 py-2.5">{msg.content}</pre>
              </div>
            ))}
          </div>
        )}

        {tab === "response" && (
          entry.error
            ? <div className="text-[11px] text-red-500 font-mono">{entry.error}</div>
            : entry.response
              ? <div>
                  {entry.streaming && (
                    <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" /> Streaming…
                    </div>
                  )}
                  <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-lg px-3 py-2.5">{entry.response}</pre>
                </div>
              : <div className="text-[11px] text-ink-faint font-serif italic">Waiting…</div>
        )}
      </div>
    </div>
  );
}
