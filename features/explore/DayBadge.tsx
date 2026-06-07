"use client";

/**
 * features/explore/DayBadge.tsx
 * ─────────────────────────────────────────────────────────────────
 * The coloured weekday/date cap that tops a day spine in the Explore
 * Timeline. Single source of truth for the day marker.
 *
 * Atomic level: atom.
 *
 * Allineato alla spec /design/day-rail-states:
 * - badge neutro (bg-surface-soft) per default, ink in stato selected,
 *   danger-bg in overflow — niente più "primary orange" hard-coded;
 * - barra superiore di 4 px = **fill bar semantica** (verde < 80 %,
 *   amber ≥ 80 %, rosso se overflow).
 *
 * La barretta `isFirst` (doppia barretta ink/15 sopra) sostituisce
 * l'ex `tone="ink"` come terminatore visivo del primo giorno della colonna.
 * Il terminatore inferiore (isLast) non sta qui: nell'Explore Timeline il
 * rail grigio continua sotto il DayBadge per tutta l'altezza del giorno,
 * quindi la doppia barretta inferiore va resa alla fine della colonna nel
 * componente parent (Timeline.tsx).
 * ─────────────────────────────────────────────────────────────────
 */

import { cn } from "@/lib/cn";

export type DayBadgeProps = {
  weekday: string;
  date: string;
  /**
   * Riempimento del giorno (0–100). Pilota il colore della fill bar:
   * < 80 % → ok-green, ≥ 80 % → warning-amber. Undefined → fill bar in
   * stato neutro (track grigia senza fill).
   */
  fillPct?: number;
  /** Forza fill bar piena rossa e badge bg-danger-bg. */
  overflow?: boolean;
  /** Giorno in focus (timeline expanded): badge bg-ink, testo bianco. */
  selected?: boolean;
  /** Primo giorno della colonna: doppia barretta superiore + top quadrato. */
  isFirst?: boolean;
  className?: string;
};

function fillBarColor(fillPct: number, overflow: boolean): string {
  if (overflow) return "bg-danger-fg";
  if (fillPct >= 80) return "bg-warning-fg";
  return "bg-ok-fg";
}

function FillBar({ fillPct, overflow }: { fillPct: number; overflow: boolean }) {
  const effective = overflow ? 100 : Math.max(0, Math.min(100, fillPct));
  return (
    <div className="h-1 w-full overflow-hidden bg-surface-soft">
      <div
        className={cn("h-full", fillBarColor(fillPct, overflow))}
        style={{ width: `${effective}%` }}
      />
    </div>
  );
}

export function DayBadge({
  weekday,
  date,
  fillPct,
  overflow = false,
  selected = false,
  isFirst = false,
  className,
}: DayBadgeProps) {
  // Overflow batte selected sul badge bg: il rosso è il segnale di rischio
  // e deve restare visibile anche col giorno in focus.
  const badgeBg =
    overflow ? "bg-danger-bg border border-danger-border" :
    selected ? "bg-ink" :
    "bg-surface-soft";

  const weekdayColor =
    overflow ? "text-danger-fg" :
    selected ? "text-white/50" :
    "text-ink/40";
  const dateColor =
    overflow ? "text-danger-fg" :
    selected ? "text-white" :
    "text-ink";

  const badgeRadius = isFirst ? "rounded-t-none rounded-b-xs" : "rounded-xs";
  const effectivePct = fillPct ?? 0;

  return (
    <div className={cn("flex shrink-0 flex-col", className)}>
      {isFirst && (
        <>
          <div className="h-1 w-full bg-ink/15" />
          <div className="h-0.5" />
        </>
      )}

      <FillBar fillPct={effectivePct} overflow={overflow} />
      <div className="h-[3px]" />

      <div
        className={cn(
          "flex aspect-square w-full flex-col items-center justify-center text-center",
          badgeBg,
          badgeRadius,
        )}
      >
        <span className={cn("text-micro font-extrabold leading-tight", weekdayColor)}>
          {weekday}
        </span>
        <span className={cn("text-micro leading-tight", dateColor)}>{date}</span>
      </div>
    </div>
  );
}
