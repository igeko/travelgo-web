/**
 * POST /api/go/agent/compare — single-turn model comparison (dev).
 *
 * Runs ONE model call (no loop, no tool execution, nothing persisted) on a
 * chosen provider+tier, with the agent's real system prompt + tool catalog.
 * Returns the narration and the tool calls the model WOULD make, so two
 * models can be compared side by side. Logged-in only; no trip touched.
 */

import { route, readJson, ok, badRequest } from "@/lib/api";
import { requireUser } from "@/lib/api/guards";
import { chatToolsWith, type LlmMessage, type LlmProvider, type LlmTier } from "@/lib/ai/llm";
import { buildSystemPrompt } from "../_prompt";
import { toolDefs } from "../_tools";

const MAX_MESSAGE_LENGTH = 4_000;

export const POST = route(async ({ req }) => {
  const body = await readJson<{ message?: string; provider?: string; tier?: string }>(req);
  await requireUser();

  const message = (typeof body.message === "string" ? body.message : "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) throw badRequest("message required");

  const provider: LlmProvider = body.provider === "gemini" ? "gemini" : "openai";
  const tier: LlmTier = body.tier === "smart" ? "smart" : "fast";

  const today = new Date().toISOString().slice(0, 10);
  const messages: LlmMessage[] = [
    { role: "system", content: buildSystemPrompt(today) },
    { role: "user", content: message },
  ];

  const res = await chatToolsWith(provider, { tier, messages, tools: toolDefs(), toolChoice: "auto" });

  return ok({
    provider: res.provider,
    model: res.model,
    text: res.text,
    toolCalls: res.toolCalls.map((c) => ({ name: c.name, arguments: c.arguments })),
    usage: res.usage ?? null,
  });
});
