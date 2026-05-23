/**
 * lib/ai/llm/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Provider-neutral contracts for the LLM layer. Application code
 * depends only on these shapes — never on the OpenAI or Gemini SDK
 * types directly — so the engine behind the call can be swapped via
 * `LLM_PROVIDER` without touching call sites.
 * ─────────────────────────────────────────────────────────────────
 */

/** Which engine is active. Selected by `LLM_PROVIDER` (default: openai). */
export type LlmProvider = "openai" | "gemini";

/**
 * Capability tier — call sites express intent, not a model literal.
 * The concrete model per provider lives in `models.ts`.
 */
export type LlmTier = "fast" | "smart";

/** Neutral chat role. Adapters map `assistant` → Gemini's `model`. */
export type LlmRole = "system" | "user" | "assistant";

/** A single neutral chat message. */
export type LlmMessage = { role: LlmRole; content: string };

/** Request for a one-shot completion that returns raw text (JSON mode). */
export type ChatJsonOptions = {
  tier: LlmTier;
  messages: LlmMessage[];
  /** Output token cap (maps to max_tokens / maxOutputTokens). */
  maxTokens?: number;
};

/** Request for a streaming text completion. */
export type ChatStreamOptions = {
  tier: LlmTier;
  messages: LlmMessage[];
};

/** The surface every provider adapter implements. */
export interface LlmAdapter {
  /**
   * One-shot completion in JSON mode. Returns the raw assistant text
   * (the caller `JSON.parse`s it). Empty string when the model returns
   * no content.
   */
  chatJson(opts: ChatJsonOptions): Promise<string>;
  /** Streaming completion. Yields text deltas as they arrive. */
  chatStream(opts: ChatStreamOptions): AsyncIterable<string>;
}
