/**
 * lib/ai/llm/index.ts
 * ─────────────────────────────────────────────────────────────────
 * Provider-neutral entry point for chat completions. Call sites import
 * `chatJson` / `chatStream` from here and never touch a provider SDK.
 * The active engine is chosen by `LLM_PROVIDER` (default: openai).
 *
 *   import { chatJson, chatStream } from "@/lib/ai/llm";
 * ─────────────────────────────────────────────────────────────────
 */

import { openaiAdapter } from "./openai-adapter";
import { geminiAdapter } from "./gemini-adapter";
import type {
  ChatGroundedOptions,
  ChatJsonOptions,
  ChatStreamOptions,
  ChatToolsOptions,
  ChatToolsResult,
  GroundedResult,
  LlmAdapter,
  LlmProvider,
} from "./types";

/** The engine selected by env. Unknown/unset values fall back to OpenAI. */
export function activeProvider(): LlmProvider {
  return process.env.LLM_PROVIDER === "gemini" ? "gemini" : "openai";
}

function adapter(): LlmAdapter {
  return activeProvider() === "gemini" ? geminiAdapter : openaiAdapter;
}

/** One-shot completion in JSON mode. Returns raw assistant text. */
export function chatJson(opts: ChatJsonOptions): Promise<string> {
  return adapter().chatJson(opts);
}

/** Streaming completion. Yields text deltas. */
export function chatStream(opts: ChatStreamOptions): AsyncIterable<string> {
  return adapter().chatStream(opts);
}

/** JSON completion with optional Maps-grounded places (Gemini only). */
export function chatGrounded(opts: ChatGroundedOptions): Promise<GroundedResult> {
  return adapter().chatGrounded(opts);
}

/** Completion with function calling. Returns text and/or requested tool calls. */
export function chatTools(opts: ChatToolsOptions): Promise<ChatToolsResult> {
  return adapter().chatTools(opts);
}

/**
 * Like `chatTools`, but on an explicitly chosen provider rather than the
 * env-selected one. For side-by-side model comparison (dev surfaces) — keeps
 * the adapter selection inside the LLM layer instead of leaking SDK choices
 * to call sites.
 */
export function chatToolsWith(provider: LlmProvider, opts: ChatToolsOptions): Promise<ChatToolsResult> {
  return (provider === "gemini" ? geminiAdapter : openaiAdapter).chatTools(opts);
}

export type {
  ChatGroundedOptions,
  ChatJsonOptions,
  ChatStreamOptions,
  ChatToolsOptions,
  ChatToolsResult,
  GroundedPlace,
  GroundedResult,
  LlmLatLng,
  LlmMessage,
  LlmProvider,
  LlmRole,
  LlmTier,
  LlmTool,
  LlmToolCall,
  LlmUsage,
} from "./types";
