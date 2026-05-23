/**
 * POST /api/go/chat
 *
 * Tre modalità, scelte da un classification step OpenAI (gpt-4o-mini, ~100ms):
 *
 * 1. "chat"        — risposta conversazionale streaming (gpt-4o-mini)
 * 2. "suggestions" — lista attività/luoghi JSON (gpt-4o)
 * 3. "deepdive"    — approfondimento strutturato su 1 luogo JSON (gpt-4o)
 *
 * forceSuggestions=true bypassa il classifier (usato dal greeting iniziale).
 */

import { activeProvider, chatGrounded, chatJson, chatStream, type GroundedPlace, type LlmLatLng, type LlmMessage } from "@/lib/ai/llm";
import { runDeepDive } from "../_deepDive";
import { UNTRUSTED_DATA_INSTRUCTION, wrapUntrusted, sanitizeUntrustedText } from "@/lib/api/go-untrusted";

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 4_000;

/** Strip ```json fences a grounded model may wrap its JSON in. */
function parseJsonLoose<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned || "{}") as T;
}

/** Normalize a place title for fuzzy matching against grounded chunks. */
function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Attach the Google `place_id` from grounded chunks onto each suggestion by
 * title match. Lets the frontend skip the Places text-search step.
 */
function attachPlaceIds(
  suggestions: Array<Record<string, unknown>>,
  places: GroundedPlace[],
): void {
  if (!places.length) return;
  const indexed = places.map((p) => ({ p, n: normTitle(p.title) }));
  for (const s of suggestions) {
    const title = typeof s.title === "string" ? normTitle(s.title) : "";
    if (!title) continue;
    const hit =
      indexed.find((x) => x.n === title) ??
      indexed.find((x) => x.n.includes(title) || title.includes(x.n));
    if (hit) s.place_id = hit.p.placeId;
  }
}

/* ─────────────────────────────────────────────────────────────────
   System prompts
───────────────────────────────────────────────────────────────── */

const BASE_SYSTEM_PROMPT = `You are Go, TravelGo's travel assistant.
Your tone is warm, direct, and slightly witty. Never bureaucratic.
You help users plan trips in a concrete and personal way.
Reply in the same language the user writes in.
Keep answers concise — 1-3 sentences for simple questions, more only when truly needed.

${UNTRUSTED_DATA_INSTRUCTION}`;

const SUGGESTIONS_SYSTEM_PROMPT = `You are Go, TravelGo's travel assistant.
Your tone is warm, direct, and slightly witty.
The user is asking for activity or place suggestions.
Reply in the same language the user writes in.

Respond ONLY with a valid JSON object in this exact format — no markdown, no code fences:
{
  "text": "<one warm sentence introducing the suggestions>",
  "suggestions": [
    {
      "id": "<unique short id, e.g. s1>",
      "title": "<place or activity name>",
      "category": "<one of: culture | food | nature | experience | transport | stay>",
      "duration": "<e.g. 2h | half-day | full-day>",
      "price": "<one of: free | € | €€ | €€€>",
      "why": "<2-3 sentences: what makes it special, practical tips, best time to go>",
      "location": "<city or neighborhood>",
      "place_query": "<optimized query for Google Places image search, e.g. 'Senso-ji Temple Asakusa Tokyo'>"
    }
  ]
}

Decide how many suggestions to return based on the user's request: if they ask for a specific number (e.g. "top 10", "5 restaurants", "a couple of ideas"), return exactly that many; otherwise return a sensible number (around 4-6). Be specific and concrete — real place names, real tips.

${UNTRUSTED_DATA_INSTRUCTION}`;

/* ─────────────────────────────────────────────────────────────────
   Intent classifier — chiede a gpt-4o-mini di scegliere il mode
───────────────────────────────────────────────────────────────── */

type IntentResult =
  | { mode: "chat" }
  | { mode: "suggestions" }
  | { mode: "deepdive"; query: string };

const CLASSIFIER_SYSTEM = `You are an intent classifier for a travel assistant chat.
Given the last user message (and optionally prior context), respond ONLY with valid JSON:

- If the user wants a list of activities, places, restaurants, things to do, or recommendations:
  { "mode": "suggestions" }

- If the user asks about a SPECIFIC named place, landmark, neighborhood, or attraction
  (e.g. "tell me about Senso-ji", "what is Shibuya Crossing?", "info on Tsukiji Market"):
  { "mode": "deepdive", "query": "<exact place name extracted from the message>" }

- For everything else (greetings, general questions, follow-ups, clarifications):
  { "mode": "chat" }

Rules:
- "What to do in Tokyo" → suggestions (generic area, not a specific place)
- "Tell me about Shinjuku" → deepdive (specific neighborhood/place)
- "Is it worth visiting?" (follow-up with no specific place) → chat
- Reply only with the JSON object, no explanation.`;

