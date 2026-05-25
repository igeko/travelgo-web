/**
 * lib/ai/llm/openai-adapter.ts
 * ─────────────────────────────────────────────────────────────────
 * Maps the neutral LLM contract onto the OpenAI Chat Completions API.
 * Reuses the shared client from `lib/ai/provider`. Server-only.
 * ─────────────────────────────────────────────────────────────────
 */

import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { getAI } from "../provider";
import { LLM_MODELS } from "./models";
import type {
  ChatGroundedOptions,
  ChatJsonOptions,
  ChatStreamOptions,
  ChatToolsOptions,
  ChatToolsResult,
  GroundedResult,
  LlmAdapter,
  LlmMessage,
  LlmTool,
} from "./types";

function toOpenAI(messages: LlmMessage[]): ChatCompletionMessageParam[] {
  return messages.map((m) => {
    // Tool-result turn.
    if (m.role === "tool") {
      return { role: "tool", tool_call_id: m.toolCallId ?? "", content: m.content };
    }
    // Assistant turn that requested tools.
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      };
    }
    return { role: m.role, content: m.content };
  }) as ChatCompletionMessageParam[];
}

function toOpenAITools(tools: LlmTool[]): ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
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

  async chatTools({ tier, messages, tools, toolChoice, maxTokens }: ChatToolsOptions): Promise<ChatToolsResult> {
    const model = LLM_MODELS.openai[tier];
    const completion = await getAI().chat.completions.create({
      model,
      messages: toOpenAI(messages),
      tools: toOpenAITools(tools),
      ...(toolChoice === "required" ? { tool_choice: "required" } : {}),
      ...(toolChoice === "none" ? { tool_choice: "none" } : {}),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    });
    const msg = completion.choices[0]?.message;
    const toolCalls = (msg?.tool_calls ?? [])
      .filter((c): c is typeof c & { type: "function" } => c.type === "function")
      .map((c) => {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(c.function.arguments || "{}"); } catch { /* leave empty */ }
        return { id: c.id, name: c.function.name, arguments: args };
      });
    const u = completion.usage;
    return {
      text: msg?.content ?? "",
      toolCalls,
      provider: "openai",
      model,
      ...(u ? { usage: { promptTokens: u.prompt_tokens, completionTokens: u.completion_tokens, totalTokens: u.total_tokens } } : {}),
    };
  },
};
