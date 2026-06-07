"use client";

/**
 * features/day/DayRail.tsx
 * ─────────────────────────────────────────────────────────────────
 * The trip's day-by-day sidebar: header + (optional) collapse toggle +
 * the scrollable list of DayItem rows. Controlled — the parent owns the
 * day data, the selection and the collapsed state.
 *
 * Extracted from TripDayView so the same rail is reused on the trip day
 * page and in /trips/new (no duplicated markup).
 * ─────────────────────────────────────────────────────────────────
 */

import type React from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/cn";
import { DayItem } from "@/features/day/DayItem";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import type { Day } from "@/lib/dal/domain";

/** Parse an ISO yyyy-MM-dd as a LOCAL date (avoids UTC day shift). */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Carico per giorno usato dal compact mode per pilotare fill bar + overflow.
 *  Chiavi = day.id. Lasciare undefined / mappa vuota se il chiamante non
 *  aggrega ancora le attività di tutti i giorni — il badge mostrerà fill bar
 *  vuota senza rompere il layout. */
export type DayLoadMap = Record<string, { fillPct: number; overflow: boolean }>;

export type DayRailProps = {
  days: Day[];
  /** Controlled selection (a day id). */
  selectedDayId: string;
  onSelect: (id: string) => void;
  startDate: string | null;
  endDate: string | null;
  /** Collapsed (compact) mode. Omit onToggleCollapse to hide the toggle. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /**
   * Header style: "full" (eyebrow + "Day by day" + date summary) or
   * "label" (just the ITINERARY eyebrow). Default "full".
   */
  header?: "full" | "label";
  /** Compact-only — riempimento del giorno per pilotare la fill bar e lo
   *  stato di overflow del badge. Vedi [[DayLoadMap]]. */
  dayLoadMap?: DayLoadMap;
  className?: string;
  style?: React.CSSProperties;
};

export function DayRail({
  days,
  selectedDayId,
  onSelect,
  startDate,
  endDate,
  collapsed = false,
  onToggleCollapse,
  header = "full",
  dayLoadMap,
  className,
  style,
}: DayRailProps) {
  const t = useTranslations("TripDayView");
  const locale = useLocale();

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(localDate(iso));
  const getDow = (iso: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(localDate(iso)).toUpperCase();

  return (
    <aside
      className={cn("flex flex-col bg-surface rounded-lg border border-border overflow-hidden", className)}
      style={style}
    >
      {/* Head */}
      {collapsed && onToggleCollapse ? (
        <div className="px-2 py-3 border-b border-border shrink-0 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={t("sidebar.expand")}
            title={t("sidebar.expand")}
            className="flex items-center justify-center w-7 h-7 rounded-md text-ink-soft hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className={cn(
          "px-[18px] border-b border-border shrink-0 flex justify-between gap-2",
          header === "label" ? "py-3 items-center" : "pt-4 pb-3 items-start",
        )}>
          <div className="min-w-0">
            <div className="text-micro uppercase tracking-[0.10em] text-ink-soft">{t("sidebar.itinerary")}</div>
            {header === "full" && (
              <>
                <div className="text-[16px] font-semibold text-ink mt-0.5">{t("sidebar.dayByDay")}</div>
                <div className="text-mini text-ink-soft mt-0.5">
                  {t("sidebar.summary", {
                    count: days.length,
                    start: startDate ? fmtDate(startDate) : "",
                    end: endDate ? fmtDate(endDate) : "",
                  })}
                </div>
              </>
            )}
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={t("sidebar.collapse")}
              title={t("sidebar.collapse")}
              className="shrink-0 flex items-center justify-center w-7 h-7 -mr-1 rounded-md text-ink-soft hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <IconChevronLeft size={18} />
            </button>
          )}
        </div>
      )}

      {/* Items */}
      <ol className="m-0 p-0 py-1.5 pl-1 list-none flex-1 overflow-y-auto min-h-0 scrollbar-thin-hover">
        {days.map((d, i) => {
          const load = dayLoadMap?.[d.id];
          return (
            <DayItem
              key={d.id}
              id={`day-${d.day_number - 1}`}
              dow={d.date ? getDow(d.date) : ""}
              dayNumber={d.date ? localDate(d.date).getDate() : d.day_number}
              zone={d.city ?? undefined}
              place={d.label ?? undefined}
              selected={d.id === selectedDayId}
              compact={collapsed}
              fillPct={load?.fillPct}
              overflow={load?.overflow}
              isFirst={collapsed && i === 0}
              isLast={collapsed && i === days.length - 1}
              onClick={() => onSelect(d.id)}
            />
          );
        })}
      </ol>
    </aside>
  );
}