async function classifyIntent(
  messages: { role: string; content: string }[],
  selectedTitle?: string,
): Promise<IntentResult> {
  const recent = messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));

  // Sanitize selectedTitle: it ends up inside a JSON template literal in the
  // system prompt, so an attacker could otherwise close the JSON and inject
  // instructions through their suggestion title.
  const safeTitle = selectedTitle
    ? sanitizeUntrustedText(selectedTitle, 120).replace(/["\\]/g, "")
    : undefined;

  const systemWithContext = safeTitle
    ? `${CLASSIFIER_SYSTEM}\n\nCurrent context: the user has selected the card "${safeTitle}". If the message refers to it vaguely (e.g. "this", "that", "it", "quello", "questo", "approfondisci", "tell me more", "expand"), classify as { "mode": "deepdive", "query": "${safeTitle}" }.`
    : CLASSIFIER_SYSTEM;

  // A provider error here must never 500 the route — fall back to chat mode.
  try {
    const raw = (await chatJson({
      tier: "fast",
      maxTokens: 60,
      messages: [
        { role: "system", content: systemWithContext },
        ...(recent as LlmMessage[]),
      ],
    })) || '{"mode":"chat"}';
    return JSON.parse(raw) as IntentResult;
  } catch (err) {
    console.error("[go/chat] classify error:", err);
    return { mode: "chat" };
  }
}

/* ─────────────────────────────────────────────────────────────────
   Route handler
───────────────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  let messages: { role: "user" | "assistant"; content: string }[];
  let tripContext: string | undefined;
  let forceSuggestions = false;
  let selectedSuggestion: { title: string; location?: string; place_query?: string } | undefined;
  let near: LlmLatLng | undefined;
  let debug = false;

  try {
    const body = await req.json() as {
      messages: typeof messages;
      tripContext?: string;
      forceSuggestions?: boolean;
      selectedSuggestion?: typeof selectedSuggestion;
      near?: { lat?: unknown; lng?: unknown };
      debug?: boolean;
    };
    if (!Array.isArray(body.messages)) {
      return new Response("messages must be an array", { status: 400 });
    }
    messages = body.messages
      .slice(-MAX_MESSAGES)
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
    tripContext = body.tripContext;
    forceSuggestions = body.forceSuggestions ?? false;
    selectedSuggestion = body.selectedSuggestion;
    debug = body.debug === true;
    if (typeof body.near?.lat === "number" && typeof body.near?.lng === "number") {
      near = { lat: body.near.lat, lng: body.near.lng };
    }
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // forceSuggestions bypassa il classifier (greeting iniziale)
  const intent: IntentResult = forceSuggestions
    ? { mode: "suggestions" }
    : await classifyIntent(messages, selectedSuggestion?.title);

  /* ── Mode: deepdive ── */
  if (intent.mode === "deepdive") {
    try {
      // Usa i dati della suggestion selezionata se disponibili, altrimenti solo il query
      const title = selectedSuggestion?.title ?? intent.query;
      const result = await runDeepDive({
        title,
        location: selectedSuggestion?.location,
        tripContext,
      });
      const suggestion = selectedSuggestion ?? {
        id: "dd0",
        title,
        category: "experience" as const,
        duration: "",
        price: "",
        why: result.overview,
        location: "",
        place_query: title,
      };
      return new Response(JSON.stringify({ mode: "deepdive", suggestion, ...result }), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-LLM-Provider": activeProvider(),
        },
      });
    } catch (err) {
      console.error("[go/chat] deepdive error:", err);
      // Fall through to chat
    }
  }

  // Trip context is user-supplied — wrap it as untrusted data in a user message
  // (never concatenate into the system prompt).
  const tripContextMessage: LlmMessage | null = tripContext
    ? { role: "user", content: wrapUntrusted("trip-context", tripContext) }
    : null;

  /* ── Mode: suggestions ── */
  if (intent.mode === "suggestions") {
    try {
      const t0 = Date.now();
      const grounded = await chatGrounded({
        tier: "smart",
        near,
        messages: [
          { role: "system", content: SUGGESTIONS_SYSTEM_PROMPT },
          ...(tripContextMessage ? [tripContextMessage] : []),
          ...messages,
        ],
      });
      const parsed = parseJsonLoose<{ text?: string; suggestions?: Array<Record<string, unknown>> }>(grounded.text);

      // Gemini grounding gives real Google place_ids → attach them so the
      // frontend resolves places by id instead of a Places text search.
      if (Array.isArray(parsed.suggestions)) attachPlaceIds(parsed.suggestions, grounded.places);

      const payload: Record<string, unknown> = { mode: "suggestions", ...parsed };
      if (debug) {
        payload._debug = {
          provider: grounded.provider,
          model: grounded.model,
          durationMs: Date.now() - t0,
          grounded: grounded.places.map((p) => ({ title: p.title, placeId: p.placeId })),
        };
      }

      return new Response(JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-LLM-Provider": grounded.provider,
          "X-LLM-Model": grounded.model,
        },
      });
    } catch (err) {
      console.error("[go/chat] suggestions error:", err);
      // Fall through to chat
    }
  }

  /* ── Mode: chat (streaming) ── */
  const stream = chatStream({
    tier: "fast",
    messages: [
      { role: "system", content: BASE_SYSTEM_PROMPT },
      ...(tripContextMessage ? [tripContextMessage] : []),
      ...messages,
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of stream) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        // Provider error mid-stream (rate limit, timeout…): end cleanly so the
        // client shows its fallback rather than a broken connection.
        console.error("[go/chat] stream error:", err);
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      "X-LLM-Provider": activeProvider(),
    },
  });
}
