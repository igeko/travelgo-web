/**
 * features/activity/ActivityDurationPicker.tsx
 * ─────────────────────────────────────────────────────────────────
 * Popover per impostare la durata di un'attività (NON accommodation)
 * — spec /design/activity-duration-picker. Range 15m → 18h.
 *
 * Output: minuti interi (`hours * 60 + minutes`). Il parent lo
 * scrive in `scheduled_activities.duration_min`.
 *
 * Stessa shell visiva del TimePicker (label + griglia + step + CTA)
 * per coerenza nel pannello Activity.
 *
 * Atomic level: organism.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

const MINUTE_STEPS = [0, 15, 30, 45] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0–23

function formatDuration(hours: number, minutes: number): string {
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

type Props = {
  /** Durata corrente in minuti. */
  durationMin: number;
  /** Callback con la nuova durata in minuti. */
  onConfirm: (durationMin: number) => void;
};

export function ActivityDurationPicker({ durationMin, onConfirm }: Props) {
  const [h, setH] = useState(Math.floor(durationMin / 60));
  const [m, setM] = useState<(typeof MINUTE_STEPS)[number]>(
    (MINUTE_STEPS.find((step) => step === durationMin % 60) ?? 0) as 0,
  );
  // Durata minima 0h 15m: quando ore=0, il bottone :00 è disabilitato e la
  // conferma a 0h 0m bloccata. Il prototipo usa la stessa regola.
  const isMinZero = h === 0 && m === 0;

  return (
    <div className="flex w-[220px] flex-col gap-3 rounded-md border border-border bg-white p-3 shadow-md">
      <span className="text-micro font-semibold tracking-eyebrow uppercase text-ink-faint">
        Durata
      </span>

      <div>
        <span className="mb-1 block text-micro tracking-eyebrow uppercase text-ink-faint">
          Ore
        </span>
        <div className="grid grid-cols-6 gap-[3px]">
          {HOURS.map((hh) => (
            <button
              key={hh}
              type="button"
              onClick={() => setH(hh)}
              className={cn(
                "rounded py-[5px] text-center text-mini transition-colors",
                hh === h
                  ? "bg-ink font-semibold text-white"
                  : "text-ink-soft hover:bg-surface-soft",
              )}
            >
              {hh}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-micro tracking-eyebrow uppercase text-ink-faint">
          Minuti
        </span>
        <div className="flex gap-1">
          {MINUTE_STEPS.map((mm) => {
            const disabled = h === 0 && mm === 0;
            return (
              <button
                key={mm}
                type="button"
                disabled={disabled}
                onClick={() => setM(mm)}
                className={cn(
                  "flex-1 rounded-md py-[5px] text-center text-mini transition-colors",
                  mm === m && !disabled
                    ? "bg-ink font-semibold text-white"
                    : "bg-surface-soft text-ink-soft hover:bg-surface",
                  disabled && "cursor-not-allowed opacity-30",
                )}
              >
                :{String(mm).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        variant="solid"
        tone="neutral"
        size="md"
        disabled={isMinZero}
        className="w-full"
        onClick={() => onConfirm(h * 60 + m)}
      >
        Conferma · {formatDuration(h, m)}
      </Button>
    </div>
  );
}
