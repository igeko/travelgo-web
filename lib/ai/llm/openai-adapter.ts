/**
 * lib/ai/llm/openai-adapter.ts
 * ─────────────────────────────────────────────────────────────────
 * Maps the neutral LLM contract onto the OpenAI Chat Completions API.
 * Reuses the shared client from `lib/ai/provider`. Server-only.
 * ─────────────────────────────────────────────────────────────────
 */

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getAI } from "../provider";
import { LLM_MODELS } from "./models";
import type {
  ChatGroundedOptions,
  ChatJsonOptions,
  ChatStreamOptions,
  GroundedResult,
  LlmAdapter,
  LlmMessage,
} from "./types";

function toOpenAI(messages: LlmMessage[]): ChatCompletionMessageParam[] {
  return messages.map((m) => ({ role: m.role, content: m.content })) as ChatCompletionMessageParam[];
}

export const openaiAdapter: LlmAdapter = {
  async chatJson({ tier, messages, maxTokens }: ChatJsonOptions): Promise<string> {
    const completion = await getAI().chat.completions.create({
      model: LLM_MODELS.openai[tier],
      response_format: { type: "json_object" },
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      messages: toOpenAI(messages),
    });
    return completion.choices[0]?.message?.content ?? "";
  },

  async *chatStream({ tier, messages }: ChatStreamOptions): AsyncIterable<string> {
    const stream = await getAI().chat.completions.create({
      model: LLM_MODELS.openai[tier],
      stream: true,
      messages: toOpenAI(messages),
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },

  // OpenAI has no Maps grounding: behaves as JSON mode, no grounded places.
  async chatGrounded({ tier, messages }: ChatGroundedOptions): Promise<GroundedResult> {
    const model = LLM_MODELS.openai[tier];
    const completion = await getAI().chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: toOpenAI(messages),
    });
    return {
      text: completion.choices[0]?.message?.content ?? "",
      places: [],
      provider: "openai",
      model,
    };
  },
};
