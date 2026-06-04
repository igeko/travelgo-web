/**
 * features/explore/ArrivalDeparture.tsx
 * ─────────────────────────────────────────────────────────────────
 * The arrival / departure row inside a stop editor card: two time
 * columns (ARRIVAL ← login glyph, DEPARTURE → logout glyph) pinned to
 * the card edges. Shared by ActivityStop (Sleep mode) and FuzzyStop so
 * the two stop types stay visually identical where they overlap.
 *
 * Renders nothing when neither side is provided; a missing side leaves
 * an empty spacer so the present one keeps its edge.
 *
 * Atomic level: molecule. Composes TimeColumn.
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType } from "react";
import { IconLogin2, IconLogout2 } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type ActivityTime = { time: string; date: string };

export function ArrivalDeparture({
  arrival,
  departure,
}: {
  arrival?: ActivityTime;
  departure?: ActivityTime;
}) {
  if (!arrival && !departure) return null;

  return (
    <div className="flex w-full items-start justify-between px-2">
      {arrival ? (
        <TimeColumn label="ARRIVAL" icon={IconLogin2} {...arrival} align="start" />
      ) : (
        <span />
      )}
      {departure ? (
        <TimeColumn label="DEPARTURE" icon={IconLogout2} {...departure} align="end" />
      ) : (
        <span />
      )}
    </div>
  );
}

function TimeColumn({
  label,
  icon: Icon,
  time,
  date,
  align,
}: {
  label: string;
  icon: IconCmp;
  time: string;
  date: string;
  align: "start" | "end";
}) {
  return (
    <div className={cn("flex w-[72px] flex-col gap-0.5", align === "end" ? "items-end" : "items-start")}>
      <span className="flex items-center gap-1 text-micro font-semibold text-ink-soft">
        <Icon size={10} className="shrink-0" />
        {label}
      </span>
      <span className="text-[20px] font-semibold leading-none text-ink">{time}</span>
      <span className="text-micro text-ink-soft">{date}</span>
    </div>
  );
}
