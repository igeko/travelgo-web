"use client";

/**
 * Widget: suggestions
 *
 * Lista di suggerimenti espandibili. Ogni item può essere aperto per
 * vedere il dettaglio completo: prosa Go, fatti chiave, galleria, CTA.
 * Design fedele ad ai_suggest.html:
 *   - grid 56px thumb | info | distanza | chevron
 *   - item aperto → bordino arancione + altri item "raffreddati"
 *   - pannello dettaglio: prosa, bullets, facts, gallery 4/3 + 3 thumb
 *   - footer: Mappa · Wishlist · Aggiungi al giorno
 */

import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import type { WidgetDefinition } from "../widget-registry";
import type { GoActionHandlers } from "../types";

/* ── Schema ── */

export const SuggestionFactSchema = z.object({
  icon: z.string().optional(), // es. "clock", "coin", "walk", "map-pin"
  label: z.string(),
});

export const SuggestionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Breve sottotitolo (quartiere, tipologia…) */
  subtitle: z.string().optional(),
  /** Tag categoria: es. "Caffè · Libreria", "Ristorante", "Museo" */
  tag: z.string().optional(),
  /** Emoji opzionale (alternativa al thumb color) */
  emoji: z.string().optional(),
  /** Colore CSS del placeholder thumb (es. "#a8b8a0") */
  placeholderColor: z.string().optional(),
  /** Distanza testuale: es. "480 m", "12 min" */
  distance: z.string().optional(),
  /** Prosa Go: "perché ti consiglio questo posto" (serif italic) */
  description: z.string().optional(),
  /** Bullets "cosa aspettarsi" */
  bullets: z.array(z.string()).optional(),
  /** Fatti chiave: orari, costo, fatica */
  facts: z.array(SuggestionFactSchema).optional(),
});

export const SuggestionsPayloadSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  items: z.array(SuggestionItemSchema).min(1).max(6),
  primaryAction: z.enum(["add_to_day", "add_to_wishlist", "select"]).default("add_to_wishlist"),
});

export type SuggestionsPayload = z.infer<typeof SuggestionsPayloadSchema>;
export type SuggestionItem = z.infer<typeof SuggestionItemSchema>;
export type SuggestionFact = z.infer<typeof SuggestionFactSchema>;

/* ── Icone inline (niente dipendenze esterne) ── */

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={cn("w-3.5 h-3.5 transition-transform duration-200", open && "rotate-180")}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M10 2l4 2v10l-4-2-4 2-4-2V2l4 2 4-2z" />
      <path d="M6 4v10M10 2v10" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4 2h8a1 1 0 011 1v11l-5-3-5 3V3a1 1 0 011-1z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 14 14" className="w-3 h-3" fill="currentColor">
      <path d="M7 0 L8.2 5.1 L13 7 L8.2 8.9 L7 14 L5.8 8.9 L1 7 L5.8 5.1 Z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 14 14" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="3" cy="3" r="2" />
      <circle cx="11" cy="11" r="2" />
      <path d="M3 5v4a2 2 0 002 2h4" />
    </svg>
  );
}

/* ── Componente principale ── */

