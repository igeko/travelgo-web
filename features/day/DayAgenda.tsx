"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   DayAgenda · same spirit as DayList, but each row shows the day on
   the left (date only) and the ordered stack of that day's activities
   on the right — titles only. Selection is per-activity (controlled).
───────────────────────────────────────────────────────────────── */

export type DayAgendaActivity = {
  /** Stable id (e.g. activity_id) */
  id: string;
  /** Activity title — the only thing rendered */
  title: string;
};

/** Explicit day descriptor — used when the caller has real trip days. */
export type DayAgendaDay = {
  /** Stable id (e.g. day uuid) */
  id: string;
  /** Day of week, 3 uppercase letters (e.g. "MON"). Empty hides it. */
  dow: string;
  /** Number rendered large (day-of-month or day number). */
  dayNumber: number | string;
  /** Ordered activities for the day. */
  activities: DayAgendaActivity[];
};

export type DayAgendaProps = {
  /**
   * Explicit days (each carrying its own date + activities). When provided,
   * `startDate`/`endDate`/`durationDays`/`activities` are ignored. This is the
   * canonical input for real trip data; the generator below is for sandboxes.
   */
  days?: DayAgendaDay[];

  /** Trip start date (ISO yyyy-MM-dd or Date) — generator mode. */
  startDate?: string | Date;
  /**
   * Trip length, expressed either way (endDate wins if both are passed):
   * - endDate: inclusive end date
   * - durationDays: number of days (1 = startDate only)
   */
  endDate?: string | Date;
  durationDays?: number;

  /**
   * Ordered activities per day, keyed by id ("day-0", "day-1"…).
   * Order in the array is the order shown. Generator mode only.
   */
  activities?: Record<string, DayAgendaActivity[]>;

  /** Controlled selection · id of the selected activity */
  selectedActivityId?: string;
  /** Called when the user clicks an activity */
  onSelectActivity?: (id: string) => void;
};

/* ─────────────────────────────────────────────────────────────────
   Helpers · dates and formatters (shared shape with DayList)
───────────────────────────────────────────────────────────────── */

const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  // Parse ISO yyyy-MM-dd as a LOCAL date to avoid UTC day shift.
  const [y, m, d] = input.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function diffDaysInclusive(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

type DayAgendaItemData = {
  id: string;
  dow: string;
  dayNumber: number | string;
  activities: DayAgendaActivity[];
};

/* ─────────────────────────────────────────────────────────────────
   Row
───────────────────────────────────────────────────────────────── */

function DayAgendaItem({
  dow,
  dayNumber,
  activities,
  selectedActivityId,
  onSelectActivity,
}: DayAgendaItemData & {
  selectedActivityId?: string;
  onSelectActivity?: (id: string) => void;
}) {
  const selectable = Boolean(onSelectActivity);

  return (
    <li className="list-none border-b border-dashed border-border last:border-0">
      <div className="grid grid-cols-[50px_1fr] gap-3 px-[10px] py-3">
        {/* Left · the day */}
        <div className="text-center">
          <div className="text-micro tracking-[0.05em] uppercase text-ink-soft">
            {dow}
          </div>
          <div className="text-lg font-semibold leading-tight text-ink">
            {dayNumber}
          </div>
        </div>

        {/* Right · the ordered stack of activity titles */}
        <div className="min-w-0">
          {activities.length === 0 ? (
            <p className="text-meta italic text-ink-faint py-1">
              No activities yet
            </p>
          ) : (
            <ol className="m-0 p-0 list-none flex flex-col gap-0.5">
              {activities.map((act, i) => {
                const selected = selectedActivityId === act.id;
                const inner = (
                  <>
                    <span
                      className={cn(
                        "text-micro tabular-nums shrink-0 w-4 text-right",
                        selected ? "text-white/50" : "text-ink-faint",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-meta truncate",
                        selected ? "text-white" : "text-ink",
                      )}
                    >
                      {act.title}
                    </span>
                  </>
                );

                return (
                  <li key={act.id} className="min-w-0">
                    {selectable ? (
                      <button
                        type="button"
                        onClick={() => onSelectActivity!(act.id)}
                        aria-current={selected ? "true" : undefined}
                        className={cn(
                          "flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left transition-colors cursor-pointer",
                          selected
                            ? "bg-ink text-white"
                            : "hover:bg-surface-soft",
                        )}
                      >
                        {inner}
                      </button>
                    ) : (
                      <span className="flex items-baseline gap-2 px-2 py-1">
                        {inner}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────── */

export function DayAgenda({
  days: explicitDays,
  startDate,
  endDate,
  durationDays,
  activities,
  selectedActivityId,
  onSelectActivity,
}: DayAgendaProps) {
  const generated = useMemo<DayAgendaItemData[]>(() => {
    if (explicitDays || startDate === undefined) return [];
    const start = toDate(startDate);

    let length: number;
    if (endDate !== undefined) {
      length = Math.max(1, diffDaysInclusive(start, toDate(endDate)));
    } else if (durationDays !== undefined && durationDays > 0) {
      length = durationDays;
    } else {
      length = 1;
    }

    return Array.from({ length }, (_, i): DayAgendaItemData => {
      const date = addDays(start, i);
      const id = `day-${i}`;
      return {
        id,
        dow: DOW_EN[date.getDay()],
        dayNumber: date.getDate(),
        activities: activities?.[id] ?? [],
      };
    });
  }, [explicitDays, startDate, endDate, durationDays, activities]);

  const days = explicitDays ?? generated;

  return (
    <ol className="m-0 p-0 py-1.5 list-none">
      {days.map((day) => (
        <DayAgendaItem
          key={day.id}
          {...day}
          selectedActivityId={selectedActivityId}
          onSelectActivity={onSelectActivity}
        />
      ))}
    </ol>
  );
}
