"use client";

import { useMemo } from "react";
import { DayItem, type DayItemData } from "@/features/day/DayItem";

/* ─────────────────────────────────────────────────────────────────
   DayList · takes dates as input and generates the list of days.
   Selection is CONTROLLED only: the parent owns selectedDayId + onSelect.
───────────────────────────────────────────────────────────────── */

export type DayListProps = {
  /** Trip start date (ISO yyyy-MM-dd or Date) */
  startDate: string | Date;
  /**
   * Specify the trip length in one of two ways:
   * - endDate: inclusive end date
   * - durationDays: number of days (1 = startDate only)
   * If both are passed, endDate wins.
   */
  endDate?: string | Date;
  durationDays?: number;

  /** Header title (default: "Day by day") */
  title?: string;

  /** Controlled selection · id of the selected day (e.g. "day-3") */
  selectedDayId: string;
  /** Called when the user clicks a day */
  onSelect: (id: string) => void;

  /**
   * Optional details per day, keyed by id ("day-0", "day-1"…).
   * Unpopulated days fall back to "No zone yet" / "No place yet".
   */
  dayDetails?: Record<string, { zone?: string; place?: string }>;
};

/* ─────────────────────────────────────────────────────────────────
   Helpers · dates and formatters
───────────────────────────────────────────────────────────────── */

const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  // Parse ISO yyyy-MM-dd as a LOCAL date (default would treat it as UTC,
  // which can shift the day depending on the timezone).
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

const MONTH_SHORT_EN = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

/* ─────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────── */

export function DayList({
  startDate,
  endDate,
  durationDays,
  selectedDayId,
  onSelect,
  dayDetails,
}: DayListProps) {
  const { days } = useMemo(() => {
    const start = toDate(startDate);

    // Resolve length (priority: endDate > durationDays > 1)
    let length: number;
    let end: Date;
    if (endDate !== undefined) {
      end = toDate(endDate);
      length = Math.max(1, diffDaysInclusive(start, end));
    } else if (durationDays !== undefined && durationDays > 0) {
      length = durationDays;
      end = addDays(start, length - 1);
    } else {
      length = 1;
      end = start;
    }

    const items: DayItemData[] = Array.from({ length }, (_, i) => {
      const date = addDays(start, i);
      const id = `day-${i}`;
      const details = dayDetails?.[id];
      return {
        id,
        dow: DOW_EN[date.getDay()],
        dayNumber: date.getDate(),
        zone: details?.zone,
        place: details?.place,
      };
    });

    const sub = `${length} days · ${MONTH_SHORT_EN.format(start)} → ${MONTH_SHORT_EN.format(end)}`;
    return { days: items, subtitle: sub };
  }, [startDate, endDate, durationDays, dayDetails]);

  return (
    <ol className="m-0 p-0 py-1.5 list-none">
      {days.map((day) => (
        <DayItem
          key={day.id}
          {...day}
          selected={selectedDayId === day.id}
          onClick={() => onSelect(day.id)}
        />
      ))}
    </ol>
  );
}
