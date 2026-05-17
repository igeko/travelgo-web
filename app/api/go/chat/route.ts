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

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { runDeepDive } from "../_deepDive";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* ─────────────────────────────────────────────────────────────────
   System prompts
───────────────────────────────────────────────────────────────── */

const BASE_SYSTEM_PROMPT = `You are Go, TravelGo's travel assistant.
Your tone is warm, direct, and slightly witty. Never bureaucratic.
You help users plan trips in a concrete and personal way.
Reply in the same language the user writes in.
Keep answers concise — 1-3 sentences for simple questions, more only when truly needed.`;

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

Return 4-5 suggestions. Be specific and concrete — real place names, real tips.`;

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

  // Se c'è una suggestion selezionata, lo aggiungiamo come contesto esplicito
  const systemWithContext = selectedTitle
    ? `${CLASSIFIER_SYSTEM}\n\nCurrent context: the user has selected the card "${selectedTitle}". If the message refers to it vaguely (e.g. "this", "that", "it", "quello", "questo", "approfondisci", "tell me more", "expand"), classify as { "mode": "deepdive", "query": "${selectedTitle}" }.`
    : CLASSIFIER_SYSTEM;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 60,
    messages: [
      { role: "system", content: systemWithContext },
      ...recent as ChatCompletionMessageParam[],
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{"mode":"chat"}';
  try {
    return JSON.parse(raw) as IntentResult;
  } catch {
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

  try {
    const body = await req.json() as {
      messages: typeof messages;
      tripContext?: string;
      forceSuggestions?: boolean;
      selectedSuggestion?: typeof selectedSuggestion;
    };
    messages = body.messages;
    tripContext = body.tripContext;
    forceSuggestions = body.forceSuggestions ?? false;
    selectedSuggestion = body.selectedSuggestion;
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
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" },
      });
    } catch (err) {
      console.error("[go/chat] deepdive error:", err);
      // Fall through to chat
    }
  }

  /* ── Mode: suggestions ── */
  if (intent.mode === "suggestions") {
    const systemPrompt = tripContext
      ? `${SUGGESTIONS_SYSTEM_PROMPT}\n\n${tripContext}`
      : SUGGESTIONS_SYSTEM_PROMPT;

    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(rawText) as { text?: string; suggestions?: unknown[] };

      return new Response(JSON.stringify({ mode: "suggestions", ...parsed }), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" },
      });
    } catch (err) {
      console.error("[go/chat] suggestions error:", err);
      // Fall through to chat
    }
  }

  /* ── Mode: chat (streaming) ── */
  const systemPrompt = tripContext
    ? `${BASE_SYSTEM_PROMPT}\n\n${tripContext}`
    : BASE_SYSTEM_PROMPT;

  const stream = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) controller.enqueue(encoder.encode(delta));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
