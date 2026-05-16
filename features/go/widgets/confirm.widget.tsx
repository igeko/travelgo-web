/**
 * Widget: confirm
 *
 * Scelta binaria. Go propone un'azione e l'utente conferma o rifiuta.
 * Utile per: "Vuoi aggiungere questo al giorno 3?", "Confermi di
 * voler rimuovere questa attività?", "Procedo con la prenotazione?"
 */

import { z } from "zod";
import { cn } from "@/lib/cn";
import type { WidgetDefinition } from "../widget-registry";
import type { GoActionHandlers } from "../types";

/* ── Schema ── */

export const ConfirmPayloadSchema = z.object({
  /** La domanda posta all'utente */
  question: z.string(),
  /** Dettaglio opzionale sotto la domanda */
  detail: z.string().optional(),
  /** Etichetta pulsante positivo (default: "Sì, procedi") */
  labelYes: z.string().default("Sì, procedi"),
  /** Etichetta pulsante negativo (default: "No, grazie") */
  labelNo: z.string().default("No, grazie"),
  /** Campo opzionale su cui si sta confermando (passato nell'action) */
  field: z.string().optional(),
  /** Tono: default=neutro, danger=azione distruttiva */
  tone: z.enum(["default", "danger"]).default("default"),
});

export type ConfirmPayload = z.infer<typeof ConfirmPayloadSchema>;

/* ── Componente ── */

function ConfirmWidget({
  question,
  detail,
  labelYes,
  labelNo,
  field,
  tone,
  onAction,
  onDismiss,
}: ConfirmPayload & GoActionHandlers) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 border border-border rounded-xl bg-surface">
      {/* Domanda */}
      <div>
        <div className="text-[14px] font-medium text-ink leading-snug">{question}</div>
        {detail && (
          <div className="text-[12px] font-serif italic text-ink-soft mt-1">{detail}</div>
        )}
      </div>

      {/* Azioni */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAction({ kind: "confirm", value: true, field })}
          className={cn(
            "flex-1 py-2 rounded-pill text-[13px] font-medium transition-colors",
            tone === "danger"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-ink text-white hover:bg-ink/90",
          )}
        >
          {labelYes}
        </button>
        <button
          type="button"
          onClick={() => {
            onAction({ kind: "confirm", value: false, field });
            onDismiss();
          }}
          className="flex-1 py-2 rounded-pill text-[13px] font-medium border border-border-strong text-ink hover:bg-surface-soft transition-colors"
        >
          {labelNo}
        </button>
      </div>
    </div>
  );
}

/* ── Definizione widget ── */

export const confirmWidgetDef: WidgetDefinition<ConfirmPayload> = {
  type: "confirm",
  schema: ConfirmPayloadSchema,
  component: ConfirmWidget,
  toolDescription: {
    description:
      "Chiede all'utente una conferma binaria (sì/no) prima di eseguire un'azione. " +
      "Usare per azioni significative che richiedono consenso esplicito.",
    parametersSchema: {
      type: "object",
      required: ["question"],
      properties: {
        question: { type: "string", description: "La domanda da porre all'utente" },
        detail: { type: "string", description: "Contesto aggiuntivo sotto la domanda" },
        labelYes: { type: "string", description: "Etichetta conferma (default: 'Sì, procedi')" },
        labelNo: { type: "string", description: "Etichetta rifiuto (default: 'No, grazie')" },
        field: { type: "string", description: "Campo oggetto della conferma" },
        tone: { type: "string", enum: ["default", "danger"], description: "Tono visivo" },
      },
    },
  },
};
