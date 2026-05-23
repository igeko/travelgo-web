/**
 * lib/ai/llm/models.ts
 * ─────────────────────────────────────────────────────────────────
 * Model registry — the only place model names live, keyed by provider
 * and capability tier. Swapping a model (or a whole provider) happens
 * here only; call sites reference tiers (`fast`/`smart`), never IDs.
 * ─────────────────────────────────────────────────────────────────
 */

import type { LlmProvider, LlmTier } from "./types";

export const LLM_MODELS: Record<LlmProvider, Record<LlmTier, string>> = {
  openai: {
    fast: "gpt-4o-mini",
    smart: "gpt-4o",
  },
  gemini: {
    // GA, grounding-capable. `smart` can move to "gemini-3-pro-preview"
    // (brief's flagship target) once it leaves preview.
    fast: "gemini-2.5-flash",
    smart: "gemini-3.5-flash",
  },
};
