/**
 * POST /api/go/agent — Go agent loop (Step A).
 *
 * Runs the model with the tool catalog (read-only `getTripState` for now),
 * executes any tool calls server-side via services, and returns the final
 * narration. Authorized by trip membership; tripId comes from the request,
 * never from the model. In debug mode returns the system prompt, the exact
 * messages sent and the tool steps for the LLM debug panel.
 */

import { route, readJson, ok } from "@/lib/api";
import { requireTripMember } from "@/lib/api/guards";
import { UNTRUSTED_DATA_INSTRUCTION, wrapUntrusted } from "@/lib/api/go-untrusted";
import { serverServices } from "@/lib/services";
import type { LlmMessage } from "@/lib/ai/llm";
import { runAgent } from "./_loop";

const MAX_MESSAGE_LENGTH = 4_000;
const HISTORY_LIMIT = 40;

const SYSTEM_PROMPT = `You are Go, TravelGo's travel assistant, helping the user build their trip.
Your tone is warm, direct, and slightly witty. Never bureaucratic.
Reply in the same language the user writes in. Keep answers concise.

You can call tools to inspect or act on the trip. Prefer calling a tool over
guessing: if you need the current state of the trip, call getTripState first.
After using tools, answer the user naturally — don't mention the tools.

${UNTRUSTED_DATA_INSTRUCTION}`;

export const POST = route(async ({ req }) => {
  const body = await readJson<{
    message?: string;
    tripId?: string;
    tripContext?: string;
    debug?: boolean;
  }>(req);

  const tripId = typeof body.tripId === "string" ? body.tripId : "";
  const text = (typeof body.message === "string" ? body.message : "").trim().slice(0, MAX_MESSAGE_LENGTH);

  // Throws ApiError (→ failure envelope) if the user isn't a trip member.
  const { userId } = await requireTripMember(tripId);

  const services = await serverServices();
  const session = await services.go.loadOrCreateSession(tripId, userId);
  const history = await services.go.historyAsLlm(session.id, HISTORY_LIMIT);

  const userMessage: LlmMessage = { role: "user", content: text };
  // Trip context is user-supplied → wrapped as untrusted data in a user turn,
  // ephemeral (re-injected each turn, never persisted).
  const contextMessage: LlmMessage | undefined = body.tripContext
    ? { role: "user", content: wrapUntrusted("trip-context", body.tripContext) }
    : undefined;

  const result = await runAgent({
    system: SYSTEM_PROMPT,
    history,
    userMessage,
    contextMessage,
    ctx: { tripId },
  });

  // Persist this turn (user + assistant/tool). Context prefix is not stored.
  await services.go.persistTurn(session, result.appended);

  const debug = body.debug === true;
  return ok({
    text: result.text,
    steps: result.steps,
    sessionId: session.id,
    provider: result.provider,
    model: result.model,
    iterations: result.iterations,
    usage: result.usage,
    ...(debug
      ? { _debug: { systemPrompt: result.systemPrompt, sentMessages: result.sentMessages, steps: result.steps } }
      : {}),
  });
});
