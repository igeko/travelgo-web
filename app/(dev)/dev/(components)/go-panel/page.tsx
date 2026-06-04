"use client";

import { useCallback, useReducer, useState } from "react";
import { GoPanel } from "@/features/go/GoPanel";
import { api } from "@/lib/client";
import type { GoContext, GoAction } from "@/features/go/types";
import type { GoApiResponse } from "@/app/api/go/route";
import { WIDGET_TOOL_DEFINITIONS } from "@/features/go/widgets/tool-definitions";
import { buildPromptPayload, type GoPromptPayload } from "@/features/go/prompt";
// Registra i widget lato client (componenti React nel registry)
import "@/features/go/widgets/index";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel } from "../_components/ControlsPanel";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   Debug log — ogni "sessione" Go registra request + response
───────────────────────────────────────────────────────────────── */

type DebugEntry = {
  id: string;
  ts: number;
  step: 1 | 2;
  userChoice?: string;
  context: GoContext;
  prompt: GoPromptPayload | undefined;
  response: GoApiResponse | null;
  error: string | null;
  durationMs: number | null;
};

type DebugState = {
  entries: DebugEntry[];
  active: string | null; // id entry selezionata
};

type DebugAction =
  | { type: "START"; id: string; step: 1 | 2; userChoice?: string; context: GoContext; prompt: GoPromptPayload }
  | { type: "SUCCESS"; id: string; response: GoApiResponse; durationMs: number }
  | { type: "ERROR"; id: string; error: string; durationMs: number }
  | { type: "SELECT"; id: string }
  | { type: "CLEAR" };

function debugReducer(state: DebugState, action: DebugAction): DebugState {
  switch (action.type) {
    case "START":
      return {
        entries: [
          { id: action.id, ts: Date.now(), step: action.step, userChoice: action.userChoice, context: action.context, prompt: action.prompt, response: null, error: null, durationMs: null },
          ...state.entries,
        ],
        active: action.id,
      };
    case "SUCCESS":
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.id ? { ...e, response: action.response, durationMs: action.durationMs } : e,
        ),
      };
    case "ERROR":
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.id ? { ...e, error: action.error, durationMs: action.durationMs } : e,
        ),
      };
    case "SELECT":
      return { ...state, active: action.id };
    case "CLEAR":
      return { entries: [], active: null };
    default:
      return state;
  }
}

/* ─────────────────────────────────────────────────────────────────
   Contesto configurabile dalla sandbox
───────────────────────────────────────────────────────────────── */

type TriggerSource = GoContext["trigger"]["source"];
const TRIGGER_SOURCES: TriggerSource[] = [
  "go_banner", "activity_row", "wishlist_item", "day_header", "custom",
];
const PAGES: GoContext["page"][] = ["trip", "day", "activity", "wishlist"];

function buildContext(
  page: GoContext["page"],
  triggerSource: TriggerSource,
  userIntent: string,
  destination: string,
  themes: string[],
): GoContext {
  return {
    page,
    tripId: "sandbox-trip-001",
    trigger: {
      source: triggerSource,
      userIntent: userIntent || undefined,
    },
    trip: {
      destination: destination || "Japan",
      dates: { start: "2026-07-31", end: "2026-08-20" },
      themes,
    },
    day: page === "day" ? { number: 4, title: "Kyoto", activitiesCount: 2 } : undefined,
  };
}

/* ─────────────────────────────────────────────────────────────────
   fetchFn con debug — intercetta request/response per il debug panel
───────────────────────────────────────────────────────────────── */

function useDebugFetch(
  onDebugEntry: (
    id: string,
    phase: "start" | "success" | "error",
    data?: { response?: GoApiResponse; error?: string; durationMs?: number; step?: 1 | 2; userChoice?: string },
  ) => void,
) {
  return useCallback(
    async (context: GoContext, step: 1 | 2, userChoice?: string): Promise<GoApiResponse> => {
      const id = crypto.randomUUID();
      const t0 = Date.now();
      onDebugEntry(id, "start", { step, userChoice });
      try {
        const json = await api.go.legacy<GoApiResponse>({ context, step, userChoice });
        onDebugEntry(id, "success", { response: json, durationMs: Date.now() - t0 });
        return json;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onDebugEntry(id, "error", { error: msg, durationMs: Date.now() - t0 });
        throw err;
      }
    },
    [onDebugEntry],
  );
}

/* ─────────────────────────────────────────────────────────────────
   Pagina sandbox
───────────────────────────────────────────────────────────────── */

const ALL_THEMES = ["Nature", "Food", "Culture", "Sport", "Relax", "Spiritual", "Off-the-beaten"];

