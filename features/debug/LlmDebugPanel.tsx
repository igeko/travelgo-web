"use client";

/**
 * features/debug/LlmDebugPanel.tsx
 * ─────────────────────────────────────────────────────────────────
 * App-wide LLM observability panel. Visible only when debug mode is on
 * (AppHeader kebab → useDebugMode). Subscribes to the `llmDebug` bus.
 *
 * Two render modes per entry:
 *  - Agent turns (Go agent loop) carry a structured `agent` trace → the rich
 *    view: the cached prefix (system prompt + tools), the turn payload split
 *    into history / trip-context / new message, and every model call broken
 *    out with its own tokens, tool calls and results.
 *  - Other calls (GoChatFloat: chat / suggestions / deepdive) carry the flat
 *    `systemPrompt` + `sentMessages` → the legacy view.
 * ─────────────────────────────────────────────────────────────────
 */

import { useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { IconX, IconChevronDown } from "@/components/ui/icons";
import { useDebugMode } from "@/lib/hooks/useDebugMode";
import {
  clearLlmDebug,
  getLlmDebug,
  subscribeLlmDebug,
  type AgentDebugIteration,
  type AgentDebugTrace,
  type LlmDebugEntry,
} from "@/lib/debug/llmDebug";

const EMPTY: LlmDebugEntry[] = [];

/** Color the provider chip so OpenAI vs Gemini calls are scannable at a glance. */
function providerChip(provider: string | null): string {
  if (provider === "gemini") return "bg-primary-soft text-primary-deep border-primary-border";
  if (provider === "openai") return "bg-lime text-lime-text border-border";
  return "bg-surface-soft text-ink-soft border-border";
}

/** Color a message by role so user / assistant / tool are scannable at a glance. */
function roleStyle(role: string): { badge: string; accent: string } {
  switch (role) {
    case "user":      return { badge: "bg-ink text-white border-ink", accent: "border-l-2 border-ink" };
    case "assistant": return { badge: "bg-primary-soft text-primary-deep border-primary-border", accent: "border-l-2 border-primary-border" };
    case "tool":      return { badge: "bg-lime text-lime-text border-border", accent: "border-l-2 border-lime" };
    default:          return { badge: "bg-surface-soft text-ink-soft border-border", accent: "border-l-2 border-border" };
  }
}

/** A role-colored message row (replayed history / sent messages). */
function MessageRow({ role, content, tokens }: { role: string; content: string; tokens?: number | null }) {
  const rs = roleStyle(role);
  return (
    <div className={cn("rounded-sm bg-surface-soft p-2 pl-2.5", rs.accent)}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className={cn("rounded-pill border px-1.5 py-0.5 text-micro font-mono uppercase tracking-meta", rs.badge)}>{role}</span>
        <Tok n={tokens} />
      </div>
      <pre className="max-h-24 overflow-auto text-micro font-mono whitespace-pre-wrap break-words text-ink-soft">{content}</pre>
    </div>
  );
}

/** Color the per-call kind badge by what the call did. */
function kindChip(kind: AgentDebugIteration["kind"]): string {
  switch (kind) {
    case "tools": return "bg-primary-soft text-primary-deep border-primary-border";
    case "answer": return "bg-lime text-lime-text border-border";
    case "gated": return "bg-warning-bg text-warning-fg border-warning-border";
    case "forced-final": return "bg-danger-bg text-danger-fg border-danger-border";
    default: return "bg-surface-soft text-ink-soft border-border";
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-micro font-medium uppercase tracking-eyebrow text-primary-deep">{label}</div>
      {children}
    </div>
  );
}

function Pre({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <pre className={cn("max-h-40 overflow-auto rounded-sm bg-surface-soft p-2 text-micro font-mono whitespace-pre-wrap break-words text-ink-soft", className)}>
      {children}
    </pre>
  );
}

/** Collapsible block — used for the cached prefix (system prompt + tools). */
function Collapsible({ label, defaultOpen = false, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1 text-micro font-medium uppercase tracking-eyebrow text-primary-deep bg-transparent border-0 cursor-pointer px-0"
      >
        <IconChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
        {label}
      </button>
      {open && children}
    </div>
  );
}

/** Compact token line: in / out / total, with cached highlighted. */
function Tokens({ usage }: { usage: NonNullable<LlmDebugEntry["usage"]> }) {
  const cached = usage.cachedTokens ?? 0;
  const hitPct = usage.promptTokens > 0 ? Math.round((cached / usage.promptTokens) * 100) : 0;
  return (
    <span className="text-micro text-ink-soft font-mono">
      {usage.totalTokens} tok · {usage.promptTokens} in / {usage.completionTokens} out
      {cached > 0 ? <span className="text-primary-deep"> · ⚡{cached} cache ({hitPct}%)</span> : null}
    </span>
  );
}

/** Tiny right-aligned token-weight chip. */
function Tok({ n }: { n: number | null | undefined }) {
  if (n == null) return null;
  return <span className="ml-auto shrink-0 text-micro font-mono text-ink-faint">{n} tok</span>;
}

/** One model call: kind, its tokens, the tools it asked for and their results. */
function Iteration({ it }: { it: AgentDebugIteration }) {
  return (
    <div className="rounded-sm border border-border bg-bg p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-micro font-mono text-ink-faint">#{it.index}</span>
        <span className={cn("rounded-pill border px-1.5 py-0.5 text-micro font-mono uppercase tracking-meta", kindChip(it.kind))}>
          {it.kind}
        </span>
        {it.usage ? (
          <span className="ml-auto">
            <Tokens usage={it.usage} />
          </span>
        ) : null}
      </div>

      {/* Final-answer text is shown prominently at the top of the turn — here we
          only surface text that accompanies tool calls (the model's preamble). */}
      {it.text.trim() && it.toolCalls.length > 0 ? <Pre className="max-h-24">{it.text}</Pre> : null}

      {it.toolCalls.length > 0 ? (
        <div className="space-y-1">
          {it.toolCalls.map((c, i) => {
            const result = it.toolResults[i]?.result;
            return (
              <div key={i} className="rounded-sm bg-surface-soft p-2 space-y-1">
                <div className="text-micro font-mono text-primary-deep">→ {c.name}({"…"})</div>
                <div className="text-micro font-mono text-ink-faint">args</div>
                <Pre className="max-h-24 bg-bg">{JSON.stringify(c.arguments, null, 2)}</Pre>
                {result !== undefined ? (
                  <>
                    <div className="text-micro font-mono text-ink-faint">result</div>
                    <Pre className="max-h-32 bg-bg">{JSON.stringify(result, null, 2)}</Pre>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Rich view for an agent turn. Top: the exchange (what the user asked and what
 * Go answered) — the thing you actually want to read. Below: the mechanics —
 * tokens, the model calls (tools), and the full prompt/payload (collapsed).
 */
function AgentBody({ agent, usage, response }: { agent: AgentDebugTrace; usage: LlmDebugEntry["usage"]; response?: string | null }) {
  const tk = agent.tokens;
  // Sum of every message weight sent on the first call (the payload size).
  const payloadTok = tk
    ? tk.system + tk.tools + tk.context + tk.userMessage + agent.history.reduce((s, m) => s + (m.tokens ?? 0), 0)
    : null;
  // The final answer text. Prefer the explicitly-published response; fall back
  // to the last non-empty assistant text in the trace (the narration can land
  // in an earlier call — e.g. alongside a read tool — before a gated proposal).
  const answer =
    response?.trim() ||
    [...agent.iterations].reverse().map((it) => it.text.trim()).find(Boolean) ||
    "";
  return (
    <div className="space-y-2.5">
      {/* ── The exchange — front and center ── */}
      <div className="space-y-1.5">
        <div className="rounded-md bg-ink text-white px-2.5 py-1.5">
          <div className="text-micro uppercase tracking-meta opacity-60 mb-0.5">Utente</div>
          <div className="text-mini leading-relaxed whitespace-pre-wrap break-words">{agent.userMessage || "(vuoto)"}</div>
        </div>
        <div className="rounded-md border border-primary-border bg-primary-soft px-2.5 py-1.5">
          <div className="text-micro uppercase tracking-meta text-primary-deep mb-0.5">Go · risposta</div>
          <div className="text-mini leading-relaxed whitespace-pre-wrap break-words text-ink">
            {answer || "(nessun testo — vedi le tool call qui sotto)"}
          </div>
        </div>
      </div>

      {/* ── Everything else, below ── */}
      <div className="border-t border-border pt-2.5 space-y-2.5">
        {usage ? (
          <div className="rounded-sm bg-surface-soft px-2 py-1.5">
            <Tokens usage={usage} />
            {payloadTok != null ? <span className="text-micro font-mono text-ink-faint"> · payload {payloadTok} tok</span> : null}
          </div>
        ) : null}

        <Section label={`Cosa è successo · ${agent.iterations.length} chiamate al modello`}>
          <div className="space-y-1.5">
            {agent.iterations.map((it) => <Iteration key={it.index} it={it} />)}
          </div>
        </Section>

        <Collapsible label="Prompt & payload inviato">
          <div className="space-y-1.5">
            {/* System prompt */}
            <div className="flex items-center gap-2">
              <span className="text-micro font-mono text-ink-faint">system prompt</span>
              <Tok n={tk?.system} />
            </div>
            <Pre>{agent.systemPrompt}</Pre>

            {/* Tool catalog */}
            <div className="flex items-center gap-2">
              <span className="text-micro font-mono text-ink-faint">tool catalog ({agent.tools.length})</span>
              <Tok n={tk?.tools} />
            </div>
            <div className="rounded-sm bg-surface-soft p-2 space-y-0.5">
              {agent.tools.map((t) => (
                <div key={t.name} className="text-micro font-mono text-ink-soft">
                  <span className="text-primary-deep">{t.name}</span>
                  <span className="text-ink-faint"> — {t.description}</span>
                </div>
              ))}
            </div>

            {/* Replayed history */}
            <div className="flex items-center gap-2">
              <span className="text-micro font-mono text-ink-faint">history ({agent.history.length})</span>
            </div>
            {agent.history.length > 0 ? (
              <div className="space-y-1">
                {agent.history.map((m, i) => (
                  <MessageRow key={i} role={m.role} content={m.content} tokens={m.tokens} />
                ))}
              </div>
            ) : (
              <div className="text-micro text-ink-faint font-mono">nessuna (primo turno)</div>
            )}

            {/* Ephemeral trip context */}
            {agent.context ? (
              <div className="rounded-sm border border-warning-border bg-warning-bg p-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-micro font-mono uppercase tracking-meta text-warning-fg">trip context · effimero</span>
                  <Tok n={tk?.context} />
                </div>
                <pre className="max-h-24 overflow-auto text-micro font-mono whitespace-pre-wrap break-words text-ink-soft">{agent.context}</pre>
              </div>
            ) : null}

            {/* New user message (full text already shown above) */}
            <div className="flex items-center gap-2">
              <span className="text-micro font-mono text-ink-faint">nuovo messaggio utente</span>
              <Tok n={tk?.userMessage} />
            </div>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

/** Legacy view: flat system prompt + message array (GoChatFloat / non-agent calls). */
function LegacyBody({ e }: { e: LlmDebugEntry }) {
  return (
    <>
      {e.systemPrompt ? (
        <Section label="System prompt">
          <Pre>{e.systemPrompt}</Pre>
        </Section>
      ) : null}

      {e.sentMessages?.length ? (
        <Section label={`Messages sent (${e.sentMessages.length})`}>
          <div className="space-y-1">
            {e.sentMessages.map((m, i) => (
              <MessageRow key={i} role={m.role} content={m.content} />
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
        <Pre>{e.raw || "(empty)"}</Pre>
      </Section>
    </>
  );
}

function Entry({ e }: { e: LlmDebugEntry }) {
  const [open, setOpen] = useState(false);
  const cached = e.usage?.cachedTokens ?? 0;
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
        {e.usage ? (
          <span className="text-micro text-ink-soft font-mono">{e.usage.totalTokens}tok</span>
        ) : null}
        {cached > 0 ? (
          <span className="text-micro text-primary-deep font-mono">⚡{cached}</span>
        ) : null}
        <span className="ml-auto text-micro text-ink-faint font-mono">
          {e.durationMs != null ? `${e.durationMs}ms` : ""}
        </span>
        <IconChevronDown className={cn("size-3 text-ink-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-2.5 pb-2 space-y-2">
          {e.model ? <div className="text-micro text-ink-faint font-mono">{e.model}</div> : null}
          {e.usage && !e.agent ? (
            <div className="text-micro text-ink-soft font-mono">
              <Tokens usage={e.usage} />
              {e.iterations != null ? ` · ${e.iterations} iter` : ""}
            </div>
          ) : null}

          {e.agent ? <AgentBody agent={e.agent} usage={e.usage} response={e.responseText} /> : <LegacyBody e={e} />}
        </div>
      )}
    </div>
  );
}

/**
 * Floating LLM observability panel. Visible only when debug mode is enabled
 * from the AppHeader kebab. Shows the active provider and, per Go call, the
 * cached prefix, the turn payload and the per-call token / tool breakdown.
 *
 * Draggable by its header and resizable from the bottom-right grip (both via
 * pointer capture — no global listeners). Starts bottom-left; once moved or
 * resized it switches to explicit top/left + width/height.
 */
export function LlmDebugPanel() {
  const [debug] = useDebugMode();
  const entries = useSyncExternalStore(subscribeLlmDebug, getLlmDebug, () => EMPTY);
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number | null }>({ w: 360, h: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Drag from the header (ignore clicks on the action buttons).
  const onHeaderDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setPos({ x: rect.left, y: rect.top });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHeaderMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const maxX = window.innerWidth - 40;
    const maxY = window.innerHeight - 40;
    setPos({
      x: Math.min(Math.max(0, e.clientX - d.dx), maxX),
      y: Math.min(Math.max(0, e.clientY - d.dy), maxY),
    });
  };
  const onHeaderUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Resize from the bottom-right grip.
  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    resizeRef.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    // Anchor top-left so the panel grows down/right instead of shifting.
    setPos((p) => p ?? { x: rect.left, y: rect.top });
    setSize((s) => ({ w: s.w, h: s.h ?? rect.height }));
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    setSize({
      w: Math.max(280, Math.min(r.w + (e.clientX - r.x), window.innerWidth - 16)),
      h: Math.max(200, Math.min(r.h + (e.clientY - r.y), window.innerHeight - 16)),
    });
  };
  const onResizeUp = (e: React.PointerEvent) => {
    resizeRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (!debug) return null;

  const provider = entries[0]?.provider ?? null;
  const explicitHeight = !collapsed && size.h != null;

  return (
    <div
      ref={containerRef}
      style={{
        left: pos?.x,
        top: pos?.y,
        width: size.w,
        maxWidth: "calc(100vw - 1rem)",
        height: explicitHeight ? size.h! : undefined,
      }}
      className={cn(
        "fixed z-toast flex flex-col rounded-md border border-border bg-surface shadow-lg text-ink",
        !pos && "bottom-4 left-4",
      )}
    >
      <div
        onPointerDown={onHeaderDown}
        onPointerMove={onHeaderMove}
        onPointerUp={onHeaderUp}
        className="flex items-center gap-2 px-3 py-2 border-b border-border cursor-move select-none touch-none shrink-0"
      >
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
        <div className={cn("overflow-auto p-2 space-y-1.5", explicitHeight ? "flex-1 min-h-0" : "max-h-[50vh]")}>
          {entries.length === 0 ? (
            <div className="px-1 py-3 text-center text-tiny text-ink-faint">
              Nessuna chiamata ancora. Chiedi qualcosa a Go.
            </div>
          ) : (
            entries.map((e) => <Entry key={e.id} e={e} />)
          )}
        </div>
      )}
      {!collapsed && (
        <div
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          aria-label="Ridimensiona"
          className="absolute bottom-0 right-0 size-4 cursor-nwse-resize touch-none flex items-end justify-end p-0.5"
        >
          <span className="block size-2 border-b-2 border-r-2 border-ink-faint" />
        </div>
      )}
    </div>
  );
}
