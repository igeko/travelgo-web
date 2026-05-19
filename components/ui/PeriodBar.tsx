"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   PeriodBar · day-period segmented control (+ optional time picker)
   A pill split into N equal cells. Each cell shows a NAME and a
   secondary line (range "05–12" or, on the active cell, the picked
   time like "09:00").
   Controlled-only: parent owns `value` + `onChange`.

   Two modes:
   - Display-only (default): pass `activeTime` to show a string on the
     active cell. Clicking a cell just calls `onChange`.
   - Interactive picker: pass `time` + `onTimeChange`. Clicking the
     active cell toggles an hour/minute picker; the bar manages the
     open state and emits time changes. The active cell's time is
     derived from `time`.

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
   * In picker mode, filters the hour grid and clears the time when the
   * active hour falls outside a newly selected period.
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

/** Time value owned by the parent in picker mode. `undefined` = unset. */
export type PeriodTime = { hour: number | undefined; minute: number | undefined };

/** All selectable hours, ordered morning→night. Picker fallback when a period has no `hours`. */
const ALL_HOURS = [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4];
/** Selectable minutes in 5-minute steps. */
const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

const pad2 = (n: number) => String(n).padStart(2, "0");

export type PeriodBarSize = "default" | "slim";

/** Labels for the picker panel — defaults are English. */
export type PeriodBarPickerLabels = {
  hour: string;
  minutes: string;
  clearTime: string;
};

const DEFAULT_PICKER_LABELS: PeriodBarPickerLabels = {
  hour: "Hour",
  minutes: "Minutes",
  clearTime: "clear time",
};

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
   * Display-only time string (e.g. "09:00") shown on the ACTIVE cell in
   * place of its range. Ignored in picker mode (the bar derives it from `time`).
   */
  activeTime?: string;
  /**
   * Picker mode — current time owned by the parent. Pass alongside
   * `onTimeChange` to enable the hour/minute picker.
   */
  time?: PeriodTime;
  /**
   * Picker mode — called when the user picks/clears an hour or minute.
   * Presence of this callback switches the bar into interactive mode.
   */
  onTimeChange?: (time: PeriodTime) => void;
  /** Labels for the picker panel (picker mode). Defaults to English. */
  pickerLabels?: Partial<PeriodBarPickerLabels>;
  /** Accessible label for the segmented control. Default "Day period". */
  ariaLabel?: string;
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
  time,
  onTimeChange,
  pickerLabels,
  ariaLabel = "Day period",
  size = "slim",
  disabled,
  className,
}: PeriodBarProps) {
  const interactive = !!onTimeChange;
  const [pickerOpen, setPickerOpen] = useState(false);

  const hour = time?.hour;
  const minute = time?.minute;
  const hasTime = hour !== undefined && minute !== undefined;
  const shownTime = interactive
    ? (hasTime ? `${pad2(hour)}:${pad2(minute)}` : undefined)
    : activeTime;

  const labels = { ...DEFAULT_PICKER_LABELS, ...pickerLabels };
  const currentPeriodHours = periods.find((p) => p.id === value)?.hours ?? ALL_HOURS;

  function handleCellClick(id: string) {
    if (!interactive) {
      onChange(id);
      return;
    }
    if (id === value) {
      setPickerOpen((v) => !v);
      return;
    }
    onChange(id);
    setPickerOpen(true);
    // Clear a now-out-of-range hour when switching period.
    const newHours = periods.find((p) => p.id === id)?.hours;
    if (newHours && hour !== undefined && !newHours.includes(hour)) {
      onTimeChange?.({ hour: undefined, minute: undefined });
    }
  }

  const bar = (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
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
            onClick={() => handleCellClick(p.id)}
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
            {isActive && shownTime ? (
              <div
                className={cn(
                  "font-medium tabular-nums tracking-[-0.01em] leading-none",
                  TIME_SIZE[size],
                )}
              >
                {shownTime}
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

  if (!interactive) return bar;

  return (
    <div className="flex flex-col gap-2">
      {bar}
      {pickerOpen && (
        <div className="bg-surface border border-border rounded-[18px] p-3.5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-micro uppercase tracking-[0.05em] text-ink-faint text-center mb-2 font-medium">
                {labels.hour}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {currentPeriodHours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onTimeChange?.({ hour: h, minute })}
                    className={cn(
                      "text-center py-2 text-[14px] tabular-nums rounded-pill cursor-pointer select-none transition-colors font-sans",
                      h === hour ? "bg-orange text-white font-medium" : "text-ink hover:bg-surface-soft",
                    )}
                  >
                    {pad2(h)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-micro uppercase tracking-[0.05em] text-ink-faint text-center mb-2 font-medium">
                {labels.minutes}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onTimeChange?.({ hour, minute: m });
                      if (hour !== undefined) setPickerOpen(false);
                    }}
                    className={cn(
                      "text-center py-2 text-[14px] tabular-nums rounded-pill cursor-pointer select-none transition-colors font-sans",
                      m === minute ? "bg-orange text-white font-medium" : "text-ink hover:bg-surface-soft",
                    )}
                  >
                    {pad2(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {hasTime && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onTimeChange?.({ hour: undefined, minute: undefined });
                  setPickerOpen(false);
                }}
                className="text-tiny text-ink-soft underline underline-offset-2 decoration-ink/20 hover:text-danger-fg hover:decoration-danger-fg transition-colors"
              >
                {labels.clearTime}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
