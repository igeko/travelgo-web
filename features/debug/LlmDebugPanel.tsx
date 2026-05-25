"use client";

/**
 * features/debug/LlmDebugPanel.tsx
 * ─────────────────────────────────────────────────────────────────
 * App-wide LLM observability panel. Visible only when debug mode is on
 * (AppHeader kebab → useDebugMode). Subscribes to the `llmDebug` bus and
 * shows, per Go call: the system prompt, the exact messages sent to the
 * model, the raw response, and grounding info.
 *
 * Mounted once in the authenticated app layout so it follows Go on every
 * page (Explore, trips/new, day…). Replaces the old Explore-only panel.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { IconX, IconChevronDown } from "@/components/ui/icons";
import { useDebugMode } from "@/lib/hooks/useDebugMode";
import {
  clearLlmDebug,
  getLlmDebug,
  subscribeLlmDebug,
  type LlmDebugEntry,
} from "@/lib/debug/llmDebug";

const EMPTY: LlmDebugEntry[] = [];

/** Color the provider chip so OpenAI vs Gemini calls are scannable at a glance. */
function providerChip(provider: string | null): string {
  if (provider === "gemini") return "bg-primary-soft text-primary-deep border-primary-border";
  if (provider === "openai") return "bg-lime text-lime-text border-border";
  return "bg-surface-soft text-ink-soft border-border";
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-micro font-medium uppercase tracking-eyebrow text-primary-deep">{label}</div>
      {children}
    </div>
  );
}

function Entry({ e }: { e: LlmDebugEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-sm border border-border bg-bg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left bg-transparent border-0 cursor-pointer"
      >
        <span className={cn("rounded-pill border px-1.5 py-0.5 text-micro font-mono uppercase tracking-meta", providerChip(e.provider))}>
          {e.provider ?? "?"}
        </span>
        <span className="text-tiny text-ink-soft font-mono">{e.mode}</span>
        {e.grounded?.length ? (
          <span className="text-micro text-primary-deep font-mono">{e.grounded.length}📍</span>
        ) : null}
        <span className="ml-auto text-micro text-ink-faint font-mono">
          {e.durationMs != null ? `${e.durationMs}ms` : ""}
        </span>
        <IconChevronDown className={cn("size-3 text-ink-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-2.5 pb-2 space-y-2">
          {e.model ? <div className="text-micro text-ink-faint font-mono">{e.model}</div> : null}

          {e.systemPrompt ? (
            <Section label="System prompt">
              <pre className="max-h-40 overflow-auto rounded-sm bg-surface-soft p-2 text-micro font-mono whitespace-pre-wrap break-words text-ink-soft">
                {e.systemPrompt}
              </pre>
            </Section>
          ) : null}

          {e.sentMessages?.length ? (
            <Section label={`Messages sent (${e.sentMessages.length})`}>
              <div className="space-y-1">
                {e.sentMessages.map((m, i) => (
                  <div key={i} className="rounded-sm bg-surface-soft p-2">
                    <div className="text-micro font-mono uppercase tracking-meta text-ink-faint mb-0.5">{m.role}</div>
                    <pre className="max-h-32 overflow-auto text-micro font-mono whitespace-pre-wrap break-words text-ink-soft">{m.content}</pre>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {e.grounded?.length ? (
            <Section label="Grounded places">
              <div className="text-micro text-ink-soft font-mono leading-relaxed">
                {e.grounded.map((g) => (
                  <div key={g.placeId} className="truncate">📍 {g.title} <span className="text-ink-faint">· {g.placeId}</span></div>
                ))}
              </div>
            </Section>
          ) : null}

          <Section label="Response">
            <pre className="max-h-40 overflow-auto rounded-sm bg-surface-soft p-2 text-micro font-mono whitespace-pre-wrap break-words text-ink-soft">
              {e.raw || "(empty)"}
            </pre>
          </Section>
        </div>
      )}
    </div>
  );
}

/**
 * Bottom-right LLM observability panel. Visible only when debug mode is enabled
 * from the AppHeader kebab. Shows the active provider and, per Go call, the
 * system prompt, sent messages and raw output (suggestions / chat / deepdive).
 */
export function LlmDebugPanel() {
  const [debug] = useDebugMode();
  const entries = useSyncExternalStore(subscribeLlmDebug, getLlmDebug, () => EMPTY);
  const [collapsed, setCollapsed] = useState(false);

  if (!debug) return null;

  const provider = entries[0]?.provider ?? null;

  return (
    <div className="fixed bottom-4 right-4 z-toast w-[360px] max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface shadow-lg text-ink">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="text-mini font-semibold">LLM debug</span>
        <span className={cn("rounded-pill border px-1.5 py-0.5 text-micro font-mono uppercase tracking-meta", providerChip(provider))}>
          {provider ?? "—"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={clearLlmDebug}
            className="rounded-sm px-1.5 py-0.5 text-micro text-ink-soft hover:bg-surface-soft border-0 bg-transparent cursor-pointer"
          >
            clear
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-sm p-1 text-ink-soft hover:bg-surface-soft border-0 bg-transparent cursor-pointer"
            aria-label={collapsed ? "Espandi" : "Comprimi"}
          >
            {collapsed ? <IconChevronDown className="size-3.5" /> : <IconX className="size-3.5" />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="max-h-[50vh] overflow-auto p-2 space-y-1.5">
          {entries.length === 0 ? (
            <div className="px-1 py-3 text-center text-tiny text-ink-faint">
              Nessuna chiamata ancora. Chiedi qualcosa a Go.
            </div>
          ) : (
            entries.map((e) => <Entry key={e.id} e={e} />)
          )}
        </div>
      )}
    </div>
  );
}
