"use client";

/**
 * features/explore/SegmentToggle.tsx
 * ─────────────────────────────────────────────────────────────────
 * Figma "Switch" (SwitcherV2) — segmented icon+label toggle.
 *
 * A pill track (bg-bg) holding N equal-width segments; the active one
 * lifts to a white surface. Built generic (icon + label per option) so
 * the Explore cards can drive it for Sleep/Stop, but it carries no
 * domain logic — pure controlled presentational primitive.
 *
 * Differs from components/ui/TabSwitcher (dark-filled active, no icons):
 * here the active segment is white-on-beige with an icon, matching the
 * Explore redesign. Kept in features/explore for now; promote to
 * components/ui/ if it proves reusable beyond the redesign.
 *
 * Atomic level: atom.
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

export type SegmentOption<T extends string> = {
  key: T;
  label: string;
  /** Optional leading icon (a Tabler icon component from @/components/ui/icons). */
  icon?: ComponentType<{ size?: number; className?: string }>;
};

export type SegmentToggleProps<T extends string> = {
  /** Currently selected segment key. */
  value: T;
  onChange: (key: T) => void;
  options: SegmentOption<T>[];
  /** Accessible group label (for screen readers). */
  ariaLabel?: string;
  className?: string;
};

export function SegmentToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full items-center gap-0.5 rounded-pill bg-bg p-0.5 select-none",
        className,
      )}
    >
      {options.map(({ key, label, icon: Icon }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={cn(
              "flex h-6 flex-1 items-center justify-center gap-1.5 rounded-pill px-2",
              "text-micro transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink",
              active
                ? "bg-surface text-ink shadow-sm"
                : "bg-transparent text-ink-soft hover:bg-surface/60",
            )}
          >
            {Icon ? <Icon size={12} className="shrink-0" /> : null}
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
