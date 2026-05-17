"use client";

import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   DayViewModeToggle
   Segmented control: Lista ↔ Racconto
   The orange dot on "Racconto" signals AI-generated content.
───────────────────────────────────────────────────────────────── */

export type DayViewMode = "lista" | "racconto";

type Props = {
  value: DayViewMode;
  onChange: (v: DayViewMode) => void;
  className?: string;
};

export function DayViewModeToggle({ value, onChange, className }: Props) {
  return (
    <div
      className={cn("inline-flex rounded-[var(--radius-pill)] p-[3px] gap-[2px]", className)}
      style={{ background: "rgba(13,44,61,0.06)" }}
    >
      {(["lista", "racconto"] as DayViewMode[]).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={cn(
              "inline-flex items-center gap-[5px] px-[14px] py-[6px]",
              "rounded-[var(--radius-pill)] text-[12px] cursor-pointer",
              "border-0 font-[inherit] leading-none transition-colors duration-[120ms]",
              active
                ? "bg-white text-ink font-medium shadow-[0_0_0_0.5px_rgba(13,44,61,0.08)]"
                : "bg-transparent text-ink-soft hover:text-ink",
            )}
          >
            {mode === "lista" ? (
              "Lista"
            ) : (
              <>
                Racconto
                {/* Small orange dot: AI indicator */}
                <span
                  aria-label="AI"
                  className="w-[5px] h-[5px] rounded-full bg-orange inline-block shrink-0"
                />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
