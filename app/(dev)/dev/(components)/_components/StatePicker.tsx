"use client";

/**
 * Sandbox helper · StatePicker
 * A small pill row to force a component into one of its states while
 * testing it in isolation. Sandbox-only — not part of the design system.
 */

import { cn } from "@/lib/cn";

export function StatePicker<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {label ? (
        <span className="text-micro uppercase tracking-eyebrow text-ink-faint">{label}</span>
      ) : null}
      <div className="inline-flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "rounded-pill border px-3 py-1 text-mini capitalize transition-colors",
              value === o
                ? "border-ink bg-ink text-white"
                : "border-border-strong bg-surface text-ink hover:bg-surface-soft",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
