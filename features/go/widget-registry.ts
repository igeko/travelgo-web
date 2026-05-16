/**
 * Go · Widget Registry (server-safe)
 *
 * Questo file NON contiene JSX ed è importabile da API route server-side.
 * I tipi e il registry sono qui. GoWidgetRenderer (JSX) è in GoWidgetRenderer.tsx.
 */

import type { ComponentType } from "react";
import type { ZodSchema } from "zod";
import type { GoActionHandlers, GoResponse } from "./types";

/* ─────────────────────────────────────────────────────────────────
   Definizione di un widget
───────────────────────────────────────────────────────────────── */

export type WidgetDefinition<TPayload = unknown> = {
  /** Chiave univoca — deve corrispondere a `GoResponse.widget` */
  type: string;
  /** Valida il payload grezzo che arriva dall'LLM/API */
  schema: ZodSchema<TPayload>;
  /** Componente React che riceve payload + handler */
  component: ComponentType<TPayload & GoActionHandlers>;
  /**
   * Descrizione per l'LLM (function calling).
   * Il renderer non la usa — serve solo all'API route per costruire i tools.
   */
  toolDescription: {
    description: string;
    parametersSchema: Record<string, unknown>;
  };
};

/* ─────────────────────────────────────────────────────────────────
   Registry
───────────────────────────────────────────────────────────────── */

class GoWidgetRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map = new Map<string, WidgetDefinition<any>>();

  register<TPayload>(def: WidgetDefinition<TPayload>): void {
    if (this.map.has(def.type)) {
      console.warn(`[GoWidgetRegistry] Widget "${def.type}" già registrato — sovrascrittura.`);
    }
    this.map.set(def.type, def);
  }

  get<TPayload>(type: string): WidgetDefinition<TPayload> | undefined {
    return this.map.get(type);
  }

  has(type: string): boolean {
    return this.map.has(type);
  }

  getAllToolDefinitions(): Array<{ type: string } & WidgetDefinition["toolDescription"]> {
    return Array.from(this.map.values()).map((def) => ({
      type: def.type,
      ...def.toolDescription,
    }));
  }
}

export const widgetRegistry = new GoWidgetRegistry();
