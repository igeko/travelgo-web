/**
 * app/api/go/agent/_loop.ts
 * ─────────────────────────────────────────────────────────────────
 * The Go agent loop. Runs the model with the tool catalog; when the model
 * requests tools, executes them server-side via services, appends the
 * results and re-invokes — until the model answers with plain text or the
 * iteration cap (cost guard) is hit.
 *
 * Step A: read-only tools, no streaming. Returns the final narration plus
 * a debug trace (system prompt + exact messages sent + tool steps).
 * ─────────────────────────────────────────────────────────────────
 */

import { chatTools, type LlmMessage, type LlmUsage } from "@/lib/ai/llm";
import { GO_TOOLS, toolDefs, toolNeedsConfirm, type ToolContext } from "./_tools";

/** Max model↔tool round-trips per request (cost / runaway guard). */
const MAX_ITERS = 4;

export type AgentStep = { tool: string; args: unknown; result: unknown };

/** A write the model proposed but the user must confirm before it runs. */
export type PendingAction = { name: string; arguments: Record<string, unknown>; summary: string };

/**
 * One model call inside the turn. `kind` says why the call happened:
 *  - `tools`        — model requested tools; they were executed (`toolResults`).
 *  - `answer`       — model replied with plain text → final answer.
 *  - `gated`        — model proposed confirm-gated write(s); not executed.
 *  - `intro`        — forced text-only call to narrate a bare proposal.
 *  - `forced-final` — iteration cap hit; forced text-only call for a reply.
 */
export type AgentIteration = {
  index: number;
  kind: "tools" | "answer" | "gated" | "intro" | "forced-final";
  /** Token usage for this single call (cachedTokens = prefix served from cache). */
  usage: LlmUsage | null;
  /** Assistant text this call (often empty when it only requests tools). */
  text: string;
  /** Tools the model requested this call. */
  toolCalls: { name: string; arguments: Record<string, unknown> }[];
  /** Results of the tools executed this call (parallel to toolCalls; empty for non-`tools` kinds). */
  toolResults: { name: string; result: unknown }[];
};

/**
 * Structured debug trace for one turn. Splits the payload into its three
 * distinct parts (stable cached prefix, replayed history, this turn's input)
 * and records every model call separately.
 */
export type AgentDebug = {
  /** Stable cached prefix — same every turn. */
  systemPrompt: string;
  /** Tool catalog sent on every call (part of the cached prefix). */
  tools: { name: string; description: string }[];
  /** Persisted conversation replayed each turn (oldest→newest). */
  history: { role: string; content: string; tokens?: number }[];
  /** Ephemeral trip-context re-injected this turn, never persisted. */
  context: string | null;
  /** The new user message for this turn. */
  userMessage: string;
  /** Every model call made this turn, in order. */
  iterations: AgentIteration[];
  /** Per-message content-token weights (filled in debug mode only). */
  tokens?: {
    system: number;
    /** Whole tool catalog, serialized. */
    tools: number;
    context: number;
    userMessage: number;
  };
};

export type AgentResult = {
  text: string;
  steps: AgentStep[];
  /** Writes awaiting user confirmation (not executed). */
  pendingActions: PendingAction[];
  /** Messages appended this turn (user + assistant/tool), for persistence. */
  appended: LlmMessage[];
  /** Structured debug trace (system prompt, payload split, per-call breakdown). */
  debug: AgentDebug;
  provider: string;
  model: string;
  /** Number of model calls made. */
  iterations: number;
  /** Token usage summed across all model calls in the loop. */
  usage: LlmUsage;
};

/** Fold one call's usage into the running turn total (cachedTokens included). */
function addUsage(acc: LlmUsage, u?: LlmUsage): void {
  if (!u) return;
  acc.promptTokens += u.promptTokens;
  acc.completionTokens += u.completionTokens;
  acc.totalTokens += u.totalTokens;
  acc.cachedTokens = (acc.cachedTokens ?? 0) + (u.cachedTokens ?? 0);
}

