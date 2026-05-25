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
export type LlmRole = "system" | "user" | "assistant" | "tool";

/**
 * A single neutral chat message. The base case is `{ role, content }`;
 * tool-calling adds two optional shapes:
 *  - assistant turn that requested tools → `toolCalls` set (content may be "");
 *  - tool-result turn (`role: "tool"`)   → `toolCallId` + `name` set.
 */
export type LlmMessage = {
  role: LlmRole;
  content: string;
  /** Set on an assistant turn that requested one or more tool calls. */
  toolCalls?: LlmToolCall[];
  /** Set on a `tool` turn: which call this result answers (OpenAI round-trip). */
  toolCallId?: string;
  /** Set on a `tool` turn: the tool name (Gemini round-trip). */
  name?: string;
};

/**
 * A tool the model may call. `parameters` is a JSON Schema object describing
 * the arguments. Provider-neutral — adapters map it to OpenAI `function` /
 * Gemini `functionDeclaration`.
 */
export type LlmTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/** A tool call emitted by the model. `id` is synthesised for Gemini. */
export type LlmToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  /**
   * Opaque provider round-trip token. Gemini thinking models attach a
   * `thoughtSignature` to each functionCall that MUST be replayed when the
   * call is sent back, or the next request is rejected. Unused by OpenAI.
   */
  signature?: string;
};

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

/** Request for a completion where the model may call tools (function calling). */
export type ChatToolsOptions = {
  tier: LlmTier;
  messages: LlmMessage[];
  tools: LlmTool[];
  /** auto = model decides (default); required = must call a tool; none = text only. */
  toolChoice?: "auto" | "required" | "none";
  maxTokens?: number;
};

/** Token usage for one model call. Maps OpenAI `usage` / Gemini `usageMetadata`. */
export type LlmUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

/**
 * Result of a tool-enabled completion. `toolCalls` is empty when the model
 * answered with plain text. When non-empty, the caller executes them and
 * feeds the results back as `tool` messages for the next turn.
 */
export type ChatToolsResult = {
  text: string;
  toolCalls: LlmToolCall[];
  provider: LlmProvider;
  model: string;
  usage?: LlmUsage;
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
  /**
   * Completion with function calling. Returns the model's text and/or the
   * tool calls it requested. The agent loop executes the calls and re-invokes
   * with the results appended as `tool` messages.
   */
  chatTools(opts: ChatToolsOptions): Promise<ChatToolsResult>;
}
