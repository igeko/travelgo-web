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
 * Beyond the Figma: per-activity times are rendered on the right edge of
 * each ActivityStop row (before the drag handle), and only revealed when
 * the day is expanded.
 *
 * Data in = the trip snapshot's days (Day + their scheduled Activity[]).
 *
 * Atomic level: organism. Composes DayBadge · ActivityStop · FuzzyStop · Transfer.
 * ─────────────────────────────────────────────────────────────────
 */

import { type ComponentType, useEffect, useState } from "react";
import type { Activity, BridgeData, Day } from "@/lib/dal/domain";
import {
  IconBed,
  IconBuildingCottage,
  IconCalendarPlus,
  IconHome,
  IconMap,
  IconMapPin,
  IconTent,
  IconX,
} from "@/components/ui/icons";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import { cn } from "@/lib/cn";
import { DayBadge } from "./DayBadge";
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
  /**
   * Fired when the user opens a day (expands its DayBadge/rail). Hosts use
   * it to drive surfaces tied to the day in focus — e.g. ExploreNextShell
   * filtering the map's itinerary markers to that day's stops. Not called
   * on collapse: the model is "last opened wins", not single-selection.
   */
  onSelectDay?: (dayId: string) => void;
  /**
   * Fired whenever the in-row "open" activity changes (click on a stop
   * expands it inline). Hosts consume the id to feed selection-aware
   * downstream features — e.g. the Add-to-Trip algorithm uses it as
   * `selectedActivityId`. `null` when no row is open.
   */
  onSelectActivity?: (activityId: string | null) => void;
  /**
   * Fired when the user hits "Remove" inside an activity's expanded
   * editor. The host is responsible for the API call + any post-delete
   * refresh; Timeline only closes the inline popover. Receives the
   * scheduled_activity.id. Lodging rows (derived from the Day record)
   * are NOT routed here — those have their own editing flow.
   */
  onRemoveActivity?: (scheduledId: string) => void | Promise<void>;
  /**
   * Stop → Sleep conversion. Receives the scheduled_activity.id; the
   * host deletes the scheduled row and creates a 1-night stay starting
   * on its day. Triggered when the user flips the Sleep/Stop toggle of
   * a non-lodging row to "sleep".
   */
  onConvertToSleep?: (scheduledId: string) => void | Promise<void>;
  /**
   * Sleep → Stop conversion. Receives the accommodation_stays.id; the
   * host drops the stay (+ nights) and recreates one scheduled row on
   * the stay's check-in day. Extra nights of multi-night stays are lost.
   */
  onConvertToStop?: (stayId: string) => void | Promise<void>;
  /** Stepper "+" on a lodging row: extends the stay by one night. */
  onExtendStay?: (stayId: string) => void | Promise<void>;
  /** Stepper "−" on a lodging row: reduces the stay by one night. */
  onReduceStay?: (stayId: string) => void | Promise<void>;
  /**
   * When set, force-open that item id (overrides the local open state).
   * Hosts use it after a cross-table conversion so the inline popover
   * stays open on the new row even though the id changes (scheduled.id
   * ↔ lodging-{dayId}). Setting to null forces closed.
   */
  openOverride?: string | null;
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

/* ── Day load (fill bar input) ──────────────────────────────────── */

/** Riempimento stimato del giorno in % rispetto a 10 h disponibili (600 min).
 *  Le fuzzy non contano (non sono pianificate). Manca `duration_min` sul
 *  model Activity → stima a 45 min/stop, come da spec
 *  /design/day-rail-states. */
