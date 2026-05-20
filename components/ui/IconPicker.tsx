"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   IconPicker — griglia di icone selezionabili (controllato).
   Generico: passi le opzioni { key, label, Icon }.
───────────────────────────────────────────────────────────────── */

export type IconPickerOption = {
  key: string;
  label?: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
};

export function IconPicker({
  value,
  onChange,
  options,
  className,
}: {
  value: string | null;
  onChange: (key: string) => void;
  options: IconPickerOption[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid grid-cols-8 gap-1.5",
        className,
      )}
    >
      {options.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label ?? key}
            title={label ?? key}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center justify-center aspect-square rounded-md border transition-colors",
              "[&>svg]:size-[18px]",
              active
                ? "bg-ink text-white border-ink"
                : "bg-surface-soft text-ink-soft border-border hover:border-border-strong hover:text-ink",
            )}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
