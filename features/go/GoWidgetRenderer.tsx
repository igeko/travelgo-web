"use client";

/**
 * GoWidgetRenderer — monta il componente React giusto dato un GoResponse.
 * Importato solo client-side (GoPanel). Non importare da API route.
 */

import type { GoAction, GoResponse } from "./types";
import { widgetRegistry } from "./widget-registry";

type GoWidgetRendererProps = {
  response: GoResponse;
  onAction: (action: GoAction) => void;
  onDismiss: () => void;
};

export function GoWidgetRenderer({ response, onAction, onDismiss }: GoWidgetRendererProps) {
  const def = widgetRegistry.get(response.widget);

  if (!def) {
    console.error(`[GoWidgetRenderer] Widget sconosciuto: "${response.widget}"`);
    return (
      <div className="text-[12px] text-ink-faint italic px-4 py-3 border border-dashed border-border rounded-xl">
        Widget non disponibile: <code>{response.widget}</code>
      </div>
    );
  }

  const parsed = def.schema.safeParse(response.payload);
  if (!parsed.success) {
    console.error(`[GoWidgetRenderer] Payload non valido per "${response.widget}":`, parsed.error);
    return (
      <div className="text-[12px] text-ink-faint italic px-4 py-3 border border-dashed border-border rounded-xl">
        Dati non validi per il widget <code>{response.widget}</code>.
      </div>
    );
  }

  const Component = def.component;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Component {...(parsed.data as any)} onAction={onAction} onDismiss={onDismiss} />;
}
