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

/** Geographic bias for Maps grounding (Gemini only). */
export type LlmLatLng = { lat: number; lng: number };

/** A place surfaced by Maps grounding. `placeId` is the bare Google id. */
export type GroundedPlace = { title: string; placeId: string; uri: string };

/** Request for a JSON completion that may also ground places via Maps. */
export type ChatGroundedOptions = {
  tier: LlmTier;
  messages: LlmMessage[];
  /** Optional locality bias (Gemini Maps grounding only). */
  near?: LlmLatLng;
};

/**
 * Result of a grounded completion. `places` is empty for providers that
 * have no Maps grounding (e.g. OpenAI). `provider`/`model` are carried for
 * debug surfaces.
 */
export type GroundedResult = {
  text: string;
  places: GroundedPlace[];
  provider: LlmProvider;
  model: string;
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
  /**
   * JSON completion that also returns places grounded in Google Maps when
   * the provider supports it. Callers must put the JSON-shape instruction
   * in the prompt (grounding is incompatible with forced JSON mode on
   * Gemini), then `JSON.parse` the returned `text`.
   */
  chatGrounded(opts: ChatGroundedOptions): Promise<GroundedResult>;
}
