"use client";

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
        <div className="px-2.5 pb-2 space-y-1.5">
          {e.model ? <div className="text-micro text-ink-faint font-mono">{e.model}</div> : null}
          {e.grounded?.length ? (
            <div className="text-micro text-ink-soft font-mono leading-relaxed">
              {e.grounded.map((g) => (
                <div key={g.placeId} className="truncate">📍 {g.title} <span className="text-ink-faint">· {g.placeId}</span></div>
              ))}
            </div>
          ) : null}
          <pre className="max-h-40 overflow-auto rounded-sm bg-surface-soft p-2 text-micro font-mono whitespace-pre-wrap break-words text-ink-soft">
            {e.raw || "(empty)"}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Bottom-right LLM observability panel for the Explore page. Visible only when
 * debug mode is enabled from the AppHeader kebab. Shows the active provider and
 * the raw output of each Go call (suggestions / chat / deepdive).
 */
export function ExploreDebugPanel() {
  const [debug] = useDebugMode();
  const entries = useSyncExternalStore(subscribeLlmDebug, getLlmDebug, () => EMPTY);
  const [collapsed, setCollapsed] = useState(false);

  if (!debug) return null;

  const provider = entries[0]?.provider ?? null;

  return (
    <div className="fixed bottom-4 right-4 z-30 w-[360px] max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface shadow-lg text-ink">
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
