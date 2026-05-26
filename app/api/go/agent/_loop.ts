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
import { GO_TOOLS, toolDefs, type ToolContext } from "./_tools";

/** Max model↔tool round-trips per request (cost / runaway guard). */
const MAX_ITERS = 4;

export type AgentStep = { tool: string; args: unknown; result: unknown };

/** A write the model proposed but the user must confirm before it runs. */
export type PendingAction = { name: string; arguments: Record<string, unknown>; summary: string };

export type AgentResult = {
  text: string;
  steps: AgentStep[];
  /** Writes awaiting user confirmation (not executed). */
  pendingActions: PendingAction[];
  /** Messages appended this turn (user + assistant/tool), for persistence. */
  appended: LlmMessage[];
  /** Debug: exact system prompt and the message array as last sent. */
  systemPrompt: string;
  sentMessages: { role: string; content: string }[];
  provider: string;
  model: string;
  /** Number of model calls made. */
  iterations: number;
  /** Token usage summed across all model calls in the loop. */
  usage: LlmUsage;
};

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
  const convo: LlmMessage[] = [
    { role: "system", content: opts.system },
    ...(opts.contextMessage ? [opts.contextMessage] : []),
    ...opts.history,
    opts.userMessage,
  ];
  // Messages produced this turn (context excluded — it is not persisted).
  const appended: LlmMessage[] = [opts.userMessage];
  const steps: AgentStep[] = [];
  let pendingActions: PendingAction[] = [];
  let text = "";
  let provider = "";
  let model = "";
  let iterations = 0;
  const usage: LlmUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

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
    if (res.usage) {
      usage.promptTokens += res.usage.promptTokens;
      usage.completionTokens += res.usage.completionTokens;
      usage.totalTokens += res.usage.totalTokens;
    }

    if (res.toolCalls.length === 0) {
      // Final answer: record the assistant text turn.
      const finalMsg: LlmMessage = { role: "assistant", content: res.text };
      convo.push(finalMsg);
      appended.push(finalMsg);
      break;
    }

    // Confirm-gated writes: don't execute — surface them as pending actions.
    // Persist only the proposal text (no dangling tool_call in history).
    const gated = res.toolCalls.filter((c) => GO_TOOLS[c.name]?.requiresConfirm);
    if (gated.length > 0) {
      pendingActions = gated.map((c) => ({
        name: c.name,
        arguments: c.arguments,
        summary: GO_TOOLS[c.name]?.summary?.(c.arguments) ?? c.name,
      }));
      const proposalMsg: LlmMessage = { role: "assistant", content: res.text };
      convo.push(proposalMsg);
      appended.push(proposalMsg);
      break;
    }

    // Record the assistant turn that requested the tools…
    const assistantMsg: LlmMessage = { role: "assistant", content: res.text, toolCalls: res.toolCalls };
    convo.push(assistantMsg);
    appended.push(assistantMsg);

    // …execute each call via its service wrapper, append the result.
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
      const toolMsg: LlmMessage = { role: "tool", name: call.name, toolCallId: call.id, content: JSON.stringify(result) };
      convo.push(toolMsg);
      appended.push(toolMsg);
    }
  }

  // Safety net: the loop ended still wanting tools (iteration cap) → no text.
  // Force one final text-only turn so the user always gets a reply. Skipped
  // when there are pending actions (the confirm card carries the proposal).
  if (!text.trim() && pendingActions.length === 0) {
    const finalRes = await chatTools({ tier: "smart", messages: convo, tools: toolDefs(), toolChoice: "none" });
    iterations++;
    if (finalRes.usage) {
      usage.promptTokens += finalRes.usage.promptTokens;
      usage.completionTokens += finalRes.usage.completionTokens;
      usage.totalTokens += finalRes.usage.totalTokens;
    }
    text = finalRes.text;
    const finalMsg: LlmMessage = { role: "assistant", content: text };
    convo.push(finalMsg);
    appended.push(finalMsg);
  }

  return {
    text,
    steps,
    pendingActions,
    appended,
    systemPrompt: opts.system,
    sentMessages: convo
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        content: m.content || (m.toolCalls?.length ? `→ ${m.toolCalls.map((t) => t.name).join(", ")}` : ""),
      })),
    provider,
    model,
    iterations,
    usage,
  };
}
