/**
 * Widget: quick-reply
 *
 * Scelta singola tra 3-4 opzioni proposte da Go come primo passo
 * della conversazione. La selezione scatena una seconda chiamata
 * API che restituisce il widget finale (suggestions, carousel…).
 *
 * Non emette un GoAction — chiama direttamente onSelect(value)
 * che il GoPanel usa per innescare la seconda chiamata.
 */

import { z } from "zod";
import { cn } from "@/lib/cn";
import type { WidgetDefinition } from "../widget-registry";
import type { GoActionHandlers } from "../types";

/* ── Schema ── */

export const QuickReplyOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  /** Emoji decorativa opzionale */
  emoji: z.string().optional(),
});

export const QuickReplyPayloadSchema = z.object({
  options: z.array(QuickReplyOptionSchema).min(2).max(4),
});

export type QuickReplyPayload = z.infer<typeof QuickReplyPayloadSchema>;
export type QuickReplyOption = z.infer<typeof QuickReplyOptionSchema>;

/* ── Componente ── */

function QuickReplyWidget({
  options,
  onAction,
}: QuickReplyPayload & GoActionHandlers) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onAction({ kind: "select", itemId: opt.value, label: opt.label })}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill border transition-all duration-150",
            "text-[12px] font-medium text-ink border-border-strong bg-surface",
            "hover:bg-ink hover:text-white hover:border-ink",
          )}
        >
          {opt.emoji && <span className="text-[14px] leading-none">{opt.emoji}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Definizione widget ── */

export const quickReplyWidgetDef: WidgetDefinition<QuickReplyPayload> = {
  type: "quick-reply",
  schema: QuickReplyPayloadSchema,
  component: QuickReplyWidget,
  toolDescription: {
    description:
      "Propone all'utente 3-4 opzioni di scelta singola come primo passo della conversazione. " +
      "Usare SOLO come risposta al primo saluto, per capire cosa vuole fare l'utente. " +
      "Le opzioni devono essere contestuali alla destinazione e ai temi del viaggio. " +
      "Scegli le 3-4 più rilevanti tra: 'Un posto da vedere', 'Un food spot', " +
      "'Un'esperienza locale', 'Un'attività per oggi', 'Qualcosa di insolito', " +
      "'Riempi un giorno', 'Come muoversi', 'Dove dormire'.",
    parametersSchema: {
      type: "object",
      required: ["options"],
      properties: {
        options: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: {
            type: "object",
            required: ["value", "label"],
            properties: {
              value: { type: "string", description: "Identificatore interno (snake_case)" },
              label: { type: "string", description: "Testo mostrato all'utente" },
              emoji: { type: "string", description: "Emoji opzionale" },
            },
          },
        },
      },
    },
  },
};
