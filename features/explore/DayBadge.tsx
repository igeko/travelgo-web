"use client";

/**
 * features/explore/DayBadge.tsx
 * ─────────────────────────────────────────────────────────────────
 * The coloured weekday/date cap that tops a day spine in the Explore
 * Timeline. Single source of truth for the day marker.
 *
 * Atomic level: atom.
 * ─────────────────────────────────────────────────────────────────
 */

import { cn } from "@/lib/cn";

export function DayBadge({
  weekday,
  date,
  tone = "primary",
  className,
}: {
  weekday: string;
  date: string;
  /** "primary" (orange) for regular days, "ink" (navy) for the first day. */
  tone?: "primary" | "ink";
  className?: string;
}) {
  const isInk = tone === "ink";
  return (
    <div className={cn("flex shrink-0 flex-col gap-[3px]", className)}>
      <div className={cn("h-1 w-full rounded-sm", isInk ? "bg-ink" : "bg-primary")} />
      <div
        className={cn(
          "flex aspect-square w-full flex-col items-center justify-center rounded-xs text-center",
          isInk ? "bg-ink" : "bg-primary",
        )}
      >
        <span className="text-micro font-extrabold leading-tight text-white">{weekday}</span>
        <span className={cn("text-micro leading-tight", isInk ? "text-primary-tint" : "text-white")}>
          {date}
        </span>
      </div>
    </div>
  );
}
