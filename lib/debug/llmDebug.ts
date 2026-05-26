"use client";

/**
 * lib/debug/llmDebug.ts
 * ─────────────────────────────────────────────────────────────────
 * Tiny client-side pub/sub ring buffer for LLM call observability.
 * Go publishes each /api/go/chat response here; the Explore debug panel
 * subscribes. Decoupled — no prop threading, survives across the page.
 * ─────────────────────────────────────────────────────────────────
 */

/** Token usage; `cachedTokens` = prompt prefix served from the provider cache. */
type DebugUsage = { promptTokens: number; completionTokens: number; totalTokens: number; cachedTokens?: number };

/** One model call inside an agent turn. Mirrors the server `AgentIteration`. */
export type AgentDebugIteration = {
  index: number;
  kind: "tools" | "answer" | "gated" | "intro" | "forced-final";
  usage: DebugUsage | null;
  text: string;
  toolCalls: { name: string; arguments: Record<string, unknown> }[];
  toolResults: { name: string; result: unknown }[];
};

/** Structured trace for one agent turn (system prompt, payload split, per-call breakdown). */
export type AgentDebugTrace = {
  systemPrompt: string;
  tools: { name: string; description: string }[];
  history: { role: string; content: string; tokens?: number }[];
  context: string | null;
  userMessage: string;
  iterations: AgentDebugIteration[];
  /** Exact per-message content-token weights. */
  tokens?: { system: number; tools: number; context: number; userMessage: number };
};

export type LlmDebugEntry = {
  id: string;
  ts: number;
  /** "openai" | "gemini" | null (from the X-LLM-Provider header). */
  provider: string | null;
  model?: string | null;
  /** "suggestions" | "chat" | "deepdive". */
  mode: string;
  durationMs?: number | null;
  /** System prompt actually sent to the model (debug mode only). */
  systemPrompt?: string | null;
  /** Exact message array sent to the model, system excluded (debug mode only). */
  sentMessages?: { role: string; content: string }[];
  /** Token usage, summed over the call(s), when the server reports it. */
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cachedTokens?: number } | null;
  /** Number of model calls (agent loop), when applicable. */
  iterations?: number | null;
  /**
   * Structured agent trace (Go agent loop). When present, the panel renders the
   * rich per-iteration view instead of the flat systemPrompt/sentMessages view.
   */
  agent?: AgentDebugTrace | null;
  /** Raw assistant output — JSON string (JSON modes) or accumulated text. */
  raw: string;
  /** Final assistant text shown to the user (the natural-language answer). */
  responseText?: string | null;
  /** Places grounded via Google Maps (Gemini), when the server reports them. */
  grounded?: { title: string; placeId: string }[];
};

const MAX_ENTRIES = 20;

let entries: LlmDebugEntry[] = [];
const listeners = new Set<() => void>();

export function publishLlmDebug(entry: LlmDebugEntry): void {
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  for (const l of listeners) l();
}

export function getLlmDebug(): LlmDebugEntry[] {
  return entries;
}

export function clearLlmDebug(): void {
  entries = [];
  for (const l of listeners) l();
}

export function subscribeLlmDebug(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