export default function GoPanelPage() {
  // Controls
  const [page, setPage] = useState<GoContext["page"]>("trip");
  const [triggerSource, setTriggerSource] = useState<TriggerSource>("go_banner");
  const [userIntent, setUserIntent] = useState("");
  const [destination, setDestination] = useState("Japan");
  const [themes, setThemes] = useState<string[]>(["Nature", "Food", "Culture"]);

  // Debug log
  const [debugState, debugDispatch] = useReducer(debugReducer, { entries: [], active: null });

  // Tab del pannello destro
  const [rightTab, setRightTab] = useState<"controls" | "debug">("controls");

  const context = buildContext(page, triggerSource, userIntent, destination, themes);

  // Azioni ricevute dal widget
  const [lastAction, setLastAction] = useState<GoAction | null>(null);

  const handleDebugEntry = useCallback(
    (
      id: string,
      phase: "start" | "success" | "error",
      data?: { response?: GoApiResponse; error?: string; durationMs?: number; step?: 1 | 2; userChoice?: string },
    ) => {
      if (phase === "start") {
        const step = data?.step ?? 1;
        const userChoice = data?.userChoice;
        const prompt = buildPromptPayload(context, WIDGET_TOOL_DEFINITIONS, step, userChoice);
        debugDispatch({ type: "START", id, step, userChoice, context, prompt });
        setRightTab("debug");
      } else if (phase === "success" && data?.response) {
        debugDispatch({ type: "SUCCESS", id, response: data.response, durationMs: data.durationMs ?? 0 });
      } else if (phase === "error" && data?.error) {
        debugDispatch({ type: "ERROR", id, error: data.error, durationMs: data.durationMs ?? 0 });
      }
    },
    [context],
  );

  const debugFetch = useDebugFetch(handleDebugEntry);

  const activeEntry = debugState.entries.find((e) => e.id === debugState.active) ?? null;

  return (
    <>
      <SandboxRightPanel>
        <div className="flex flex-col h-full">
          {/* Tab switcher */}
          <div className="flex border-b border-border shrink-0">
            {(["controls", "debug"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRightTab(tab)}
                className={cn(
                  "flex-1 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
                  rightTab === tab
                    ? "text-ink border-b-2 border-ink -mb-px"
                    : "text-ink-faint hover:text-ink",
                )}
              >
                {tab === "controls" ? "Controls" : (
                  <span className="flex items-center justify-center gap-1.5">
                    Debug
                    {debugState.entries.length > 0 && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange text-white text-[9px] font-bold">
                        {debugState.entries.length}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Controls tab */}
          {rightTab === "controls" && (
            <div className="overflow-y-auto flex-1">
              <ControlsPanel
                groups={[
                  {
                    title: "Contesto",
                    controls: [
                      {
                        kind: "radio",
                        id: "page",
                        label: "Page",
                        options: PAGES.map((p) => ({ value: p, label: p })),
                        value: page,
                        onChange: (v) => setPage(v as GoContext["page"]),
                      },
                      {
                        kind: "radio",
                        id: "trigger",
                        label: "Trigger source",
                        options: TRIGGER_SOURCES.map((s) => ({ value: s, label: s })),
                        value: triggerSource,
                        onChange: (v) => setTriggerSource(v as TriggerSource),
                      },
                      {
                        kind: "text",
                        id: "intent",
                        label: "User intent",
                        value: userIntent,
                        placeholder: "es. voglio un ristorante di sushi",
                        onChange: setUserIntent,
                      },
                    ],
                  },
                  {
                    title: "Trip",
                    controls: [
                      {
                        kind: "text",
                        id: "destination",
                        label: "Destination",
                        value: destination,
                        placeholder: "es. Japan",
                        onChange: setDestination,
                      },
                      {
                        kind: "multiselect",
                        id: "themes",
                        label: "Themes",
                        options: ALL_THEMES.map((t) => ({ value: t, label: t })),
                        value: themes,
                        min: 0,
                        onChange: (v) => setThemes(v as string[]),
                      },
                    ],
                  },
                ]}
              />
            </div>
          )}

          {/* Debug tab */}
          {rightTab === "debug" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                <span className="text-[10px] uppercase tracking-[0.08em] text-ink-faint font-medium">
                  {debugState.entries.length} request{debugState.entries.length !== 1 ? "s" : ""}
                </span>
                {debugState.entries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => debugDispatch({ type: "CLEAR" })}
                    className="text-[10px] text-ink-soft hover:text-ink underline decoration-ink/20"
                  >
                    Clear
                  </button>
                )}
              </div>

              {debugState.entries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-[12px] text-ink-faint font-serif italic px-6 text-center">
                  Nessuna request ancora. Apri Go per vedere il debug.
                </div>
              ) : (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Entry list */}
                  <div className="flex flex-col divide-y divide-border border-b border-border shrink-0 max-h-[140px] overflow-y-auto">
                    {debugState.entries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => debugDispatch({ type: "SELECT", id: entry.id })}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-left transition-colors",
                          debugState.active === entry.id ? "bg-surface-soft" : "hover:bg-surface-soft",
                        )}
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          entry.response ? "bg-[#3d6e0e]" :
                          entry.error ? "bg-red-500" : "bg-orange animate-pulse",
                        )} />
                        <span className="text-[11px] text-ink font-medium flex-1 truncate">
                          {entry.response
                            ? `step${entry.step} → ${entry.response.widget.widget}`
                            : entry.error ? "error" : `step${entry.step} loading…`}
                        </span>
                        <span className="text-[10px] text-ink-faint shrink-0">
                          {entry.durationMs != null ? `${entry.durationMs}ms` : "…"}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Detail */}
                  {activeEntry && (
                    <div className="flex-1 overflow-y-auto">
                      <DebugDetail entry={activeEntry} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SandboxRightPanel>

      {/* Main */}
      <div className="px-10 py-12">
        <div className="mb-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-1">AI</div>
          <h1 className="text-2xl font-semibold text-ink">GoPanel</h1>
          <p className="mt-2 text-sm text-ink-soft max-w-prose">
            Orchestratore del sistema Go widget. Trigger → API → widget selezionato dall&apos;LLM.
            Configura il contesto nei Controls, osserva request/response nel Debug.
          </p>
        </div>

        <div className="max-w-[560px] flex flex-col gap-8">
          {/* Contesto attivo */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-2">
              Contesto attivo
            </div>
            <pre className="text-[11px] font-mono text-ink-soft bg-surface border border-border rounded-xl px-4 py-3 overflow-x-auto leading-relaxed">
              {JSON.stringify(context, null, 2)}
            </pre>
          </section>

          {/* GoPanel */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">
              Preview
            </div>
            <GoPanel
              context={context}
              fetchFn={debugFetch}
              onAction={setLastAction}
            />
          </section>

          {/* Ultima azione ricevuta */}
          {lastAction && (
            <section>
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-2">
                Ultima action ricevuta
              </div>
              <pre className="text-[11px] font-mono text-ink-soft bg-surface border border-border rounded-xl px-4 py-3 overflow-x-auto">
                {JSON.stringify(lastAction, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DebugDetail — mostra GoContext + GoResponse di una entry
───────────────────────────────────────────────────────────────── */

type DebugTab = "prompt" | "request" | "response";

function DebugDetail({ entry }: { entry: DebugEntry }) {
  const [tab, setTab] = useState<DebugTab>("prompt");

  const tabs: { id: DebugTab; label: string }[] = [
    { id: "prompt",   label: "Prompt" },
    { id: "request",  label: "Context" },
    { id: "response", label: "Response" },
  ];

  return (
    <div className="flex flex-col">
      {/* Tab mini */}
      <div className="flex border-b border-border shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-medium uppercase tracking-[0.07em] transition-colors",
              tab === t.id ? "text-ink border-b border-ink" : "text-ink-faint hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-4">
        {tab === "prompt" && <PromptDetail prompt={entry.prompt} />}

        {tab === "request" && <JsonBlock data={entry.context} />}

        {tab === "response" && (
          entry.error
            ? <div className="text-[11px] text-red-600 font-mono">{entry.error}</div>
            : entry.response
            ? (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange mb-1.5">Text</div>
                  <div className="text-[11px] text-ink bg-surface-soft rounded-lg px-3 py-2.5 font-serif italic leading-snug">
                    {entry.response.text}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange mb-1.5">Widget</div>
                  <JsonBlock data={entry.response.widget} />
                </div>
              </div>
            )
            : <div className="text-[11px] text-ink-faint font-serif italic">In attesa…</div>
        )}
      </div>
    </div>
  );
}

function PromptDetail({ prompt }: { prompt: GoPromptPayload | undefined }) {
  if (!prompt) {
    return <div className="text-[11px] text-ink-faint font-serif italic">Prompt non disponibile.</div>;
  }
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* System */}
      <div>
        <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange mb-1.5">
          System
        </div>
        <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-lg px-3 py-2.5">
          {prompt.system}
        </pre>
      </div>

      {/* User message */}
      <div>
        <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange mb-1.5">
          User message
        </div>
        <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-lg px-3 py-2.5">
          {prompt.userMessage}
        </pre>
      </div>

      {/* Tools — collassabili perché lunghi */}
      <div>
        <button
          type="button"
          onClick={() => setToolsOpen((o) => !o)}
          className="flex items-center gap-2 w-full text-left"
        >
          <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange">
            Tools ({prompt.tools.length})
          </div>
          <svg
            viewBox="0 0 12 12"
            className={cn("w-2.5 h-2.5 text-ink-faint transition-transform", toolsOpen && "rotate-180")}
            fill="none" stroke="currentColor" strokeWidth={2}
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>
        {toolsOpen && (
          <div className="flex flex-col gap-2 mt-2">
            {prompt.tools.map((tool) => (
              <div key={tool.function.name}>
                <div className="text-[9px] font-medium text-ink-soft mb-1 font-mono">
                  {tool.function.name}
                </div>
                <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-lg px-3 py-2.5 overflow-x-auto">
                  {JSON.stringify(tool, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* tool_choice */}
      <div>
        <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-orange mb-1.5">
          tool_choice
        </div>
        <code className="text-[10px] font-mono text-ink bg-surface-soft rounded px-2 py-1">
          &quot;{prompt.tool_choice}&quot;
        </code>
      </div>
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
