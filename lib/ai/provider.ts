/**
 * lib/ai/provider.ts
 * ─────────────────────────────────────────────────────────────────
 * Single entry point for the server-side LLM provider (currently
 * OpenAI). Centralizes client construction, the API-key check and the
 * model registry so the rest of the app never touches `new OpenAI` or
 * hardcoded model strings.
 *
 * Swapping provider (Azure OpenAI, a gateway, …) or bumping a model
 * happens here only — call sites stay untouched. This is a thin adapter:
 * it still exposes the OpenAI SDK client and its types; it does not
 * invent a provider-neutral request shape.
 *
 * Server-only. Do not import from client components.
 * ─────────────────────────────────────────────────────────────────
 */

import OpenAI from "openai";

/**
 * Model registry — the only place model names live. Keyed by capability
 * tier so call sites express intent ("fast" vs "smart") instead of a
 * literal that has to be grepped-and-replaced on every change.
 */
export const AI_MODELS = {
  /** Cheap/low-latency: classification, chat, short notes. */
  fast: "gpt-4o-mini",
  /** Higher quality: suggestions, deep dive, rich enrichment. */
  smart: "gpt-4o",
  /** Embeddings for catalog semantic search. */
  embedding: "text-embedding-3-small",
} as const;

let client: OpenAI | null = null;

/**
 * Whether the provider is configured. Check this where a graceful
 * fallback exists (scripted reply, Google editorial summary, …) before
 * calling `getAI()`.
 */
export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * The shared LLM client, constructed once per runtime. Throws when the
 * key is missing — guard with `aiConfigured()` wherever a fallback path
 * is expected.
 */
export function getAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  if (!client) client = new OpenAI({ apiKey });
  return client;
}
