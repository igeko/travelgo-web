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

export type {
  ChatGroundedOptions,
  ChatJsonOptions,
  ChatStreamOptions,
  GroundedPlace,
  GroundedResult,
  LlmLatLng,
  LlmMessage,
  LlmProvider,
  LlmRole,
  LlmTier,
} from "./types";
