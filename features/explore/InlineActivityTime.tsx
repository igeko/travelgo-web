"use client";

/**
 * features/explore/InlineActivityTime.tsx
 * ─────────────────────────────────────────────────────────────────
 * Widget self-contained "Arrivo / Partenza / Durata" — bundle delle
 * chip + riga durata + popover (TimePicker / DurationPicker) con
 * stato del picker e click-outside già gestiti internamente.
 *
 * Estratto da `ActivityStop` per essere riusato dal `FuzzyStop` (e da
 * altre call-site future) senza duplicare la macchina stati. L'API è
 * "data + callback di commit": il consumer passa i valori correnti e
 * tre handler di change; il widget gestisce il resto.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconClock } from "@/components/ui/icons";
import {
  ActivityTimeChips,
  type TimeChipData,
  type TimeField,
} from "@/features/activity/ActivityTimeChips";
import { ActivityTimePicker } from "@/features/activity/ActivityTimePicker";
import { ActivityDurationPicker } from "@/features/activity/ActivityDurationPicker";

export type ClockHM = { hour: number; minute: number };
type OpenPicker = "arrival" | "departure" | "duration" | null;

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function InlineActivityTime({
  arrivalHM,
  departureHM,
  arrivalDateLabel,
  departureDateLabel,
  durationMin,
  onArrivalChange,
  onDepartureChange,
  onDurationChange,
  className,
}: {
  arrivalHM?: ClockHM;
  departureHM?: ClockHM;
  arrivalDateLabel?: string;
  departureDateLabel?: string;
  durationMin?: number;
  onArrivalChange?: (hm: ClockHM) => void;
  onDepartureChange?: (hm: ClockHM) => void;
  onDurationChange?: (durationMin: number) => void;
  className?: string;
}) {
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);

  const arrival: TimeChipData = {
    field: "arrival",
    hour: arrivalHM?.hour ?? null,
    minute: arrivalHM?.minute ?? null,
    date: arrivalDateLabel,
  };
  const departure: TimeChipData = {
    field: "departure",
    hour: departureHM?.hour ?? null,
    minute: departureHM?.minute ?? null,
    date: departureDateLabel,
  };

  const togglePicker = (next: OpenPicker) =>
    setOpenPicker((c) => (c === next ? null : next));

  const onChipClick = (f: TimeField) => {
    if (f === "departure" && arrival.hour == null) {
      togglePicker("arrival");
      return;
    }
    togglePicker(f);
  };

  const blockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openPicker) return;
    function onPointerDown(e: PointerEvent) {
      const node = blockRef.current;
      if (!node || node.contains(e.target as Node)) return;
      setOpenPicker(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openPicker]);

  return (
    <div ref={blockRef} className={cn("relative flex w-full flex-col gap-2", className)}>
      <ActivityTimeChips
        arrival={arrival}
        departure={departure}
        activeField={openPicker === "arrival" || openPicker === "departure" ? openPicker : null}
        onChipClick={onChipClick}
      />

      {typeof durationMin === "number" && onDurationChange ? (
        <button
          type="button"
          onClick={() => togglePicker("duration")}
          className={cn(
            "flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-mini transition-colors",
            openPicker === "duration"
              ? "border-primary bg-primary-soft text-primary"
              : "border-transparent bg-surface-soft text-ink-soft hover:border-primary/40",
          )}
        >
          <IconClock size={12} aria-hidden />
          <span className="tracking-eyebrow uppercase text-micro text-ink-faint">Durata</span>
          <span className="font-semibold text-ink">{formatDuration(durationMin)}</span>
        </button>
      ) : null}

      {openPicker ? (
        <div
          className={cn(
            "absolute top-full z-dropdown mt-2",
            openPicker === "departure" ? "right-0" : "left-0",
          )}
        >
          {openPicker === "arrival" && onArrivalChange ? (
            <ActivityTimePicker
              field="arrival"
              hour={arrival.hour ?? 9}
              minute={arrival.minute ?? 0}
              onConfirm={(h, m) => {
                onArrivalChange({ hour: h, minute: m });
                setOpenPicker(null);
              }}
            />
          ) : null}
          {openPicker === "departure" && onDepartureChange ? (
            <ActivityTimePicker
              field="departure"
              hour={departure.hour ?? 10}
              minute={departure.minute ?? 0}
              onConfirm={(h, m) => {
                onDepartureChange({ hour: h, minute: m });
                setOpenPicker(null);
              }}
            />
          ) : null}
          {openPicker === "duration" && typeof durationMin === "number" && onDurationChange ? (
            <ActivityDurationPicker
              durationMin={durationMin}
              onConfirm={(min) => {
                onDurationChange(min);
                setOpenPicker(null);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
