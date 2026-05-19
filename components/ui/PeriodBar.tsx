"use client";

import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   PeriodBar · day-period segmented control
   A pill split into N equal cells. Each cell shows a NAME and a
   secondary line (range "05–12" or, on the active cell, an optional
   activeTime like "09:00").
   Controlled-only: parent owns `value` + `onChange`.

   Two sizes (from the original design):
   - "slim" (default) — compact, used inside the activity edit form
   - "default" — roomier, for standalone day-level selectors
───────────────────────────────────────────────────────────────── */

export type Period = {
  /** Stable id used by `value`/`onChange` (e.g. "morning") */
  id: string;
  /** Display label, uppercase by convention (e.g. "MORNING") */
  name: string;
  /** Hour range shown on inactive cells (e.g. "05–12") */
  range: string;
  /**
   * Hours that belong to this period (0–23).
   * Used by ActivityEditForm to filter the hour picker.
   * Optional — PeriodBar itself does not use this field.
   */
  hours?: number[];
};

/** Default 4-period set, English labels */
export const DEFAULT_PERIODS: Period[] = [
  { id: "morning",   name: "MORNING",   range: "05–12", hours: [5,6,7,8,9,10,11] },
  { id: "afternoon", name: "AFTERNOON", range: "12–18", hours: [12,13,14,15,16,17] },
  { id: "evening",   name: "EVENING",   range: "18–22", hours: [18,19,20,21] },
  { id: "night",     name: "NIGHT",     range: "22–05", hours: [22,23,0,1,2,3,4] },
];

export type PeriodBarSize = "default" | "slim";

export type PeriodBarProps = {
  /** Currently selected period id */
  value: string;
  /** Called when the user picks a different period */
  onChange: (id: string) => void;
  /**
   * Available periods (left to right). Defaults to morning/afternoon/evening/night.
   * Width adapts via 1fr per cell, so adding/removing periods just rebalances them.
   */
  periods?: Period[];
  /**
   * Optional time string (e.g. "09:00") shown on the ACTIVE cell in place
   * of its range. Useful when the user has picked a specific hour.
   */
  activeTime?: string;
  /** Visual size · default "slim" */
  size?: PeriodBarSize;
  /** Disables the entire bar */
  disabled?: boolean;
  className?: string;
};

/* ─────────────────────────────────────────────────────────────────
   Size-driven class maps (mirror the original CSS exactly)
───────────────────────────────────────────────────────────────── */

const BAR_SIZE = {
  default: "p-1 gap-1",
  slim: "p-0.5 gap-0.5",
} satisfies Record<PeriodBarSize, string>;

const CELL_SIZE = {
  default: "px-1 py-[9px]",
  slim: "px-1 py-[5px]",
} satisfies Record<PeriodBarSize, string>;

const NAME_SIZE = {
  default: "text-tiny",
  slim: "text-micro",
} satisfies Record<PeriodBarSize, string>;

const RANGE_MARGIN = {
  default: "mt-0.5",
  slim: "mt-px",
} satisfies Record<PeriodBarSize, string>;

const TIME_SIZE = {
  default: "text-lg mt-1",
  slim: "text-meta mt-px",
} satisfies Record<PeriodBarSize, string>;

export function PeriodBar({
  value,
  onChange,
  periods = DEFAULT_PERIODS,
  activeTime,
  size = "slim",
  disabled,
  className,
}: PeriodBarProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Day period"
      className={cn(
        "grid bg-surface border border-border rounded-pill",
        BAR_SIZE[size],
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${periods.length}, 1fr)` }}
    >
      {periods.map((p) => {
        const isActive = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(p.id)}
            className={cn(
              "text-center rounded-pill cursor-pointer select-none transition-colors font-sans",
              CELL_SIZE[size],
              isActive
                ? "bg-ink text-white"
                : "text-ink hover:bg-surface-soft",
            )}
          >
            <div
              className={cn(
                "font-medium uppercase tracking-[0.08em]",
                NAME_SIZE[size],
              )}
            >
              {p.name}
            </div>
            {isActive && activeTime ? (
              <div
                className={cn(
                  "font-medium tabular-nums tracking-[-0.01em] leading-none",
                  TIME_SIZE[size],
                )}
              >
                {activeTime}
              </div>
            ) : (
              <div
                className={cn(
                  "text-[9px] tabular-nums tracking-meta",
                  RANGE_MARGIN[size],
                  isActive ? "text-white/55" : "text-ink-faint",
                )}
              >
                {p.range}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
