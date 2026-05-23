"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconClock } from "./icons";

/* ─────────────────────────────────────────────────────────────────
   TimeField · compact time picker (HH:MM).
   A soft pill trigger that opens an hour/minute grid popover — same
   visual language as PeriodBar's time picker.

   Controlled-only: parent owns `value` ("HH:MM" or null) + `onChange`.
───────────────────────────────────────────────────────────────── */

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,…,55

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parse(value: string | null): { hour?: number; minute?: number } {
  if (!value) return {};
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return {};
  return { hour: h, minute: m };
}

export type TimeFieldLabels = {
  hour: string;
  minutes: string;
  clear: string;
};

const DEFAULT_LABELS: TimeFieldLabels = {
  hour: "Hour",
  minutes: "Minutes",
  clear: "clear time",
};

export type TimeFieldProps = {
  /** Current time as "HH:MM", or null when unset. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Labels for the picker panel. Defaults to English. */
  labels?: Partial<TimeFieldLabels>;
};

export function TimeField({
  value,
  onChange,
  placeholder = "--:--",
  disabled,
  className,
  labels,
}: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { hour, minute } = parse(value);
  const l = { ...DEFAULT_LABELS, ...labels };

  function toggleOpen() {
    if (!open) {
      // Flip upward when there isn't enough room below (e.g. last row of a
      // long form): the popover is ~280px tall.
      const rect = triggerRef.current?.getBoundingClientRect();
      setOpenUp(!!rect && window.innerHeight - rect.bottom < 280);
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function emit(h: number | undefined, m: number | undefined) {
    if (h === undefined && m === undefined) { onChange(null); return; }
    onChange(`${pad2(h ?? 0)}:${pad2(m ?? 0)}`);
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border transition-colors font-sans",
          "bg-surface-input text-ink",
          open ? "border-orange bg-surface" : "border-border hover:border-border-strong",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        <IconClock className={cn("size-3.5 shrink-0", value ? "text-orange" : "text-ink-faint")} />
        <span className={cn("text-tiny font-medium tabular-nums", value ? "text-ink" : "text-ink-faint")}>
          {value ?? placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          className={cn(
            "absolute z-dropdown left-0 bg-surface border border-border rounded-[18px] p-3.5 flex flex-col gap-3 shadow-[0_4px_24px_rgba(13,44,61,0.10)] w-[260px]",
            openUp ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
          )}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-micro uppercase tracking-[0.05em] text-ink-faint text-center mb-2 font-medium">{l.hour}</div>
              <div className="grid grid-cols-4 gap-1 max-h-[148px] overflow-y-auto scrollbar-thin">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => emit(h, minute)}
                    className={cn(
                      "text-center py-1.5 text-[14px] tabular-nums rounded-pill cursor-pointer select-none transition-colors font-sans",
                      h === hour ? "bg-orange text-white font-medium" : "text-ink hover:bg-surface-soft",
                    )}
                  >
                    {pad2(h)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-micro uppercase tracking-[0.05em] text-ink-faint text-center mb-2 font-medium">{l.minutes}</div>
              <div className="grid grid-cols-4 gap-1">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      emit(hour, m);
                      if (hour !== undefined) setOpen(false);
                    }}
                    className={cn(
                      "text-center py-1.5 text-[14px] tabular-nums rounded-pill cursor-pointer select-none transition-colors font-sans",
                      m === minute ? "bg-orange text-white font-medium" : "text-ink hover:bg-surface-soft",
                    )}
                  >
                    {pad2(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {value && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); }}
                className="text-tiny text-ink-soft underline underline-offset-2 decoration-ink/20 hover:text-danger-fg hover:decoration-danger-fg transition-colors"
              >
                {l.clear}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
