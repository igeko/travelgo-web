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
import { wrapUntrusted } from "@/lib/api/go-untrusted";
import { serverServices } from "@/lib/services";
import type { LlmMessage } from "@/lib/ai/llm";
import { countTokens } from "@/lib/ai/tokens";
import { runAgent } from "./_loop";
import { buildSystemPrompt } from "./_prompt";
import { GO_TOOLS, toolDefs } from "./_tools";

const MAX_MESSAGE_LENGTH = 4_000;
const HISTORY_LIMIT = 40;

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
    selectedDay?: number | null;
    debug?: boolean;
    confirm?: { name?: string; arguments?: Record<string, unknown> };
  }>(req);

  const tripId = typeof body.tripId === "string" ? body.tripId : "";

  // ── Confirm branch: execute a previously-proposed write (owner/editor). ──
  // We record the applied write as a real function round-trip in the session —
  // an assistant `tool_call` + its `tool` result — so the NEXT turn's history
  // shows the model that its proposal was executed (and with what result).
  // Without it the model can't tell the change happened and re-proposes the
  // same write. A tool-result is the model's native "done" signal, not
  // narration, so it is NOT echoed back (unlike the old assistant note that
  // leaked verbatim — see LEGACY_APPLIED_NOTE in GoService).
  if (body.confirm) {
    const { userId } = await requireTripEditor(tripId);
    const name = typeof body.confirm.name === "string" ? body.confirm.name : "";
    const tool = GO_TOOLS[name];
    if (!tool || !tool.requiresConfirm) throw badRequest("Unknown or non-confirmable action");
    const args = body.confirm.arguments ?? {};
    const result = await tool.run(args, { tripId });

    const services = await serverServices();
    const session = await services.go.loadOrCreateSession(tripId, userId);
    const callId = `confirm_${crypto.randomUUID()}`;
    await services.go.persistTurn(session, [
      { role: "assistant", content: "", toolCalls: [{ id: callId, name, arguments: args }] },
      { role: "tool", name, toolCallId: callId, content: JSON.stringify(result) },
    ]);

    return ok({ applied: true, result });
  }

  const text = (typeof body.message === "string" ? body.message : "").trim().slice(0, MAX_MESSAGE_LENGTH);

  // Throws ApiError (→ failure envelope) if the user isn't a trip member.
  const { userId } = await requireTripMember(tripId);

  const services = await serverServices();
  const session = await services.go.loadOrCreateSession(tripId, userId);
  const history = await services.go.historyAsLlm(session.id, HISTORY_LIMIT);

  const userMessage: LlmMessage = { role: "user", content: text };

  // Ephemeral per-turn context. The loop appends it AFTER history (just before
  // the new user message), so it never invalidates the system+tools+history
  // cache. Re-injected each turn, never persisted.
  const contextParts: string[] = [];
  if (typeof body.selectedDay === "number" && Number.isFinite(body.selectedDay)) {
    contextParts.push(
      `[UI] L'utente sta guardando il Giorno ${body.selectedDay}. ` +
        "Se chiede di aggiungere o modificare qualcosa senza indicare un giorno, intende questo.",
    );
  }
  // Trip context is user-supplied → wrapped as untrusted data.
  if (body.tripContext) contextParts.push(wrapUntrusted("trip-context", body.tripContext));
  const contextMessage: LlmMessage | undefined = contextParts.length
    ? { role: "user", content: contextParts.join("\n\n") }
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
  await services.go.persistTurn(session, result.appended, { pendingActions: result.pendingActions });

  const debug = body.debug === true;
  // Enrich the debug trace with exact per-message token weights (debug only —
  // tokenizing is server CPU we skip on normal turns).
  const debugTrace = debug
    ? {
        ...result.debug,
        history: result.debug.history.map((m) => ({ ...m, tokens: countTokens(m.content) })),
        tokens: {
          system: countTokens(result.debug.systemPrompt),
          tools: countTokens(JSON.stringify(toolDefs())),
          context: countTokens(result.debug.context),
          userMessage: countTokens(result.debug.userMessage),
        },
      }
    : null;

  return ok({
    text: result.text,
    steps: result.steps,
    pendingActions: result.pendingActions,
    sessionId: session.id,
    provider: result.provider,
    model: result.model,
    iterations: result.iterations,
    usage: result.usage,
    ...(debugTrace ? { _debug: debugTrace } : {}),
  });
});
