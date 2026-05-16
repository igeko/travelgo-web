/**
 * POST /api/ai/chat
 *
 * Conversazione tool-calling per Go (assistente di viaggio TravelGo).
 *
 * Body atteso: { messages: ChatMessage[] }
 *   - messages è il transcript fin qui in formato OpenAI Chat Completions
 *     (role: 'system' | 'user' | 'assistant' | 'tool', content, ...).
 *
 * Comportamento:
 *  - Se OPENAI_API_KEY è presente, gira il loop tool-calling reale.
 *  - Altrimenti, restituisce uno scenario scriptato hard-coded (così
 *    la UI è navigabile in dev senza chiave).
 *
 * I risultati delle ricerche vengono inclusi nel `messages` array come
 * Message di kind=results (bucket inline), così il frontend può
 * renderizzarli dentro la conversazione. `turn.results` rimane popolato
 * per retro-compatibilità ma è considerato deprecated.
 *
 * Non logghiamo MAI la chiave. Errori OpenAI tornano con messaggio
 * gentile ma niente dettagli sensibili.
 */

import { NextResponse } from "next/server";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";

import { TOOL_DEFINITIONS } from "@/lib/ai/tool-definitions";
import { runTool, type ToolName, MOCK } from "@/lib/ai/tools";
import type { ActivitySuggestion, AssistantTurn, Message } from "@/lib/ai/types";
import { RESULTS_BUCKET_ID } from "@/lib/ai/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Sei Go, l'assistente di viaggio di TravelGo. Tono caldo, conciso, in prima persona, in italiano.

REGOLE FERREE:
- Parli SEMPRE in italiano.
- NON dire mai "AI", "OpenAI", "GPT", "modello", "intelligenza artificiale". Sei Go.
- Frasi brevi, mai più di 2-3 frasi per turno.

HAI 9 TOOL: get_day_context, get_trip_context, search_places, suggest_activities, add_activity_to_day, add_to_wishlist, set_stay, show_on_map, ask_user_preferences.

ALL'INIZIO DELLA CONVERSAZIONE (nessun user message precedente):
1. Chiama SUBITO get_day_context e get_trip_context per leggere il contesto.
2. Sulla base di ciò che vedi, SCEGLI PROATTIVAMENTE uno dei tool successivi e invocalo. Esempi di criteri decisionali:
   - Se il giorno ha un BUCO TEMPORALE rilevante tra due attività → search_places + suggest_activities per riempire quel buco. Annuncia l'osservazione prima di mostrare i risultati.
   - Se il giorno NON HA STAY impostato → search_places con categoria lodging + suggest_activities. Spiega all'utente che hai notato la mancanza.
   - Se il giorno è QUASI VUOTO (0-1 attività) e l'incipit è chiaro → search_places guidata dall'incipit + suggest_activities.
   - Se il contesto è AMBIGUO (incipit vago, mood non chiaro) → ask_user_preferences con 3-4 chip ("Natura", "Food", "Cultura", "Relax") per disambiguare prima di cercare.
   - Se vedi un PATTERN DAI MOOD STORICI del viaggio, sfruttalo: se l'utente ama Food, proponi cibo prima di altro.
3. NON limitarti a leggere il contesto e chiedere all'utente cosa vuole. PRENDI L'INIZIATIVA. La tua prima vera bubble all'utente deve già contenere un'osservazione e una proposta supportata dai risultati di un tool.
4. Solo se ASSOLUTAMENTE non riesci a decidere → ask_user_preferences.

DURANTE LA CONVERSAZIONE:
- Quando proponi destinazioni: search_places → suggest_activities → comunichi il risultato all'utente con UNA frase che annuncia la lista.
- Se l'utente chiede di affinare ("alternative simili", "più economico", ecc.) → search_places con i nuovi vincoli + suggest_activities. AVVERTI prima che stai SOSTITUENDO i suggerimenti precedenti (es. "Sostituisco i suggerimenti precedenti — eccone altri tre.").
- Quando l'utente accetta un suggerimento → add_activity_to_day o set_stay a seconda del tipo.`;

