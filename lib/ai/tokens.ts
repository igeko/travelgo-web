/**
 * lib/ai/tokens.ts
 * ─────────────────────────────────────────────────────────────────
 * Server-only token counting for debug surfaces. Uses js-tiktoken with
 * the `o200k_base` encoding — the BPE used by the gpt-4o family (incl.
 * gpt-4o-mini, our `smart` tier). Pure JS, no WASM, no network.
 *
 * Counts CONTENT tokens per message. The provider's billed `prompt_tokens`
 * is slightly higher (chat-format adds a few framing tokens per message and
 * for the tool schema), so use this to compare message *weights*, not to
 * reconcile exactly with the usage figure. OpenAI-specific: for Gemini the
 * boundaries differ, but the default provider is OpenAI and this is a debug
 * aid, so the approximation is acceptable there.
 * ─────────────────────────────────────────────────────────────────
 */

import { getEncoding, type Tiktoken } from "js-tiktoken";

let enc: Tiktoken | null = null;
/** Set once if the encoder ever fails to build, so we don't retry every call. */
let encoderFailed = false;

/** Lazily build (and cache) the o200k_base encoder; null if it can't be built. */
function encoder(): Tiktoken | null {
  if (enc || encoderFailed) return enc;
  try {
    enc = getEncoding("o200k_base");
  } catch {
    encoderFailed = true;
  }
  return enc;
}

/**
 * Exact content-token count for a string. Empty/undefined → 0. Never throws:
 * this only feeds the debug panel, so a tokenizer failure must not break the
 * Go response — it degrades to 0 (the panel then shows no per-message weight).
 */
export function countTokens(text: string | null | undefined): number {
  if (!text) return 0;
  try {
    return encoder()?.encode(text).length ?? 0;
  } catch {
    return 0;
  }
}
