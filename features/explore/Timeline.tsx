"use client";

/**
 * features/explore/Timeline.tsx
 * ─────────────────────────────────────────────────────────────────
 * Figma "Timeline" — the Explore day-by-day organism. Each day pairs a
 * coloured spine (DayBadge + a continuous warm rail) with the column of
 * its stops; Transfers sit between them.
 *
 * Day expansion (Figma "Default" → "DayOpened"): a day is collapsed by
 * default and shows only its timed stops. Clicking the day's spine
 * expands it to full height, revealing the fuzzy stops and the TODAY
 * NOTES panel.
 *
 * Beyond the Figma: per-activity times are rendered on the rail,
 * vertically centred on their stop via an explicit CSS grid (the rail
 * spans every row, each time shares its stop's gridRow).
 *
 * Data in = the trip snapshot's days (Day + their scheduled Activity[]).
 *
 * Atomic level: organism. Composes DayBadge · ActivityStop · FuzzyStop · Transfer.
 * ─────────────────────────────────────────────────────────────────
 */

import { type ComponentType, Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import type { Activity, BridgeData, Day } from "@/lib/dal/domain";
import {
  IconBed,
  IconBuildingCottage,
  IconHome,
  IconMapPin,
  IconTent,
} from "@/components/ui/icons";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import { cn } from "@/lib/cn";
import { DayBadge } from "./TimelineDay";
import { ActivityStop } from "./ActivityStop";
import { FuzzyStop } from "./FuzzyStop";
import { Transfer, type TransferLeg, type TransferStep } from "./Transfer";
import type { AccommodationDisplay } from "./resolveAccommodations";

export type TimelineDayData = Day & {
  activities: Activity[];
  /** Derived by resolveAccommodations from the legacy days.accommodation_*
   *  columns. Null when the day has no lodging (e.g. overnight flight). */
  accommodation?: AccommodationDisplay | null;
};

type IconCmp = ComponentType<{ size?: number; className?: string }>;

/** Type → icon mapping for the accommodation stop badge. */
function accommodationIcon(type: string | null): IconCmp {
  switch (type) {
    case "campground":
      return IconTent;
    case "apartment":
      return IconHome;
    case "ryokan":
      return IconBuildingCottage;
    default:
      return IconBed;
  }
}

type Props = {
  days: TimelineDayData[];
  /** Japan & co. carry no bridge data — inject a sample Transfer between
   *  stops so the connector can be seen in context. */
  injectSampleTransfers?: boolean;
  className?: string;
};

/* ── Date helpers ───────────────────────────────────────────────── */

function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "WED" (en weekday) + "5 Ago" (it month) — matches the Figma sample. */
function formatDay(iso: string): { weekday: string; dateLabel: string } {
  const d = localDate(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const month = d
    .toLocaleDateString("it-IT", { month: "short" })
    .replace(".", "")
    .replace(/^./, (c) => c.toUpperCase());
  return { weekday, dateLabel: `${d.getDate()} ${month}` };
}

/* ── Bridge → Transfer mapping ──────────────────────────────────── */

const SAMPLE_LEGS: TransferLeg[] = [
  { kind: "walk", label: "8 min" },
  { kind: "bus", label: "105" },
  { kind: "walk", label: "10 min" },
];
const SAMPLE_STEPS: TransferStep[] = [
  { kind: "walk", title: "A piedi 8 minuti" },
  {
    kind: "bus",
    title: "Autobus 105 ·",
    place: "Giulio Cesare/Lepanto (MA)",
    subtitle: "10:39 · Colosseo (Mb) → Plebiscito · 3 fermate",
  },
  { kind: "walk", title: "A piedi 10 minuti" },
];

type TransferVM = {
  mode: "transit" | "car";
  duration: string;
  legs: TransferLeg[];
  steps: TransferStep[];
};

function bridgeTransfer(b: BridgeData): TransferVM {
  const carLike = b.transport === "car" || b.transport === "taxi";
  const duration = `${b.duration_min} min`;
  if (carLike) return { mode: "car", duration, legs: [], steps: [] };
  return {
    mode: "transit",
    duration,
    legs: [{ kind: "bus", label: b.line ?? "—" }],
    steps: [{ kind: "bus", title: b.line ? `${b.line} ·` : "Transit", place: b.stops ?? undefined, subtitle: b.note ?? undefined }],
  };
}

/* ── Item model ─────────────────────────────────────────────────── */

type Item =
  | { kind: "activity"; activity: Activity; accent?: "ink" | "primary" }
  | {
      kind: "lodging";
      id: string;
      title: string;
      icon: IconCmp;
      address: string | null;
      nightIndex: number;
      nightsTotal: number;
    }
  | { kind: "transfer"; id: string; transfer: TransferVM };

/** Build the visible row sequence for a day. When collapsed, fuzzy stops
 *  are dropped; transfers are derived between the *visible* stops. The
 *  accommodation (when present) is inserted as the first item — primary
 *  accent — matching the Figma "Hotel Tavinos Asakusa" row. */
function buildItems(
  acts: Activity[],
  accommodation: AccommodationDisplay | null | undefined,
  dayId: string,
  expanded: boolean,
  injectSample: boolean,
): Item[] {
  const items: Item[] = [];

  if (accommodation) {
    // ID scoped to the day: the same hotel across 5 nights becomes 5 distinct
    // lodging items, so opening one doesn't open them all.
    items.push({
      kind: "lodging",
      id: `lodging-${dayId}`,
      title: accommodation.name,
      icon: accommodationIcon(accommodation.type),
      address: accommodation.address,
      nightIndex: accommodation.night_index,
      nightsTotal: accommodation.nights_total,
    });
  }

  const visible = [...acts]
    .sort((a, b) => a.position - b.position)
    .filter((a) => expanded || a.fuzzy !== true);

  visible.forEach((activity, i) => {
    items.push({ kind: "activity", activity });
    const last = i === visible.length - 1;
    if (activity.bridge_out_json) {
      items.push({ kind: "transfer", id: `${activity.id}-br`, transfer: bridgeTransfer(activity.bridge_out_json) });
    } else if (injectSample && !last) {
      items.push({
        kind: "transfer",
        id: `${activity.id}-sample`,
        transfer: { mode: "transit", duration: "46 min", legs: SAMPLE_LEGS, steps: SAMPLE_STEPS },
      });
    }
  });
  return items;
}

/* ── Timeline ───────────────────────────────────────────────────── */

export function Timeline({ days, injectSampleTransfers = false, className }: Props) {
  const t = useTranslations("Explore");
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  const toggleDay = (id: string) =>
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  return (
    <div className={cn("flex w-full flex-col rounded-lg bg-surface p-2", className)}>
      {sortedDays.map((day, dayIdx) => {
        const { weekday, dateLabel } = day.date
          ? formatDay(day.date)
          : { weekday: "", dateLabel: "" };
        const expanded = expandedDays.has(day.id);
        // Times follow the TimelineDay states: hidden by default, revealed
        // when the day's spine is hovered, kept while the day is expanded.
        const showTimes = expanded || hoverDay === day.id;
        const items = buildItems(day.activities, day.accommodation, day.id, expanded, injectSampleTransfers);
        const isFirst = dayIdx === 0;
        const showNotes = expanded && !!day.notes;
        const spineHover = {
          onMouseEnter: () => setHoverDay(day.id),
          onMouseLeave: () => setHoverDay((c) => (c === day.id ? null : c)),
        };
        // The lodging item, when present, shares row 1 with the DayBadge (col 2)
        // so the icon badge's top edge lines up with the DayBadge's top stripe.
        // The DayBadge then spans row 1+2 (col 1) with a 6px top offset, so row 1
        // is sized by the lodging item — not by the DayBadge's natural height —
        // keeping the gap below the lodging equal to the gap between activities.
        const lodgingItemId = items[0]?.kind === "lodging" ? items[0].id : null;
        const lodgingFirst = lodgingItemId !== null;
        const lodgingOpen = lodgingItemId !== null && openId === lodgingItemId;
        // Rows: 1 = badge (+ lodging when present) · 2..N+(0|1) = items · last = notes
        const lastRow = items.length + (lodgingFirst ? 0 : 1) + (showNotes ? 1 : 0);

        return (
          <div
            key={day.id}
            className="grid items-start gap-x-2"
            style={{ gridTemplateColumns: "36px minmax(0, 1fr)" }}
          >
            {/* Day rail — the rounded grey segment BELOW the badge, detached by
                a 3px gap above (mt) and below (the container's row gap), so the
                day badge floats clear of the rail as in the Figma. Holds the
                aligned time ticks. When the lodging is OPEN the rail extends to
                row 1 too, so the grey column covers the full height of the
                opened lodging card. */}
            <button
              type="button"
              onClick={() => toggleDay(day.id)}
              {...spineHover}
              aria-hidden
              tabIndex={-1}
              style={{ gridColumn: 1, gridRow: `${lodgingOpen ? 1 : 2} / ${lastRow + 1}` }}
              className="my-[3px] w-full cursor-pointer self-stretch rounded-xs bg-timeline-rail transition-colors hover:bg-surface-soft"
            />

            {/* Day badge — sits on top of the rail (col 1, row 1). When a lodging
                shares row 1 the badge spans row 1+2 with `mt-1.5` so the top
                stripe lines up with the lodging icon and row 1's height is
                driven by the lodging item, not by the badge's natural 43px. */}
            <button
              type="button"
              onClick={() => toggleDay(day.id)}
              {...spineHover}
              aria-expanded={expanded}
              aria-label={`${weekday} ${dateLabel} — ${expanded ? "comprimi" : "espandi"} giorno`}
              style={{
                gridColumn: 1,
                gridRow: lodgingFirst ? "1 / span 2" : 1,
              }}
              className={cn("cursor-pointer self-start", lodgingFirst && "mt-1.5")}
            >
              <DayBadge weekday={weekday} date={dateLabel} tone={isFirst ? "ink" : "primary"} />
            </button>

            {/* Expanded day — faint city/landscape backdrop behind the stops.
                Rendered before the content cells so they paint on top (all are
                non-positioned grid items → DOM order = paint order). */}
            {expanded ? (
              <div
                aria-hidden
                style={{ gridColumn: 2, gridRow: `1 / ${lastRow + 1}` }}
                className="pointer-events-none self-stretch bg-[url('/media/timeline/timeline-city.png')] bg-[length:100%_auto] bg-bottom bg-no-repeat"
              />
            ) : null}

            {/* Selected/expanded end marker (TimelineDay "Selected" state) */}
            {expanded && lastRow >= 2 ? (
              <span
                style={{ gridColumn: 1, gridRow: lastRow }}
                className="pointer-events-none z-10 mb-1 size-2 self-end justify-self-center rounded-pill border border-ink-soft"
                aria-hidden
              />
            ) : null}

            {/* Items: time on the rail (col 1) + stop/transfer (col 2), same row.
                When lodging is the first item it occupies row 1 alongside the
                DayBadge — every other item then shifts one row up. */}
            {items.map((item, i) => {
              const row = lodgingFirst ? i + 1 : i + 2;
              if (item.kind === "transfer") {
                const open = openId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{ gridColumn: 2, gridRow: row }}
                    className="py-0.5"
                  >
                    <Transfer
                      mode={item.transfer.mode}
                      state={open ? "open" : "default"}
                      duration={item.transfer.duration}
                      legs={item.transfer.legs}
                      steps={item.transfer.steps}
                      onOpen={() => setOpenId(item.id)}
                      onClose={() => setOpenId(null)}
                    />
                  </div>
                );
              }

              if (item.kind === "lodging") {
                const open = openId === item.id;
                const description =
                  item.nightsTotal > 1
                    ? t("nightOfStay", {
                        index: item.nightIndex + 1,
                        total: item.nightsTotal,
                      })
                    : item.address;
                return (
                  <div
                    key={item.id}
                    style={{ gridColumn: 2, gridRow: row }}
                    className="py-0.5 self-start"
                  >
                    <ActivityStop
                      title={item.title}
                      icon={item.icon}
                      accent="primary"
                      state={open ? "open" : "default"}
                      mode="sleep"
                      description={description ?? undefined}
                      onOpen={() => setOpenId(item.id)}
                      onClose={() => setOpenId(null)}
                      onRemove={() => setOpenId(null)}
                    />
                  </div>
                );
              }

              const a = item.activity;
              const open = openId === a.id;
              const fuzzy = a.fuzzy === true;
              const Icon = getStopIcon(a.icon) ?? IconMapPin;
              const time = !fuzzy && a.time ? a.time : null;

              return (
                <Fragment key={a.id}>
                  {/* time — only when the day's spine is hovered/expanded.
                      `self-center` centres it on the stop row despite the grid's
                      items-start; pointer-events-none keeps the rail clickable. */}
                  {time && showTimes ? (
                    <div
                      style={{ gridColumn: 1, gridRow: row }}
                      className="pointer-events-none z-10 self-center justify-self-center text-nano text-ink"
                    >
                      {time}
                    </div>
                  ) : null}
                  <div style={{ gridColumn: 2, gridRow: row }} className="py-0.5">
                    {fuzzy ? (
                      <FuzzyStop
                        title={a.title}
                        icon={Icon}
                        state={open ? "open" : "default"}
                        description={a.short_desc ?? undefined}
                        onOpen={() => setOpenId(a.id)}
                        onClose={() => setOpenId(null)}
                        onRemove={() => setOpenId(null)}
                      />
                    ) : (
                      <ActivityStop
                        title={a.title}
                        icon={Icon}
                        state={open ? "open" : "default"}
                        mode="stop"
                        timeRange={a.time ?? "—"}
                        description={a.short_desc ?? undefined}
                        onOpen={() => setOpenId(a.id)}
                        onClose={() => setOpenId(null)}
                        onRemove={() => setOpenId(null)}
                      />
                    )}
                  </div>
                </Fragment>
              );
            })}

            {/* TODAY NOTES — only when the day is expanded */}
            {showNotes ? (
              <div style={{ gridColumn: 2, gridRow: lastRow }} className="py-3">
                <div className="flex flex-col gap-2.5 rounded-sm bg-surface-warm/70 p-4">
                  <p className="text-mini font-medium uppercase tracking-meta text-primary">
                    Today notes
                  </p>
                  <p className="whitespace-pre-line text-mini text-ink">{day.notes}</p>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
