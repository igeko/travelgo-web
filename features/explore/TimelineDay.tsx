"use client";

/**
 * features/explore/TimelineDay.tsx
 * ─────────────────────────────────────────────────────────────────
 * Figma "Timeline-Day" — the vertical day spine that marks a day
 * boundary in the Explore timeline: a coloured day badge (weekday +
 * date) sitting on top of a warm-grey rail that carries the day's
 * time ticks.
 *
 * States:
 *  - default   → primary badge, empty rail
 *  - hover      → primary badge, rail lightens + reveals ticks
 *  - selected   → primary badge, rail with ticks + end marker
 *  - first      → ink (navy) badge with tinted date — the trip's start
 *
 * Controlled/presentational. Width is fixed (36px); height flexes to
 * the parent so the rail stretches alongside the day's stops.
 *
 * Atomic level: molecule.
 * ─────────────────────────────────────────────────────────────────
 */

import { cn } from "@/lib/cn";

export type TimelineDayState = "default" | "hover" | "selected" | "first";

/**
 * DayBadge — the coloured weekday/date cap that tops a day spine. Shared
 * by TimelineDay (standalone) and the Timeline organism so the day marker
 * stays a single source of truth.
 */
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

export function TimelineDay({
  weekday,
  date,
  state = "default",
  times = [],
  className,
  onClick,
}: {
  /** e.g. "WED" */
  weekday: string;
  /** e.g. "5 Ago" */
  date: string;
  state?: TimelineDayState;
  /** Time ticks shown along the rail, e.g. ["11:00", "13:00"]. */
  times?: string[];
  className?: string;
  onClick?: () => void;
}) {
  const isFirst = state === "first";
  const showTicks = state !== "default" && times.length > 0;
  const interactive = state === "hover" || state === "selected";

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex h-full w-9 flex-col gap-[3px] text-left",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* Day badge */}
      <DayBadge weekday={weekday} date={date} tone={isFirst ? "ink" : "primary"} />

      {/* Rail */}
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col items-center rounded-xs px-1 py-2",
          interactive && state === "hover" ? "bg-surface-soft" : "bg-timeline-rail",
        )}
      >
        {showTicks ? (
          <div className="flex flex-1 flex-col items-center justify-between gap-2 text-center text-nano text-ink">
            {times.map((t, i) => (
              <span key={`${t}-${i}`} className="leading-none">
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {state === "selected" ? (
          <span className="mt-2 size-2 rounded-pill border border-ink-soft" aria-hidden />
        ) : null}
      </div>
    </Wrapper>
  );
}
