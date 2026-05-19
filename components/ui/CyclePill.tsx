"use client";

import { IconChevronDown } from "./icons";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   CyclePill · ink-filled pill that cycles through a configurable
   list of options on click. Each option carries a colored dot, a
   label, and an opaque value of any shape.

   Typical use: activity booking status (none / to book / booked / paid),
   but generic enough for any short cyclic selector.

   Controlled-only: parent owns `value` + `onChange`. The component
   computes the next option on click and notifies via onChange.
───────────────────────────────────────────────────────────────── */

export type CycleOption<T> = {
  /** Opaque value carried by this option (can be string, number, null…) */
  value: T;
  /** Display label */
  label: string;
  /** Dot color · any CSS color (token via var(...) or literal hex) */
  dotColor: string;
};

export type CyclePillProps<T> = {
  /** Currently selected value */
  value: T;
  /** Called with the next option's value when clicked */
  onChange: (value: T) => void;
  /**
   * Options to cycle through. The first entry is conventionally the
   * "unselected" state but it's just an array — order defines the cycle.
   * Must contain at least one entry.
   */
  options: CycleOption<T>[];
  /** Disables interaction */
  disabled?: boolean;
  /** Extra classes on the pill */
  className?: string;
};

export function CyclePill<T>({
  value,
  onChange,
  options,
  disabled,
  className,
}: CyclePillProps<T>) {
  if (options.length === 0) return null;

  // Resolve current option (fallback to first if value not found)
  const currentIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[currentIndex];

  const handleClick = () => {
    if (disabled || options.length <= 1) return;
    const next = options[(currentIndex + 1) % options.length];
    onChange(next.value);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || options.length <= 1}
      aria-label={`Cycle option (current: ${current.label})`}
      title={
        options.length > 1
          ? `Click to cycle (current: ${current.label})`
          : current.label
      }
      className={cn(
        // Pill base
        "inline-flex items-center gap-1.5 h-9 px-3 pr-3",
        "bg-ink text-white border-0 rounded-pill font-sans",
        "transition-opacity",
        options.length > 1
          ? "cursor-pointer hover:opacity-90"
          : "cursor-default",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      {/* Colored dot */}
      <span
        aria-hidden
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ backgroundColor: current.dotColor }}
      />
      {/* Label */}
      <span className="text-tiny font-medium tracking-[0.02em]">
        {current.label}
      </span>
      {/* Chevron · only when there's something to cycle */}
      {options.length > 1 && (
        <IconChevronDown className="w-3 h-3 opacity-60 shrink-0" />
      )}
    </button>
  );
}
