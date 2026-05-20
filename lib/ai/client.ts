/**
 * Client lato frontend per /api/ai/chat.
 *
 * Trasforma il transcript UI (Message[]) nel formato Chat Completions
 * atteso dal backend, fa fetch, e ritorna i nuovi messaggi assistant
 * (potenzialmente già contenenti un message di kind `results` per il
 * bucket inline).
 *
 * Strategia bucket:
 *  - Se la response del backend ha `results` (campo legacy), il client
 *    lo normalizza in coda agli `assistantMessages` come Message di
 *    kind=results con id stabile RESULTS_BUCKET_ID.
 *  - Se il backend già emette un message kind=results, lo passiamo
 *    intatto (id stabile a cura del reducer).
 *  - Il reducer si occupa poi di sostituire in-place l'eventuale
 *    bucket precedente — niente duplicati nel transcript.
 */

import type { AssistantTurn, Message } from "./types";
import { RESULTS_BUCKET_ID } from "./types";
import { api } from "@/lib/client";

type ChatRole = "user" | "assistant";

type WireMessage = {
  role: ChatRole;
  content: string;
};

/** Converte un transcript UI nel formato Chat Completions del backend. */
function toWire(history: Message[]): WireMessage[] {
  return history
    .filter((m) => m.kind !== "result-anchor" && m.kind !== "results")
    .map((m) => ({
      role: m.role === "go" ? "assistant" : "user",
      content: m.content,
    }));
}

export type SendMessageResult = {
  assistantMessages: Message[];
};

/**
 * Manda un messaggio (o solo aggiorna l'history) al backend.
 *
 * @param history Transcript UI completo (NON includere il nuovo userInput).
 * @param userInput Eventuale nuovo input utente da appendere al volo.
 */
export async function sendMessage(
  history: Message[],
  userInput?: string,
): Promise<SendMessageResult> {
  const fullHistory = userInput
    ? [
        ...history,
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          content: userInput,
        },
      ]
    : history;

  try {
    const turn = await api.ai.chat<AssistantTurn>(toWire(fullHistory));
    const messages = normalizeTurn(turn);
    return { assistantMessages: messages };
  } catch (err) {
    console.error("[Go client] sendMessage failed", err);
    return {
      assistantMessages: [
        {
          id: crypto.randomUUID(),
          role: "go",
          content:
            "Mi spiace, c'è stato un intoppo. Riprova fra un attimo.",
        },
      ],
    };
  }
}

/**
 * Normalizza l'`AssistantTurn` del backend in una lista piatta di
 * `Message` pronti per il reducer. Se la response usa il campo legacy
 * `results`, lo trasforma in un message di kind=results in coda.
 */
function normalizeTurn(turn: AssistantTurn): Message[] {
  const out: Message[] = [...(turn.messages ?? [])];
  const alreadyHasBucket = out.some((m) => m.kind === "results");
  if (!alreadyHasBucket && turn.results && turn.results.length > 0) {
    out.push({
      id: RESULTS_BUCKET_ID,
      role: "go",
      content: "",
      kind: "results",
      results: turn.results,
    });
  }
  return out;
}