function SuggestionsWidget({
  title,
  subtitle,
  items,
  primaryAction,
  onAction,
  onDismiss,
}: SuggestionsPayload & GoActionHandlers) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  const actionLabel =
    primaryAction === "add_to_day" ? "Aggiungi al giorno" :
    primaryAction === "add_to_wishlist" ? "Salva" :
    "Seleziona";

  return (
    <div className="flex flex-col">
      {/* Header risultati */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border"
        style={{ borderBottom: "0.5px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-orange">
            <SparkleIcon />
          </span>
          <span className="text-tiny font-medium uppercase tracking-[0.1em] text-orange">
            {title}
          </span>
          {subtitle && (
            <span className="text-mini text-ink-faint">{subtitle}</span>
          )}
        </div>
        <span className="text-tiny font-serif italic text-ink-faint hidden sm:block">
          Tocca per il dettaglio
        </span>
      </div>

      {/* Lista item */}
      <div className="flex flex-col">
        {items.map((item) => {
          const isOpen = openId === item.id;
          const isCool = openId !== null && openId !== item.id;

          return (
            <div
              key={item.id}
              className={cn(
                "transition-opacity duration-200",
                isCool && "opacity-40 pointer-events-none",
                isOpen && "ring-[1.5px] ring-inset ring-orange",
              )}
              style={{ borderBottom: "0.5px solid var(--color-border)" }}
            >
              {/* Row collapsed */}
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  "w-full grid gap-3 px-4 py-3 text-left transition-colors",
                  "grid-cols-[56px_1fr_auto_auto] items-center",
                  isOpen ? "bg-surface" : "bg-surface hover:bg-surface-soft",
                )}
                style={{ borderBottom: isOpen ? "0.5px solid var(--color-border)" : undefined }}
              >
                {/* Thumb */}
                <div
                  className="w-14 h-14 rounded-lg shrink-0"
                  style={{
                    background: item.emoji
                      ? undefined
                      : `linear-gradient(135deg, ${item.placeholderColor ?? "#c5b0a0"}, ${darken(item.placeholderColor ?? "#c5b0a0")})`,
                  }}
                >
                  {item.emoji && (
                    <div className="w-full h-full flex items-center justify-center text-[26px] leading-none">
                      {item.emoji}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {item.tag && (
                      <span className={cn(
                        "text-micro font-medium uppercase tracking-eyebrow",
                        isOpen ? "text-orange-deep" : "text-orange",
                      )}>
                        {item.tag}
                      </span>
                    )}
                    {item.subtitle && (
                      <span className="text-micro text-ink-faint">· {item.subtitle}</span>
                    )}
                  </div>
                  <div className="text-[14px] font-medium text-ink truncate">{item.title}</div>
                  {item.description && !isOpen && (
                    <div className="text-mini text-ink-soft truncate mt-0.5">{item.description}</div>
                  )}
                </div>

                {/* Distanza */}
                {item.distance && (
                  <span className="flex items-center gap-1 text-tiny text-ink-soft whitespace-nowrap shrink-0">
                    <span className="text-orange"><RouteIcon /></span>
                    {item.distance}
                  </span>
                )}

                {/* Chevron */}
                <span className={cn("text-ink-faint shrink-0", isOpen && "text-orange")}>
                  <ChevronIcon open={isOpen} />
                </span>
              </button>

              {/* Pannello dettaglio espanso */}
              {isOpen && (
                <ItemDetail
                  item={item}
                  primaryAction={primaryAction}
                  actionLabel={actionLabel}
                  onAction={onAction}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex justify-between items-center">
        <span className="text-tiny font-serif italic text-ink-faint">
          Nessuna ti convince?
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-tiny text-ink-soft underline decoration-ink/20 hover:text-ink transition-colors"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}

/* ── Pannello dettaglio ── */

function ItemDetail({
  item,
  primaryAction,
  actionLabel,
  onAction,
}: {
  item: SuggestionItem;
  primaryAction: SuggestionsPayload["primaryAction"];
  actionLabel: string;
  onAction: GoActionHandlers["onAction"];
}) {
  function handlePrimary() {
    if (primaryAction === "add_to_day") {
      onAction({ kind: "add_to_day", itemId: item.id, label: item.title, dayNumber: 0 });
    } else if (primaryAction === "add_to_wishlist") {
      onAction({ kind: "add_to_wishlist", itemId: item.id, label: item.title });
    } else {
      onAction({ kind: "select", itemId: item.id, label: item.title });
    }
  }

  // Genera thumbnail colors derivati dal placeholder
  const base = item.placeholderColor ?? "#c5b0a0";
  const thumbColors = [
    ["#a8b8a0", "#7d9176"],
    ["#b5c5d5", "#7a8c9d"],
    ["#d5c5a8", "#a08a65"],
  ];

  return (
    <div
      className="px-4 pb-4 bg-surface"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Grid: testo | gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4 pt-3.5">

        {/* Colonna testo */}
        <div>
          {/* Section label con avatar */}
          <div className="flex items-center gap-2 mb-2">
            <GoAvatar size="xs" />
            <span className="text-micro font-medium uppercase tracking-[0.08em] text-orange">
              Go ti spiega perché
            </span>
          </div>

          {/* Prosa */}
          {item.description ? (
            <p className="font-serif italic text-[14px] leading-[1.55] text-ink mb-3">
              {item.description}
            </p>
          ) : (
            <p className="font-serif italic text-[14px] leading-[1.55] text-ink-soft mb-3">
              Un posto che si abbina bene al tuo stile di viaggio.
            </p>
          )}

          {/* Bullets */}
          {item.bullets && item.bullets.length > 0 && (
            <>
              <div className="text-micro font-medium uppercase tracking-[0.08em] text-ink-soft mb-1.5">
                Cosa aspettarsi
              </div>
              <ul className="list-disc list-inside mb-3 flex flex-col gap-1">
                {item.bullets.map((b, i) => (
                  <li key={i} className="text-meta text-ink leading-[1.6]">{b}</li>
                ))}
              </ul>
            </>
          )}

          {/* Facts */}
          {item.facts && item.facts.length > 0 && (
            <div
              className="flex gap-3 flex-wrap px-3 py-2.5 rounded-xl text-mini text-ink-soft"
              style={{
                background: "var(--color-surface-soft)",
                border: "0.5px solid var(--color-border)",
              }}
            >
              {item.facts.map((f, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-orange text-meta">{factEmoji(f.icon)}</span>
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Gallery */}
        <div className="flex flex-col gap-2 sm:order-none -order-1">
          {/* Hero */}
          <div
            className="w-full rounded-xl"
            style={{
              aspectRatio: "4/3",
              background: `linear-gradient(135deg, ${base}, ${darken(base)})`,
            }}
          >
            {item.emoji && (
              <div className="w-full h-full flex items-center justify-center text-5xl">
                {item.emoji}
              </div>
            )}
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2">
            {thumbColors.map(([c1, c2], i) => (
              <div
                key={i}
                className="flex-1 rounded-lg"
                style={{
                  aspectRatio: "1",
                  background: `linear-gradient(135deg, ${c1}, ${c2})`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div
        className="flex items-center justify-between flex-wrap gap-2 mt-3.5 pt-3.5"
        style={{ borderTop: "1px dashed var(--color-border)" }}
      >
        <span className="text-tiny text-ink-faint font-serif italic">
          Ti ispira?
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mappa */}
          <button
            type="button"
            onClick={() => onAction({ kind: "select", itemId: item.id, label: `map:${item.id}` })}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border transition-colors",
              "text-tiny font-medium text-ink border-border-strong bg-surface hover:bg-surface-soft",
            )}
          >
            <MapIcon /> Mappa
          </button>

          {/* Wishlist */}
          <button
            type="button"
            onClick={() => onAction({ kind: "add_to_wishlist", itemId: item.id, label: item.title })}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border transition-colors",
              "text-tiny font-medium text-ink border-border-strong bg-surface hover:bg-surface-soft",
            )}
          >
            <BookmarkIcon /> Wishlist
          </button>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={handlePrimary}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border transition-colors",
              "text-tiny font-medium text-white border-ink bg-ink hover:bg-ink-hover",
            )}
          >
            <PlusIcon /> {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

/** Scurisce leggermente un colore hex per il gradiente */
function darken(hex: string): string {
  try {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - 50);
    const g = Math.max(0, ((n >> 8) & 0xff) - 50);
    const b = Math.max(0, (n & 0xff) - 50);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return "#888888";
  }
}

/** Converte il nome icon in emoji per i fatti chiave */
function factEmoji(icon?: string): string {
  switch (icon) {
    case "clock":   return "🕐";
    case "coin":    return "💰";
    case "walk":    return "🚶";
    case "map-pin": return "📍";
    case "train":   return "🚆";
    case "star":    return "⭐";
    default:        return "•";
  }
}

/* ── Definizione widget ── */

export const suggestionsWidgetDef: WidgetDefinition<SuggestionsPayload> = {
  type: "suggestions",
  schema: SuggestionsPayloadSchema,
  component: SuggestionsWidget,
  toolDescription: {
    description:
      "Lista espandibile di suggerimenti (luoghi, attività, ristoranti). " +
      "Ogni item può avere descrizione, bullets, fatti chiave (orari, costo, fatica) e distanza. " +
      "Usare quando l'utente cerca idee concrete da aggiungere al giorno o alla wishlist.",
    parametersSchema: {
      type: "object",
      required: ["title", "items"],
      properties: {
        title: { type: "string", description: "Titolo del gruppo (es. 'Food spot · Tokyo')" },
        subtitle: { type: "string", description: "Sottotitolo contestuale" },
        primaryAction: {
          type: "string",
          enum: ["add_to_day", "add_to_wishlist", "select"],
          description: "Azione primaria per ogni item",
        },
        items: {
          type: "array",
          minItems: 1,
          maxItems: 6,
          items: {
            type: "object",
            required: ["id", "title"],
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              subtitle: { type: "string", description: "Quartiere o breve info (es. 'Shinjuku · aperto 24h')" },
              tag: { type: "string", description: "Categoria (es. 'Caffè · Libreria')" },
              emoji: { type: "string", description: "Emoji rappresentativa" },
              placeholderColor: { type: "string", description: "Hex del colore placeholder thumb" },
              distance: { type: "string", description: "Distanza testuale (es. '480 m')" },
              description: {
                type: "string",
                description: "Prosa Go — perché è consigliato, 1-2 frasi in stile serif/italico",
              },
              bullets: {
                type: "array",
                items: { type: "string" },
                description: "Lista 'cosa aspettarsi' (max 3-4 voci)",
              },
              facts: {
                type: "array",
                items: {
                  type: "object",
                  required: ["label"],
                  properties: {
                    icon: { type: "string", enum: ["clock", "coin", "walk", "map-pin", "train", "star"] },
                    label: { type: "string", description: "Es. '11:00–20:00', '¥1500', 'Bassa fatica'" },
                  },
                },
                description: "Fatti chiave: orari, costo, fatica fisica",
              },
            },
          },
        },
      },
    },
  },
};
