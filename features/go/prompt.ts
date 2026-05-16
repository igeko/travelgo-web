/**
 * Go · Prompt builder
 *
 * Costruisce i messaggi da mandare a OpenAI dato un GoContext.
 * Separato dall'API route per poter essere importato anche dalla
 * sandbox (debug panel) senza dipendenze server-side.
 */

import type { GoContext } from "./types";
import type { WidgetDefinition } from "./widget-registry";

/* ─────────────────────────────────────────────────────────────────
   System prompt
───────────────────────────────────────────────────────────────── */

export const GO_SYSTEM_PROMPT = `Sei Go, l'assistente di viaggio di TravelGo.
Aiuti l'utente a pianificare il viaggio in modo concreto e personale.

Il tuo tono è caldo, diretto, leggermente ironico. Mai burocratico.
Scrivi in italiano a meno che l'utente non scriva in un'altra lingua.

Ogni risposta è composta da DUE parti, nell'ordine:
1. Un breve messaggio testuale (1-2 frasi, in "text") — il tuo balloon di saluto o commento.
2. Una function call — il widget più adatto al contesto.

Regole sui widget:
- Prima interazione → usa SEMPRE "quick-reply" con 3-4 opzioni contestuali.
- Dopo la scelta dell'utente → usa "suggestions" o "carousel" con risultati reali.
- Usa "confirm" solo per azioni binarie concrete.
- Usa "carousel" per esperienze visive (luoghi, hotel, esperienze).
- Usa "suggestions" per liste di idee da salvare o aggiungere al giorno.
- Mai inventare place_id o dati di prenotazione — solo nomi e descrizioni.
- Massimo 4 item per quick-reply, 6 per suggestions/carousel.`.trim();

/* ─────────────────────────────────────────────────────────────────
   System prompt per il secondo step (dopo la scelta quick-reply)
───────────────────────────────────────────────────────────────── */

export const GO_SYSTEM_PROMPT_STEP2 = `Sei Go, l'assistente di viaggio di TravelGo.
L'utente ha appena scelto cosa vuole esplorare. Rispondi con risultati concreti.

Ogni risposta è composta da DUE parti:
1. Un breve messaggio testuale (1 frase) — commento contestuale o intro ai risultati.
2. Una function call — "suggestions" o "carousel" con i migliori risultati.

Regole:
- Scegli tra "suggestions" e "carousel" in base al contenuto:
  carousel per luoghi/esperienze visive, suggestions per liste di idee.
- I risultati devono essere specifici alla destinazione e coerenti coi temi del viaggio.
- Massimo 5 item, qualità > quantità.
- Mai inventare dati — solo nomi, descrizioni, tag plausibili.`.trim();

/* ─────────────────────────────────────────────────────────────────
   User message — passo 1 (primo saluto)
───────────────────────────────────────────────────────────────── */

export function buildUserMessage(ctx: GoContext): string {
  const lines: string[] = [];

  const dateStr =
    ctx.trip.dates.start && ctx.trip.dates.end
      ? `${ctx.trip.dates.start} → ${ctx.trip.dates.end}`
      : ctx.trip.dates.start ?? "date non definite";

  lines.push(`Viaggio: ${ctx.trip.destination} · ${dateStr}`);

  if (ctx.trip.themes.length > 0) {
    lines.push(`Temi: ${ctx.trip.themes.join(", ")}`);
  }

  lines.push(`Pagina: ${ctx.page}`);

  const triggerLine = ctx.trigger.userIntent
    ? `Trigger: ${ctx.trigger.source} · "${ctx.trigger.userIntent}"`
    : `Trigger: ${ctx.trigger.source}`;
  lines.push(triggerLine);

  if (ctx.trigger.elementId) {
    lines.push(`Elemento: ${ctx.trigger.elementId}`);
  }

  if (ctx.day) {
    const dayLine = [
      `Giorno ${ctx.day.number}`,
      ctx.day.title,
      `${ctx.day.activitiesCount} attività già pianificate`,
    ]
      .filter(Boolean)
      .join(" · ");
    lines.push(dayLine);
  }

  lines.push("\nÈ la prima interazione. Saluta l'utente e proponi le opzioni più rilevanti con quick-reply.");

  return lines.join("\n");
}

/* ─────────────────────────────────────────────────────────────────
   User message — passo 2 (dopo scelta quick-reply)
───────────────────────────────────────────────────────────────── */

export function buildUserMessageStep2(ctx: GoContext, userChoice: string): string {
  const lines: string[] = [];

  lines.push(`Viaggio: ${ctx.trip.destination}`);

  if (ctx.trip.themes.length > 0) {
    lines.push(`Temi: ${ctx.trip.themes.join(", ")}`);
  }

  if (ctx.day) {
    lines.push(`Giorno ${ctx.day.number}${ctx.day.title ? " · " + ctx.day.title : ""}`);
  }

  lines.push(`\nL'utente ha scelto: "${userChoice}"`);
  lines.push("Proponi risultati concreti e pertinenti.");

  return lines.join("\n");
}

/* ─────────────────────────────────────────────────────────────────
   Tools — generati dal registry (JSON Schema per OpenAI)
───────────────────────────────────────────────────────────────── */

export type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTools(defs: Array<{ type: string } & WidgetDefinition<any>["toolDescription"]>): OpenAITool[] {
  return defs.map((def) => ({
    type: "function",
    function: {
      name: def.type,
      description: def.description,
      parameters: def.parametersSchema,
    },
  }));
}

/* ─────────────────────────────────────────────────────────────────
   Payload completo — tutto ciò che va a OpenAI
───────────────────────────────────────────────────────────────── */

export type GoPromptPayload = {
  system: string;
  userMessage: string;
  tools: OpenAITool[];
  tool_choice: "required";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolDefsInput =
  | OpenAITool[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Array<{ type: string } & WidgetDefinition<any>["toolDescription"]>;

function isOpenAITools(defs: ToolDefsInput): defs is OpenAITool[] {
  return defs.length === 0 || "function" in defs[0];
}

export function buildPromptPayload(
  ctx: GoContext,
  toolDefs: ToolDefsInput,
  step: 1 | 2 = 1,
  userChoice?: string,
): GoPromptPayload {
  const tools: OpenAITool[] = isOpenAITools(toolDefs)
    ? toolDefs
    : buildTools(toolDefs as Array<{ type: string } & WidgetDefinition["toolDescription"]>);

  return {
    system: step === 1 ? GO_SYSTEM_PROMPT : GO_SYSTEM_PROMPT_STEP2,
    userMessage: step === 1
      ? buildUserMessage(ctx)
      : buildUserMessageStep2(ctx, userChoice ?? ""),
    tools,
    tool_choice: "required",
  };
}
