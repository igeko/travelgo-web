/**
 * lib/ai/llm/gemini-adapter.ts
 * ─────────────────────────────────────────────────────────────────
 * Maps the neutral LLM contract onto the Gemini Developer API
 * (`@google/genai`, AI Studio key). Constructs the client once per
 * runtime. Server-only — never import from client components.
 *
 * Shape translation vs OpenAI:
 *  - `system` messages → `config.systemInstruction`
 *  - `assistant` role  → Gemini `model` role
 *  - JSON mode         → `config.responseMimeType = application/json`
 *  - `fast` tier disables thinking (low latency; also prevents a small
 *    `maxOutputTokens` budget from being consumed by hidden reasoning
 *    tokens and returning empty text).
 * ─────────────────────────────────────────────────────────────────
 */

import { GoogleGenAI } from "@google/genai";
import type { Content, GenerateContentConfig } from "@google/genai";
import { LLM_MODELS } from "./models";
import type { ChatJsonOptions, ChatStreamOptions, LlmAdapter, LlmMessage, LlmTier } from "./types";

let client: GoogleGenAI | null = null;

/** Whether the Gemini key is configured. */
export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/** Split neutral messages into Gemini's systemInstruction + contents. */
function split(messages: LlmMessage[]): { system?: string; contents: Content[] } {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents: Content[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  return { system: system || undefined, contents };
}

/** `fast` runs without thinking; `smart` keeps the model default. */
function baseConfig(tier: LlmTier, system?: string): GenerateContentConfig {
  return {
    ...(system ? { systemInstruction: system } : {}),
    ...(tier === "fast" ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  };
}

export const geminiAdapter: LlmAdapter = {
  async chatJson({ tier, messages, maxTokens }: ChatJsonOptions): Promise<string> {
    const { system, contents } = split(messages);
    const res = await getGemini().models.generateContent({
      model: LLM_MODELS.gemini[tier],
      contents,
      config: {
        ...baseConfig(tier, system),
        responseMimeType: "application/json",
        ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
      },
    });
    return res.text ?? "";
  },

  async *chatStream({ tier, messages }: ChatStreamOptions): AsyncIterable<string> {
    const { system, contents } = split(messages);
    const stream = await getGemini().models.generateContentStream({
      model: LLM_MODELS.gemini[tier],
      contents,
      config: baseConfig(tier, system),
    });
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  },
};
