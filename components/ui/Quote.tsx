"use client";

import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   Quote · blockquote component with optional secondary note.

   Matches the `.day-incipit` pattern from the design system:
   - 3px orange left border
   - Serif italic lead text
   - Optional smaller note below

   Usage:
     <Quote lead="Una giornata di passeggiate..." />
     <Quote lead="Una giornata di passeggiate..." note="Scarpe comode." />
     <Quote lead="..." accent="lime" size="sm" />
─────────────────────────────────────────────────────────────────── */

export type QuoteAccent = "orange" | "lime" | "ink";
export type QuoteSize   = "sm" | "md" | "lg";

export type QuoteProps = {
  /** Main quote text — rendered in serif italic */
  lead: string;
  /** Optional secondary line (practical note, attribution, etc.) */
  note?: string;
  /** Border accent color. Defaults to "orange" */
  accent?: QuoteAccent;
  /** Text size preset. Defaults to "md" */
  size?: QuoteSize;
  className?: string;
};

const ACCENT_BORDER: Record<QuoteAccent, string> = {
  orange: "border-orange",
  lime:   "border-lime",
  ink:    "border-ink",
};

const LEAD_SIZE: Record<QuoteSize, string> = {
  sm: "text-[15px]",
  md: "text-[18px]",
  lg: "text-[22px]",
};

const NOTE_SIZE: Record<QuoteSize, string> = {
  sm: "text-[11px]",
  md: "text-[12px]",
  lg: "text-[13px]",
};

export function Quote({
  lead,
  note,
  accent = "orange",
  size = "md",
  className,
}: QuoteProps) {
  return (
    <blockquote
      className={cn(
        "pl-[14px] border-l-[3px]",
        ACCENT_BORDER[accent],
        className,
      )}
    >
      <p
        className={cn(
          "font-serif italic leading-[1.45] text-ink",
          LEAD_SIZE[size],
        )}
      >
        {lead}
      </p>
      {note && (
        <p className={cn("mt-2 text-ink-soft leading-snug", NOTE_SIZE[size])}>
          {note}
        </p>
      )}
    </blockquote>
  );
}
