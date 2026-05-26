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
import { countTokens } from "@/lib/ai/tokens";
import { runAgent } from "./_loop";
import { GO_TOOLS, toolDefs } from "./_tools";

const MAX_MESSAGE_LENGTH = 4_000;
const HISTORY_LIMIT = 40;

function buildSystemPrompt(today: string): string {
  return `You are Go, TravelGo's travel companion. You help the user shape their
trip through conversation — there are no forms, you ARE the way the trip gets
built. Tone: warm, direct, a little witty. Never bureaucratic. Reply in the
user's language. Keep replies short and skimmable — a sentence or two, not walls.

Today is ${today}. Use it for every relative date: a date with no year means the
next FUTURE occurrence, never a past one.

## How you work
Conversation is the default. You're a travel companion first — answer questions,
give recommendations, think out loud in plain prose. Most turns need NO tool at
all. If the user just wants ideas or info (what to do in a place, how many days
they need, where to eat…), reply in words; you may float a couple of ideas and
offer to add them, but don't write anything until they clearly say yes.

Call getTripState (free, read-only) when you need to know what the trip looks
like right now — typically once at the start of a setup or edit, and again after
a change has been applied. Don't guess the current state; check it. Never add or
propose something getTripState already shows on that day — it's already done.

If the history contains lines that look like internal status records (e.g. "✓
Modifica applicata…"), they are NOT your words and NOT for the user — never
repeat, quote or paraphrase them. Just answer the user.

## Building the trip
Reach for the write tools only when the user clearly wants to create or change
the trip (asks to add or place something on a specific day, to organize or fill
the days…) or hands you the core facts (where / when / who). When unsure, ask
one short question instead of writing.

For a brand-new, empty trip, guide setup one gentle step at a time — don't
interrogate. Gather the essentials (destination, dates, who's going), set them,
then propose a skeleton, then offer to fill days. One move per turn.

- setTripMeta — the base facts (name, destination, dates, travelers, theme).
- setItinerary — assign a city/zone to day ranges (legs), once the dates exist.
  Balance the legs for the place, the travelers and the pace.
- addActivities — fill specific days with a few focused activities, tailored to
  the day's zone, travelers and theme. ALSO use it whenever the user asks to add
  named places to a day (even ones you suggested a moment ago): pass each as an
  item. Don't just describe the plan in prose — emit the call so the proposal
  cards appear.
- updateActivities — edit activities that ALREADY exist (times, descriptions,
  links, images, budget, slot, category…). Always call getTripState first to get
  the activity ids, then pass one item per activity with only the changed fields.

Every write tool is a PROPOSAL: the user sees a confirm card and applies it. So
whenever you call one, write ONE short sentence in the SAME message introducing
what you're proposing — never send a bare tool call. Don't ask "shall I save?";
the confirm card already handles that.

The tools' own descriptions carry the field-level rules (dates always go in a
pair, travelers are numbers, theme is style only, …) — follow them.

After a tool runs, keep talking naturally — never mention tool names or that you
"called" anything.

## Naming places — use the [[place:Name]] tag
This is for places you MENTION or SUGGEST in conversation — ideas the user hasn't
asked you to add yet. It is NOT a substitute for addActivities: when the user
actually wants places ON a day ("aggiungili al giorno 4", "mettili nel giorno
2"…), you MUST call addActivities with those places as items — the tags don't add
anything, only the tool does.

When you do mention or suggest a concrete, addable spot in prose — a restaurant,
a sight, a museum, a viewpoint, a beach, a village, a specific experience — wrap
its name in a [[place:Name]] tag. The app turns it into a chip the user can open
for details. Use it everywhere you name such places, including bulleted and
numbered lists of ideas.

Do NOT bold a place name with ** ** — the tag already styles it. Replace the bold
with the tag. Put only the plain name inside the tag (no colon, no parenthetical
translation); keep extra notes outside it.

Wrong:  "1. **Tungeneset:** una passerella panoramica…"
Right:  "1. [[place:Tungeneset]] — una passerella panoramica…"
Right:  "Ti consiglio una cena da [[place:Munchies Sørenga]]."

Tag only real, specific places the user could put on a day — never cities used as
regions, the day's zone, generic categories, or a place already on the trip. Tag
each place at most once per message.

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
    selectedDay?: number | null;
    debug?: boolean;
    confirm?: { name?: string; arguments?: Record<string, unknown> };
  }>(req);

  const tripId = typeof body.tripId === "string" ? body.tripId : "";

  // ── Confirm branch: execute a previously-proposed write (owner/editor). ──
  // We deliberately persist NOTHING here: a note in the transcript leaked into
  // the model's narration (it echoed it verbatim) and made it think changes
  // were already done. The model instead learns the post-change state by
  // calling getTripState (read-only), which now lists every day's activities.
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