type RequestBody = { messages?: ChatCompletionMessageParam[] };

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const userMessages = Array.isArray(body.messages) ? body.messages : [];

  // ── Fallback scriptato (no API key) ──────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(scriptedResponse(userMessages));
  }

  // ── Loop tool-calling reale ──────────────────────────────────
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...userMessages,
    ];

    let lastSearchResults: ActivitySuggestion[] | undefined;
    const collectedAssistantMessages: Message[] = [];

    // safety: max 6 round di tool-calling per turno
    for (let i = 0; i < 6; i++) {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: TOOL_DEFINITIONS,
      });

      const choice = completion.choices[0];
      const msg = choice.message;
      messages.push(msg);

      const toolCalls = msg.tool_calls ?? [];

      // Se c'è del testo, lo mettiamo nel transcript verso il client.
      if (msg.content) {
        collectedAssistantMessages.push({
          id: crypto.randomUUID(),
          role: "go",
          content: msg.content,
        });
      }

      // Caso 1: niente tool_calls → conclusione del turno.
      if (toolCalls.length === 0) {
        break;
      }

      // Caso 2: tool_calls → eseguiamo e ricicliamo.
      let didSearchPlaces = false;
      let didSuggestActivities = false;
      let suggestionsAccumulator: ActivitySuggestion[] = [];

      for (const tc of toolCalls) {
        if (tc.type !== "function") continue;
        const name = tc.function.name as ToolName;
        const argsJson = tc.function.arguments || "{}";
        let parsed: unknown = {};
        try {
          parsed = JSON.parse(argsJson);
        } catch {
          parsed = {};
        }

        const output = await runTool(name, parsed);

        if (name === "search_places") didSearchPlaces = true;
        if (name === "suggest_activities") {
          didSuggestActivities = true;
          if (Array.isArray(output)) {
            suggestionsAccumulator = output as ActivitySuggestion[];
          }
        }
        if (name === "ask_user_preferences") {
          const ask = output as { asked: string; options?: string[] };
          collectedAssistantMessages.push({
            id: crypto.randomUUID(),
            role: "go",
            content: ask.asked,
            kind: "quick-replies",
            quickReplies: ask.options ?? [],
          });
        }

        const toolMsg: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(output ?? {}),
        };
        messages.push(toolMsg);
      }

      if (didSearchPlaces || didSuggestActivities) {
        if (suggestionsAccumulator.length > 0) {
          lastSearchResults = suggestionsAccumulator;
        }
      }

      if (choice.finish_reason === "stop" && toolCalls.length === 0) {
        break;
      }
    }

    // Embed dei risultati nella stream di messages (bucket inline).
    if (lastSearchResults && lastSearchResults.length > 0) {
      collectedAssistantMessages.push({
        id: RESULTS_BUCKET_ID,
        role: "go",
        content: "",
        kind: "results",
        results: lastSearchResults,
      });
    }

    const turn: AssistantTurn = {
      messages: collectedAssistantMessages,
      results: lastSearchResults, // DEPRECATED · solo per retro-compat
    };
    return NextResponse.json(turn);
  } catch (err) {
    // Errore gentile: NON esponiamo la causa.
    // eslint-disable-next-line no-console
    console.error("[/api/ai/chat] error", (err as Error).message);
    const turn: AssistantTurn = {
      messages: [
        {
          id: crypto.randomUUID(),
          role: "go",
          content:
            "Mi spiace, c'è stato un intoppo dalla mia parte. Riprova fra un attimo.",
        },
      ],
    };
    return NextResponse.json(turn, { status: 200 });
  }
}

/* ─────────────────────────────────────────────────────────────────
   Fallback scriptato — replica il flusso del prototipo HTML
   senza bisogno di API key. Sceglie cosa rispondere in base
   all'ultimo messaggio user nel transcript.

   Al primo turno (nessun user message) Go prende l'iniziativa:
   saluto + osservazione proattiva + bucket inline di 3 idee.
   Niente quick-replies: l'utente reagisce ai risultati.
───────────────────────────────────────────────────────────────── */

function scriptedResponse(history: ChatCompletionMessageParam[]): AssistantTurn {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const userText =
    typeof lastUser?.content === "string"
      ? lastUser.content
      : Array.isArray(lastUser?.content)
      ? lastUser.content
          .map((p) => ("text" in p ? p.text : ""))
          .join(" ")
      : "";

  // Avvio della conversazione (nessun user message nel transcript).
  // Go prende l'iniziativa: legge il contesto, osserva il buco temporale,
  // propone 3 idee inline subito.
  if (!lastUser) {
    return {
      messages: [
        {
          id: "go-1",
          role: "go",
          content:
            "Ciao Enrico! Sto guardando come hai impostato la giornata: Ginza, mercato di Tsukiji, e finale nei giardini di Hama-Rikyū. Mi piace come fila.",
        },
        {
          id: "go-2",
          role: "go",
          content:
            "Ho notato un buco di un paio d'ore fra Tsukiji (12:30) e Hama-Rikyū (15:00). Ti propongo subito tre posti tranquilli in quella direzione.",
        },
        {
          id: RESULTS_BUCKET_ID,
          role: "go",
          content: "",
          kind: "results",
          results: MOCK.suggestions,
        },
      ],
      results: MOCK.suggestions,
    };
  }

  const text = userText.toLowerCase();

  // Utente rifiuta.
  if (/no|già un piano|ho un piano/.test(text)) {
    return {
      messages: [
        {
          id: crypto.randomUUID(),
          role: "go",
          content:
            "Tutto chiaro, lascio in pace il piano. Se cambi idea io sono qui.",
        },
      ],
    };
  }

  // Tutto il resto → "rigenera" i 3 luoghi (bucket inline che sostituisce).
  return {
    messages: [
      {
        id: crypto.randomUUID(),
        role: "go",
        content:
          "Sostituisco i suggerimenti precedenti — eccone altri tre, sempre nella tua direzione.",
      },
      {
        id: RESULTS_BUCKET_ID,
        role: "go",
        content: "",
        kind: "results",
        results: MOCK.suggestions,
      },
    ],
    results: MOCK.suggestions,
  };
}
