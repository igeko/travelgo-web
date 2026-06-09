/**
 * features/activity/ActivityTimePicker.tsx
 * ─────────────────────────────────────────────────────────────────
 * Popover per modificare arrivo o partenza di un'attività — spec
 * /design/activity-time-picker. Griglia ore 06–23 + step minuti
 * fissi (:00 :15 :30 :45) + bottone Conferma.
 *
 * Stato locale: hour / minute. Vengono propagati al parent solo al
 * click su Conferma — il parent decide se tradurli in `time` (per
 * arrivo) o in `duration_min` (per partenza dell'activity).
 *
 * Posizionamento: floating absolute owned dal parent. Il componente
 * disegna solo la "card". Il parent gestisce anche la chiusura
 * (Esc / click outside / Conferma).
 *
 * Atomic level: organism.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { TimeField } from "./ActivityTimeChips";

const MINUTE_STEPS = [0, 15, 30, 45] as const;
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06–23

type Props = {
  field: TimeField;
  hour: number;
  minute: number;
  onConfirm: (hour: number, minute: number) => void;
};

export function ActivityTimePicker({ field, hour, minute, onConfirm }: Props) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState<(typeof MINUTE_STEPS)[number]>(
    (MINUTE_STEPS.find((step) => step === minute) ?? 0) as 0,
  );
  const label = field === "arrival" ? "Ora di arrivo" : "Ora di partenza";

  return (
    <div className="flex w-[220px] flex-col gap-3 rounded-md border border-border bg-white p-3 shadow-md">
      <span className="text-micro font-semibold tracking-eyebrow uppercase text-ink-faint">
        {label}
      </span>

      {/* Griglia ore */}
      <div>
        <span className="mb-1 block text-micro tracking-eyebrow uppercase text-ink-faint">
          Ora
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
              {String(hh).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>

      {/* Step minuti */}
      <div>
        <span className="mb-1 block text-micro tracking-eyebrow uppercase text-ink-faint">
          Minuti
        </span>
        <div className="flex gap-1">
          {MINUTE_STEPS.map((mm) => (
            <button
              key={mm}
              type="button"
              onClick={() => setM(mm)}
              className={cn(
                "flex-1 rounded-md py-[5px] text-center text-mini transition-colors",
                mm === m
                  ? "bg-ink font-semibold text-white"
                  : "bg-surface-soft text-ink-soft hover:bg-surface",
              )}
            >
              :{String(mm).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="solid"
        tone="neutral"
        size="md"
        className="w-full"
        onClick={() => onConfirm(h, m)}
      >
        Conferma
      </Button>
    </div>
  );
}