export async function runAgent(opts: {
  system: string;
  /** Persisted conversation history (user/assistant/tool), oldest→newest. */
  history: LlmMessage[];
  /** The new user message for this turn. */
  userMessage: LlmMessage;
  /** Ephemeral trip-context prefix — injected for the model, never persisted. */
  contextMessage?: LlmMessage;
  ctx: ToolContext;
}): Promise<AgentResult> {
  // Order matters for prompt caching: the cacheable prefix is
  // [system, …history] (stable + append-only). The ephemeral per-turn context
  // goes AFTER history, just before the new user message, so it never
  // invalidates the cache. The new user message is always last.
  const convo: LlmMessage[] = [
    { role: "system", content: opts.system },
    ...opts.history,
    ...(opts.contextMessage ? [opts.contextMessage] : []),
    opts.userMessage,
  ];
  // Messages produced this turn (context excluded — it is not persisted).
  const appended: LlmMessage[] = [opts.userMessage];
  const steps: AgentStep[] = [];
  const iterTrace: AgentIteration[] = [];
  let pendingActions: PendingAction[] = [];
  let text = "";
  let provider = "";
  let model = "";
  let iterations = 0;
  const usage: LlmUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedTokens: 0 };

  for (let i = 0; i < MAX_ITERS; i++) {
    const res = await chatTools({
      tier: "smart",
      messages: convo,
      tools: toolDefs(),
      toolChoice: "auto",
    });
    provider = res.provider;
    model = res.model;
    text = res.text;
    iterations++;
    addUsage(usage, res.usage);

    if (res.toolCalls.length === 0) {
      // Final answer: record the assistant text turn.
      const finalMsg: LlmMessage = { role: "assistant", content: res.text };
      convo.push(finalMsg);
      appended.push(finalMsg);
      iterTrace.push({ index: iterations, kind: "answer", usage: res.usage ?? null, text: res.text, toolCalls: [], toolResults: [] });
      break;
    }

    // Confirm-gated writes: don't execute — surface them as pending actions.
    // Persist only the proposal text (no dangling tool_call in history).
    // Whether a call is gated can depend on current state (setTripMeta gates
    // only when overwriting), so resolve each predicate against ctx.
    const gated: typeof res.toolCalls = [];
    for (const c of res.toolCalls) {
      const tool = GO_TOOLS[c.name];
      if (tool && (await toolNeedsConfirm(tool, c.arguments, opts.ctx))) gated.push(c);
    }
    if (gated.length > 0) {
      pendingActions = gated.map((c) => ({
        name: c.name,
        arguments: c.arguments,
        summary: GO_TOOLS[c.name]?.summary?.(c.arguments) ?? c.name,
      }));
      iterTrace.push({
        index: iterations,
        kind: "gated",
        usage: res.usage ?? null,
        text: res.text,
        toolCalls: res.toolCalls.map((c) => ({ name: c.name, arguments: c.arguments })),
        toolResults: [],
      });
      // The model often proposes the write without any narration. Make sure the
      // confirm card is always introduced by a sentence: when there's no text,
      // ask for a short intro (no tools this turn so it can't re-propose).
      if (!res.text.trim()) {
        const introRes = await chatTools({ tier: "smart", messages: convo, tools: toolDefs(), toolChoice: "none" });
        iterations++;
        addUsage(usage, introRes.usage);
        text = introRes.text;
        iterTrace.push({ index: iterations, kind: "intro", usage: introRes.usage ?? null, text: introRes.text, toolCalls: [], toolResults: [] });
      }
      const proposalMsg: LlmMessage = { role: "assistant", content: text };
      convo.push(proposalMsg);
      appended.push(proposalMsg);
      break;
    }

    // Record the assistant turn that requested the tools…
    const assistantMsg: LlmMessage = { role: "assistant", content: res.text, toolCalls: res.toolCalls };
    convo.push(assistantMsg);
    appended.push(assistantMsg);

    // …execute each call via its service wrapper, append the result.
    const toolResults: { name: string; result: unknown }[] = [];
    for (const call of res.toolCalls) {
      const tool = GO_TOOLS[call.name];
      let result: unknown;
      if (!tool) {
        result = { error: `Unknown tool: ${call.name}` };
      } else {
        try {
          result = await tool.run(call.arguments, opts.ctx);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
      }
      steps.push({ tool: call.name, args: call.arguments, result });
      toolResults.push({ name: call.name, result });
      const toolMsg: LlmMessage = { role: "tool", name: call.name, toolCallId: call.id, content: JSON.stringify(result) };
      convo.push(toolMsg);
      appended.push(toolMsg);
    }
    iterTrace.push({
      index: iterations,
      kind: "tools",
      usage: res.usage ?? null,
      text: res.text,
      toolCalls: res.toolCalls.map((c) => ({ name: c.name, arguments: c.arguments })),
      toolResults,
    });
  }

  // Safety net: the loop ended still wanting tools (iteration cap) → no text.
  // Force one final text-only turn so the user always gets a reply. Skipped
  // when there are pending actions (the confirm card carries the proposal).
  if (!text.trim() && pendingActions.length === 0) {
    const finalRes = await chatTools({ tier: "fast", messages: convo, tools: toolDefs(), toolChoice: "none" });
    iterations++;
    addUsage(usage, finalRes.usage);
    text = finalRes.text;
    const finalMsg: LlmMessage = { role: "assistant", content: text };
    convo.push(finalMsg);
    appended.push(finalMsg);
    iterTrace.push({ index: iterations, kind: "forced-final", usage: finalRes.usage ?? null, text: finalRes.text, toolCalls: [], toolResults: [] });
  }

  // Summarize a persisted history message for the debug payload split.
  const summarize = (m: LlmMessage): string =>
    m.content || (m.toolCalls?.length ? `→ ${m.toolCalls.map((t) => t.name).join(", ")}` : "");

  return {
    text,
    steps,
    pendingActions,
    appended,
    debug: {
      systemPrompt: opts.system,
      tools: toolDefs().map((t) => ({ name: t.name, description: t.description })),
      history: opts.history.map((m) => ({ role: m.role, content: summarize(m) })),
      context: opts.contextMessage?.content ?? null,
      userMessage: opts.userMessage.content,
      iterations: iterTrace,
    },
    provider,
    model,
    iterations,
    usage,
  };
}