function computeDayLoad(activities: Activity[]): { fillPct: number; overflow: boolean } {
  const totalMinutes = activities.filter((a) => a.fuzzy !== true).length * 45;
  return {
    fillPct: Math.min(100, Math.round((totalMinutes / 600) * 100)),
    overflow: totalMinutes > 600,
  };
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
      /** Stay id — present when projected from accommodation_nights; lets
       *  the Sleep/Stop toggle and the Stepper mutate the right stay. */
      stayId?: string;
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
      stayId: accommodation.stay_id,
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

export function Timeline({
  days,
  injectSampleTransfers = false,
  onSelectDay,
  onSelectActivity,
  onRemoveActivity,
  onConvertToSleep,
  onConvertToStop,
  onExtendStay,
  onReduceStay,
  openOverride,
  className,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Bubble the "open activity" up so hosts can use it as `selectedActivityId`
  // for downstream features (e.g. Add-to-Trip). The state itself stays local
  // so the row open/close interaction is unaffected.
  useEffect(() => {
    onSelectActivity?.(openId);
  }, [openId, onSelectActivity]);

  // Allow hosts to force-open a specific row after a cross-table mutation
  // (Stop↔Sleep) — without this, the row's id changes and the popover snaps
  // shut. undefined ⇒ no override (default), null ⇒ force-close.
  //
  // Pattern: "adjusting state when props change" — compare against the
  // previous value during render and update synchronously, rather than in
  // an effect (which would cascade a second render). See
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [lastOpenOverride, setLastOpenOverride] = useState(openOverride);
  if (openOverride !== lastOpenOverride) {
    setLastOpenOverride(openOverride);
    if (openOverride !== undefined) setOpenId(openOverride);
  }

  const toggleDay = (id: string) =>
    setExpandedDays((prev) => {
      const next = new Set(prev);
      const wasOpen = next.has(id);
      if (wasOpen) next.delete(id);
      else next.add(id);
      // Emit the "day in focus" signal on open only. Hosts that need a
      // single-selection model can ignore the multi-expand state and just
      // treat each fired id as the current day.
      if (!wasOpen) onSelectDay?.(id);
      return next;
    });

  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  // L'onboarding hint ("Niente pianificato — aggiungi la prima attività")
  // ha senso solo finché il viaggio è completamente vuoto. Appena UNA
  // qualsiasi tappa esiste, il messaggio diventa rumore sui giorni che
  // restano vuoti: lo nascondiamo, mostrando solo i badge a sinistra.
  const tripHasContent = sortedDays.some(
    (d) => d.accommodation || d.activities.length > 0 || d.notes,
  );

  // Raggruppa giorni vuoti consecutivi: un singolo EmptyDayCard di sfondo
  // serve l'intero gruppo, evitando la ripetizione visiva di N card identiche
  // impilate. I giorni con contenuto restano individuali.
  type Segment =
    | { kind: "empty"; days: TimelineDayData[]; startIdx: number }
    | { kind: "active"; day: TimelineDayData; idx: number };
  const segments: Segment[] = [];
  sortedDays.forEach((day, idx) => {
    const isEmpty = !day.accommodation && day.activities.length === 0 && !day.notes;
    if (isEmpty) {
      const last = segments[segments.length - 1];
      if (last && last.kind === "empty") last.days.push(day);
      else segments.push({ kind: "empty", days: [day], startIdx: idx });
    } else {
      segments.push({ kind: "active", day, idx });
    }
  });

  return (
    <div className={cn("flex w-full flex-col rounded-lg bg-surface p-2", className)}>
      {segments.map((seg) => {
        if (seg.kind === "empty") {
          return (
            <EmptyDaysBlock
              key={`empty-${seg.days[0].id}`}
              days={seg.days}
              startIdx={seg.startIdx}
              totalDays={sortedDays.length}
              onSelectDay={onSelectDay}
              showHintCard={!tripHasContent}
            />
          );
        }

        const day = seg.day;
        const dayIdx = seg.idx;
        const { weekday, dateLabel } = day.date
          ? formatDay(day.date)
          : { weekday: "", dateLabel: "" };
        const isFirst = dayIdx === 0;
        const isLast = dayIdx === sortedDays.length - 1;
        const dayLoad = computeDayLoad(day.activities);

        const expanded = expandedDays.has(day.id);
        const items = buildItems(day.activities, day.accommodation, day.id, expanded, injectSampleTransfers);
        const showNotes = expanded && !!day.notes;
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
                opened lodging card.
                When a closed lodging shares row 1, the badge (43px intrinsic +
                6px mt = 49) overflows the row sized by the lodging (36px) by
                13px into row 2, so the rail's top margin is 13 + 3 = 16 to
                keep the visible gap below the badge at the intended 3px. */}
            <button
              type="button"
              onClick={() => toggleDay(day.id)}
              aria-hidden
              tabIndex={-1}
              style={{ gridColumn: 1, gridRow: `${lodgingOpen ? 1 : 2} / ${lastRow + 1}` }}
              className={cn(
                "w-full cursor-pointer self-stretch rounded-xs transition-colors mb-[3px]",
                expanded ? "bg-ink hover:bg-ink-hover" : "bg-timeline-rail hover:bg-surface-soft",
                lodgingFirst && !lodgingOpen ? "mt-[16px]" : "mt-[3px]",
              )}
            />

            {/* Day badge — sits on top of the rail (col 1, row 1). When a lodging
                shares row 1 the badge spans row 1+2 with `mt-1.5` so the top
                stripe lines up with the lodging icon and row 1's height is
                driven by the lodging item, not by the badge's natural 43px. */}
            <button
              type="button"
              onClick={() => toggleDay(day.id)}
              aria-expanded={expanded}
              aria-label={`${weekday} ${dateLabel} — ${expanded ? "comprimi" : "espandi"} giorno`}
              style={{
                gridColumn: 1,
                gridRow: lodgingFirst ? "1 / span 2" : 1,
              }}
              className={cn("cursor-pointer self-start", lodgingFirst && "mt-1.5")}
            >
              <DayBadge
                weekday={weekday}
                date={dateLabel}
                fillPct={dayLoad.fillPct}
                overflow={dayLoad.overflow}
                selected={expanded}
                isFirst={isFirst}
              />
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

            {/* Close affordance for the expanded day — an X sits inside the
                rail's bottom, 8px above its visible bottom edge. Click handling
                stays on the rail button below (pointer-events-none here), so
                the icon is purely a visual cue.
                Rail has `mb-[3px]`, so its visible bottom is at `cell_bottom -
                3`; `mb-[11px]` puts the icon's bottom edge 8px above that. */}
            {expanded && lastRow >= 2 ? (
              <IconX
                size={16}
                style={{ gridColumn: 1, gridRow: lastRow }}
                className="pointer-events-none z-10 mb-[11px] self-end justify-self-center text-white"
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
                const stayId = item.stayId;
                const currentNights = item.nightsTotal;
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
                      nights={item.nightsTotal}
                      nightIndex={item.nightIndex}
                      onOpen={() => setOpenId(item.id)}
                      onClose={() => setOpenId(null)}
                      onRemove={() => setOpenId(null)}
                      onModeChange={(next) => {
                        // sleep → stop: cross-table conversion. Requires a
                        // stay_id (we can't mutate the legacy days.* shape).
                        if (next === "stop" && stayId) {
                          void onConvertToStop?.(stayId);
                        }
                      }}
                      onNightsChange={(next) => {
                        if (!stayId) return;
                        if (next > currentNights) void onExtendStay?.(stayId);
                        else if (next < currentNights) void onReduceStay?.(stayId);
                      }}
                    />
                  </div>
                );
              }

              const a = item.activity;
              const open = openId === a.id;
              const fuzzy = a.fuzzy === true;
              const Icon = getStopIcon(a.icon) ?? IconMapPin;
              // Per-row time label: hidden by default, revealed only when the
              // day is expanded (the user-facing rule — there's no on-hover
              // disclosure for the time).
              const rowTime = !fuzzy && expanded && a.time ? a.time : undefined;

              // Remove handler shared by FuzzyStop / ActivityStop: close the
              // inline popover and forward the scheduled id to the host. If
              // no host handler is supplied we still close the popover, so
              // the UI stays responsive in non-editing surfaces (e.g. the
              // canonical Explore page that doesn't wire deletion yet).
              const handleRemove = () => {
                setOpenId(null);
                onRemoveActivity?.(a.id);
              };

              return (
                <div key={a.id} style={{ gridColumn: 2, gridRow: row }} className="py-0.5">
                  {fuzzy ? (
                    <FuzzyStop
                      title={a.title}
                      icon={Icon}
                      state={open ? "open" : "default"}
                      description={a.short_desc ?? undefined}
                      onOpen={() => setOpenId(a.id)}
                      onClose={() => setOpenId(null)}
                      onRemove={handleRemove}
                    />
                  ) : (
                    <ActivityStop
                      title={a.title}
                      icon={Icon}
                      state={open ? "open" : "default"}
                      mode="stop"
                      timeRange={a.time ?? "—"}
                      time={rowTime}
                      description={a.short_desc ?? undefined}
                      onOpen={() => setOpenId(a.id)}
                      onClose={() => setOpenId(null)}
                      onRemove={handleRemove}
                      onModeChange={(next) => {
                        // stop → sleep: cross-table conversion. The scheduled
                        // row is replaced by a 1-night stay starting on its day.
                        if (next === "sleep") {
                          void onConvertToSleep?.(a.id);
                        }
                      }}
                    />
                  )}
                </div>
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

            {/* Terminatore inferiore — doppia barretta ink/15 sotto il rail
                dell'ultimo giorno. Speculare alla barretta isFirst del DayBadge. */}
            {isLast ? (
              <div
                aria-hidden
                style={{ gridColumn: 1, gridRow: lastRow + 1 }}
                className="flex w-9 flex-col items-center"
              >
                <div className="h-0.5" />
                <div className="h-1 w-full bg-ink/15" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── EmptyDaysBlock ─────────────────────────────────────────────── */

/** Un gruppo di giorni vuoti consecutivi: tutte le DayBadge si impilano in
 *  col 1, una sola EmptyDayCard occupa col 2 e si estende in altezza per
 *  servire da sfondo condiviso. Sostituisce la vecchia resa "una card per
 *  giorno vuoto", che produceva N card identiche impilate.
 *
 *  `showHintCard` controlla la card "Niente pianificato": è ON solo quando
 *  l'intero viaggio è vuoto (onboarding). Appena esiste UNA tappa qualsiasi,
 *  il blocco mostra solo i badge — niente card laterale rumorosa. */
function EmptyDaysBlock({
  days,
  startIdx,
  totalDays,
  onSelectDay,
  showHintCard = true,
}: {
  days: TimelineDayData[];
  startIdx: number;
  /** Lunghezza totale della timeline — serve per sapere se l'ultimo giorno
   *  del block coincide con l'ultimo dell'intera lista (→ doppia barretta). */
  totalDays: number;
  onSelectDay?: (id: string) => void;
  /** false = il viaggio ha già contenuto altrove → niente card laterale. */
  showHintCard?: boolean;
}) {
  const lastIdxOverall = startIdx + days.length - 1;
  const blockEndsTimeline = lastIdxOverall === totalDays - 1;
  return (
    <div className="grid gap-x-2" style={{ gridTemplateColumns: "36px minmax(0, 1fr)" }}>
      <div
        style={{ gridColumn: 1, gridRow: 1 }}
        className="flex flex-col gap-2 self-start py-0.5"
      >
        {days.map((day, i) => {
          const { weekday, dateLabel } = day.date
            ? formatDay(day.date)
            : { weekday: "", dateLabel: "" };
          const isFirst = startIdx + i === 0;
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onSelectDay?.(day.id)}
              aria-label={`${weekday} ${dateLabel}`}
              className="cursor-pointer"
            >
              <DayBadge weekday={weekday} date={dateLabel} isFirst={isFirst} />
            </button>
          );
        })}
        {blockEndsTimeline && (
          <div aria-hidden className="flex w-9 flex-col items-center">
            <div className="h-0.5" />
            <div className="h-1 w-full bg-ink/15" />
          </div>
        )}
      </div>
      <div style={{ gridColumn: 2, gridRow: 1 }} className="py-0.5">
        {showHintCard ? <EmptyDayCard /> : null}
      </div>
    </div>
  );
}

/* ── EmptyDayCard ───────────────────────────────────────────────── */

/** Card di sfondo per giorni senza alloggio/attività/note — striscia con
 *  gradient + map glyph in alto, payload "Niente pianificato" centrato sotto.
 *  Stretcha in altezza per coprire l'intero gruppo di DayBadge accanto (min
 *  280px quando c'è un solo giorno). */
function EmptyDayCard() {
  return (
    <div className="flex h-full min-h-[280px] w-full max-w-[340px] flex-col overflow-hidden rounded-md border border-border">
      <div className="flex h-12 flex-shrink-0 items-center justify-center bg-gradient-to-b from-surface-soft to-surface">
        <IconMap size={22} className="text-ink/10" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 bg-surface px-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-bg">
          <IconCalendarPlus size={22} className="text-ink/25" />
        </div>
        <p className="mt-0.5 text-meta font-medium text-ink/50">Niente pianificato</p>
        <p className="text-mini leading-[1.6] text-ink/30">
          Aggiungi la prima attività
          <br />o chiedi suggerimenti a Go.
        </p>
      </div>
    </div>
  );
}
