/**
 * POST /api/go/agent — Go agent loop (Step A).
 *
 * Runs the model with the tool catalog (read-only `getTripState` for now),
 * executes any tool calls server-side via services, and returns the final
 * narration. Authorized by trip membership; tripId comes from the request,
 * never from the model. In debug mode returns the system prompt, the exact
 * messages sent and the tool steps for the LLM debug panel.
 */

import { route, readJson, ok, queryParam, badRequest } from "@/lib/api";
import { requireTripMember, requireTripEditor } from "@/lib/api/guards";
import { UNTRUSTED_DATA_INSTRUCTION, wrapUntrusted } from "@/lib/api/go-untrusted";
import { serverServices } from "@/lib/services";
import type { LlmMessage } from "@/lib/ai/llm";
import { runAgent } from "./_loop";
import { GO_TOOLS } from "./_tools";

const MAX_MESSAGE_LENGTH = 4_000;
const HISTORY_LIMIT = 40;

function buildSystemPrompt(today: string): string {
  return `You are Go, TravelGo's travel assistant, helping the user build their trip.
Your tone is warm, direct, and slightly witty. Never bureaucratic.
Reply in the same language the user writes in. Keep answers concise.

Today's date is ${today}. Always use it as the reference for relative dates:
when the user gives a date without a year, choose the next FUTURE occurrence —
never a past year.

Tools — call them, don't guess. Use getTripState when you need the current trip.
When you save trip data with setTripMeta:
- title is the trip NAME (also evocative, e.g. "Norvegia in famiglia");
  destination is the PLACE, concise (e.g. "Norvegia"). They are distinct — set both.
- Dates: pass startDate AND endDate TOGETHER in a single call (ISO YYYY-MM-DD,
  in the future). The days are generated from this range, so never set only one.
- Travelers: set adults / children as NUMBERS (e.g. "io e la mia ragazza" → adults: 2).
  Do NOT put travelers into the theme.
- Theme: themeTags / themeDescription are for style and interests only
  (food, nature, slow travel…), never for dates or travelers.

Once the dates are set (the days exist), propose the trip legs and call
setItinerary to assign a city/zone to the days: pass legs as day ranges
(startDay..endDay, 1-based, inclusive) covering the whole trip in order.
Balance the legs sensibly for the destination, travelers and pace. Then
describe the skeleton to the user and invite tweaks.

When the user wants to fill specific days, call addActivities with a few
focused activities per day (give the slot; 1-3 per day, don't overfill).
Tailor them to the day's zone, the travelers and the theme.

After using tools, answer the user naturally — don't mention the tools.

${UNTRUSTED_DATA_INSTRUCTION}`;
}

/** GET /api/go/agent?tripId=… — the caller's conversation for a trip (for reload recovery). */
export const GET = route(async ({ req }) => {
  const tripId = queryParam(req, "tripId")?.trim() ?? "";
  const { userId } = await requireTripMember(tripId);
  const services = await serverServices();
  const session = await services.go.loadOrCreateSession(tripId, userId);
  return ok({ sessionId: session.id, turns: await services.go.displayTurns(session.id) });
});

export const POST = route(async ({ req }) => {
  const body = await readJson<{
    message?: string;
    tripId?: string;
    tripContext?: string;
    debug?: boolean;
    confirm?: { name?: string; arguments?: Record<string, unknown> };
  }>(req);

  const tripId = typeof body.tripId === "string" ? body.tripId : "";

  // ── Confirm branch: execute a previously-proposed write (owner/editor). ──
  if (body.confirm) {
    await requireTripEditor(tripId);
    const name = typeof body.confirm.name === "string" ? body.confirm.name : "";
    const tool = GO_TOOLS[name];
    if (!tool || !tool.requiresConfirm) throw badRequest("Unknown or non-confirmable action");
    const result = await tool.run(body.confirm.arguments ?? {}, { tripId });
    return ok({ applied: true, result });
  }

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

  const today = new Date().toISOString().slice(0, 10);
  const result = await runAgent({
    system: buildSystemPrompt(today),
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
    pendingActions: result.pendingActions,
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
