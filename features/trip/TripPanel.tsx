"use client";

/**
 * features/trip/TripPanel.tsx
 * ─────────────────────────────────────────────────────────────────
 * Composition of TripInfo (the trip "ticket") + a DayAgenda (day-by-day list
 * with each day's activities). Owns the relationship between the two:
 *
 *  - No days yet → TripInfo is OPEN (the full two-piece ticket: stub + body).
 *  - Days appear → TripInfo auto-collapses to its header, freeing the column
 *    for the agenda below. The collapse is overridable: the user reopens it
 *    from the ticket foot ("Apri biglietto") and closes it again by clicking
 *    the header.
 *
 * The agenda lists each day with its ordered activity titles; clicking an
 * activity resolves to its day id via `onSelect` (drives the day-active view).
 * The slim-rail (76px) sidebar collapse is a separate, orthogonal mechanism —
 * `onToggleSidebar` is forwarded to the agenda header chevron.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { TripInfo, type TripInfoProps, type TripSummaryItem } from "./TripInfo";
import { DayAgenda, type DayAgendaDay } from "@/features/day/DayAgenda";
import type { Activity, Day } from "@/lib/dal/domain";
import {
  IconCalendar,
  IconChevronLeft,
  IconMapPin,
  IconUsers,
} from "@/components/ui/icons";

/** Parse an ISO yyyy-MM-dd as a LOCAL date (avoids UTC day shift). */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type TripPanelProps = {
  /** Trip name ("Norvegia"). null → empty headline. */
  tripName: string | null;
  /** Pre-formatted date range. */
  dateRange: string | null;
  /** The four ticket fields (where/when/who/vibe). */
  fields: TripInfoProps["fields"];
  /** Days for the agenda (sorted by the caller), each with its activities. */
  days: Array<Day & { activities: Activity[] }>;
  /** Selecting an activity resolves to its day id. */
  onSelect: (dayId: string) => void;
  /** Collapse the whole sidebar to the slim rail. */
  onToggleSidebar?: () => void;
  className?: string;
};

export function TripPanel({
  tripName,
  dateRange,
  fields,
  days,
  onSelect,
  onToggleSidebar,
  className,
}: TripPanelProps) {
  const t = useTranslations("TripDayView");
  const locale = useLocale();
  const getDow = (iso: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" })
      .format(localDate(iso))
      .toUpperCase();

  const hasDays = days.length > 0;

  // Real trip days → agenda rows (each carries its own date + ordered titles).
  const agendaDays = useMemo<DayAgendaDay[]>(
    () =>
      days.map((d) => ({
        id: d.id,
        dow: d.date ? getDow(d.date) : "",
        dayNumber: d.date ? localDate(d.date).getDate() : d.day_number,
        activities: [...d.activities]
          .sort((a, b) => a.position - b.position)
          .map((a) => ({ id: a.id, title: a.title })),
      })),
    // getDow only depends on locale
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, locale],
  );

  // Clicking an activity opens its day (keeps the day-active 3-column flow).
  const activityToDay = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of days) for (const a of d.activities) m.set(a.id, d.id);
    return m;
  }, [days]);
  // Open while the trip has no days; once days arrive the ticket folds away.
  const [infoOpen, setInfoOpen] = useState(!hasDays);
  const prevHasDays = useRef(hasDays);
  useEffect(() => {
    if (!prevHasDays.current && hasDays) setInfoOpen(false);
    prevHasDays.current = hasDays;
  }, [hasDays]);

  // Condensed items for the collapsed ticket strip (cap at the first three).
  const summaryRaw: (TripSummaryItem | null)[] = [
    fields.where ? { icon: <IconMapPin />, value: fields.where } : null,
    fields.when ? { icon: <IconCalendar />, value: fields.when } : null,
    fields.who ? { icon: <IconUsers />, value: fields.who } : null,
  ];
  const summary = summaryRaw.filter((s): s is TripSummaryItem => s != null);

  return (
    <div className={cn("flex flex-col gap-3.5 min-h-0", className)}>
      <TripInfo
        className="shrink-0"
        collapsed={!infoOpen}
        tripName={tripName}
        dateRange={dateRange}
        fields={fields}
        summary={summary}
        onToggleCollapse={() => setInfoOpen(true)}
        onHeadClick={infoOpen ? () => setInfoOpen(false) : undefined}
      />
      {hasDays && (
        <aside className="flex flex-col bg-surface rounded-lg border border-border overflow-hidden flex-1 min-h-0">
          <div className="px-[18px] py-3 border-b border-border shrink-0 flex items-center justify-between gap-2">
            <div className="text-micro uppercase tracking-[0.10em] text-ink-soft">
              {t("sidebar.itinerary")}
            </div>
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label={t("sidebar.collapse")}
                title={t("sidebar.collapse")}
                className="shrink-0 flex items-center justify-center w-7 h-7 -mr-1 rounded-md text-ink-soft hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
              >
                <IconChevronLeft size={18} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin-hover pl-1">
            <DayAgenda
              days={agendaDays}
              onSelectActivity={(id) => {
                const dayId = activityToDay.get(id);
                if (dayId) onSelect(dayId);
              }}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
