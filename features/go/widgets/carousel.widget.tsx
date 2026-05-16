/**
 * Widget: carousel
 *
 * Selezione visuale da un set di card scorrevoli orizzontalmente.
 * Adatto a: foto di luoghi, opzioni di alloggio, tipi di esperienza.
 * L'utente sceglie una card → action "select".
 */

"use client";

import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/cn";
import type { WidgetDefinition } from "../widget-registry";
import type { GoActionHandlers } from "../types";

/* ── Schema ── */

export const CarouselItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  /** URL immagine opzionale — se assente si usa un placeholder colorato */
  imageUrl: z.string().url().optional(),
  /** Colore di fallback se imageUrl è assente (hex o css color) */
  placeholderColor: z.string().optional(),
  /** Badge sovrapposto all'immagine (es. "⭐ 4.8", "€€€") */
  badge: z.string().optional(),
  tag: z.string().optional(),
});

export const CarouselPayloadSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  items: z.array(CarouselItemSchema).min(2).max(8),
  /** Se true, si possono selezionare più item */
  multiSelect: z.boolean().default(false),
  /** Etichetta del CTA di conferma (solo in multiSelect) */
  confirmLabel: z.string().default("Conferma selezione"),
});

export type CarouselPayload = z.infer<typeof CarouselPayloadSchema>;
export type CarouselItem = z.infer<typeof CarouselItemSchema>;

/* ── Componente ── */

function CarouselWidget({
  title,
  subtitle,
  items,
  multiSelect,
  confirmLabel,
  onAction,
  onDismiss,
}: CarouselPayload & GoActionHandlers) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    if (!multiSelect) {
      // single select → emette subito l'azione
      const item = items.find((i) => i.id === id);
      onAction({ kind: "select", itemId: id, label: item?.title ?? id });
      return;
    }
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleConfirm() {
    selected.forEach((id) => {
      const item = items.find((i) => i.id === id);
      onAction({ kind: "select", itemId: id, label: item?.title ?? id });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="text-[13px] font-medium text-ink">{title}</div>
        {subtitle && (
          <div className="text-[11px] font-serif italic text-ink-soft mt-0.5">{subtitle}</div>
        )}
      </div>

      {/* Scroll orizzontale */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {items.map((item) => (
          <CarouselCard
            key={item.id}
            item={item}
            isSelected={selected.includes(item.id)}
            onClick={() => toggle(item.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] text-ink-soft underline decoration-ink/20 hover:text-ink transition-colors"
        >
          Chiudi
        </button>
        {multiSelect && selected.length > 0 && (
          <button
            type="button"
            onClick={handleConfirm}
            className="text-[12px] font-medium bg-ink text-white px-4 py-1.5 rounded-pill hover:bg-ink/90 transition-colors"
          >
            {confirmLabel} ({selected.length})
          </button>
        )}
      </div>
    </div>
  );
}

function CarouselCard({
  item,
  isSelected,
  onClick,
}: {
  item: CarouselItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const fallbackColor = item.placeholderColor ?? "#c5b5a0";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 snap-start flex flex-col overflow-hidden rounded-xl border transition-all duration-150 text-left w-[148px]",
        isSelected
          ? "border-ink shadow-[0_0_0_2px_rgba(13,44,61,0.15)]"
          : "border-border hover:border-border-strong",
      )}
    >
      {/* Immagine / placeholder */}
      <div
        className="w-full h-[96px] bg-cover bg-center relative"
        style={{
          backgroundColor: fallbackColor,
          backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
        }}
      >
        {item.badge && (
          <span className="absolute top-2 right-2 text-[10px] font-medium bg-white/90 text-ink px-1.5 py-0.5 rounded">
            {item.badge}
          </span>
        )}
        {isSelected && (
          <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-ink flex items-center justify-center">
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="2,6 5,9 10,3" />
            </svg>
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 py-2 bg-surface flex-1">
        {item.tag && (
          <div className="text-[9px] font-medium uppercase tracking-[0.07em] text-orange mb-1">
            {item.tag}
          </div>
        )}
        <div className="text-[12px] font-medium text-ink leading-snug line-clamp-2">{item.title}</div>
        {item.subtitle && (
          <div className="text-[10px] text-ink-faint mt-0.5 truncate">{item.subtitle}</div>
        )}
      </div>
    </button>
  );
}

/* ── Definizione widget ── */

export const carouselWidgetDef: WidgetDefinition<CarouselPayload> = {
  type: "carousel",
  schema: CarouselPayloadSchema,
  component: CarouselWidget,
  toolDescription: {
    description:
      "Mostra un carosello scorrevole di opzioni visuali (luoghi, alloggi, esperienze). " +
      "Usare quando le opzioni hanno un forte componente visivo o sono più di 3. " +
      "Supporta selezione singola (immediata) o multipla (con conferma).",
    parametersSchema: {
      type: "object",
      required: ["title", "items"],
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        multiSelect: { type: "boolean", description: "Permette selezione multipla" },
        confirmLabel: { type: "string" },
        items: {
          type: "array",
          minItems: 2,
          maxItems: 8,
          items: {
            type: "object",
            required: ["id", "title"],
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              subtitle: { type: "string" },
              imageUrl: { type: "string", format: "uri" },
              placeholderColor: { type: "string" },
              badge: { type: "string", description: "Es. '⭐ 4.8' o '€€€'" },
              tag: { type: "string" },
            },
          },
        },
      },
    },
  },
};
