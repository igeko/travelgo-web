"use client";

/**
 * features/explore/TimelineV2Mobile.tsx
 * ─────────────────────────────────────────────────────────────────
 * Versione mobile-compact della TimelineV2 (porting di
 * `/design/timeline-readability` mobile mock).
 *
 * Stesso shape di Props di `TimelineV2` — drop-in dentro un bottom-sheet
 * (o qualunque contenitore stretto, ~300–360px). NON è responsive da
 * sola: il caller sceglie quando montarla (es. `lg:hidden` vs la
 * desktop).
 *
 * Differenze rispetto alla desktop:
 *  - Day strip ORIZZONTALE sticky in cima: targhe-data 40px in scroll
 *    orizzontale, fanno da day-selector. Tap su una targa → giorno
 *    espanso (stesso `onSelectDay` della desktop).
 *  - Rail compatto: 30px (vs 44px desktop). Header del giorno: targa
 *    30px + label + chevron.
 *  - Row attività: ActivityStop / FuzzyStop con `size="sm"` (badge
 *    20px, font 12px, grip sempre 40% visibile per touch).
 *  - Transfer: già compatto di suo (font 11px), invariato.
 *  - NightCard: card stay soft con padding ridotto (px-2.5 py-1.5).
 *
 * Editor inline (state="open" delle row reali): non cambia struttura —
 * sull'ospite si suppone che la modal/sheet sia full-screen quando un
 * elemento è open, oppure l'open viene gestito altrove. In questa
 * iterazione delego al caller; la card editor è la stessa della
 * desktop (resta leggibile a 300–360px).
 *
 * Drag&drop: TouchSensor con `delay: 200ms` già configurato. La logica
 * di drag è identica a quella di `TimelineV2`.
 * ─────────────────────────────────────────────────────────────────
 */

import { type ComponentType, useEffect, useRef, useState } from "react";
import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  KeyboardSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Activity, BridgeData, Day } from "@/lib/dal/domain";
import {
  IconBed,
  IconBuildingCottage,
  IconChevronDown,
  IconHome,
  IconMapPin,
  IconTent,
} from "@/components/ui/icons";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import { cn } from "@/lib/cn";
import { ActivityStop } from "./ActivityStop";
import type { PlaceResult } from "@/components/ui/AddressField";
import { FuzzyStop } from "./FuzzyStop";
import {
  Transfer,
  type TransferDestination,
  type TransferLeg,
  type TransferStep,
} from "./Transfer";
import type { AccommodationDisplay } from "./resolveAccommodations";
import {
  computeDayTimes,
  DEFAULT_ACTIVITY_DURATION_MIN,
} from "@/lib/scheduling/computeDayTimes";

/* ── Public types — same shape as TimelineV2 (drop-in) ────────────── */

export type TimelineV2MobileDayData = Day & {
  activities: Activity[];
  accommodation?: AccommodationDisplay | null;
};

type IconCmp = ComponentType<{ size?: number; className?: string }>;

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
  days: TimelineV2MobileDayData[];
  chain?: import("./tripChain").TripStop[];
  computedBridges?: Map<string, BridgeData>;
  injectSampleTransfers?: boolean;
  onSelectDay?: (dayId: string | null) => void;
  onSelectActivity?: (activityId: string | null) => void;
  onRemoveActivity?: (scheduledId: string) => void | Promise<void>;
  onMoveActivity?: (scheduledId: string, direction: "up" | "down") => void | Promise<void>;
  onDragMove?: (scheduledId: string, targetDayId: string, targetIndex: number) => void | Promise<void>;
  onConvertToSleep?: (scheduledId: string) => void | Promise<void>;
  onConvertToStop?: (stayId: string) => void | Promise<void>;
  onExtendStay?: (stayId: string) => void | Promise<void>;
  onReduceStay?: (stayId: string) => void | Promise<void>;
  onAddressChange?: (activityId: string, place: PlaceResult | null) => void | Promise<void>;
  onUpdateActivityInstance?: (
    scheduledId: string,
    patch: { time?: string | null; duration_min?: number | null },
  ) => void | Promise<void>;
  openOverride?: string | null;
  hoveredRowId?: string | null;
  className?: string;
};

/* ── Date / clock helpers (allineati a TimelineV2) ───────────────── */

function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatHMForDb(hm: { hour: number; minute: number }): string {
  return `${String(hm.hour).padStart(2, "0")}:${String(hm.minute).padStart(2, "0")}:00`;
}

function diffMinutesHM(
  arrival: { hour: number; minute: number },
  departure: { hour: number; minute: number },
): number {
  const a = arrival.hour * 60 + arrival.minute;
  const d = departure.hour * 60 + departure.minute;
  return d >= a ? d - a : 24 * 60 - a + d;
}

function formatChipDate(iso: string, dayOffset = 0): string {
  const d = localDate(iso);
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" });
}

function formatDayParts(iso: string): { weekday: string; dayNum: number; monthShort: string } {
  const d = localDate(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const monthShort = d
    .toLocaleDateString("it-IT", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  return { weekday, dayNum: d.getDate(), monthShort };
}

function formatLongLabel(iso: string): string {
  const d = localDate(iso);
  const weekdayLong = d.toLocaleDateString("it-IT", { weekday: "long" });
  const day = d.getDate();
  const monthLong = d.toLocaleDateString("it-IT", { month: "long" });
  return `${weekdayLong[0].toUpperCase()}${weekdayLong.slice(1)} ${day} ${monthLong[0].toUpperCase()}${monthLong.slice(1)}`;
}

function formatShortDate(iso: string): string {
  const d = localDate(iso);
  const weekday = d
    .toLocaleDateString("it-IT", { weekday: "short" })
    .replace(".", "");
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${d.getDate()}`;
}

/* ── Day load (fill bar input) ────────────────────────────────────── */

function computeDayLoad(activities: Activity[]): { fillPct: number; overflow: boolean } {
  const totalMinutes = activities.filter((a) => a.fuzzy !== true).length * 45;
  return {
    fillPct: Math.min(100, Math.round((totalMinutes / 600) * 100)),
    overflow: totalMinutes > 600,
  };
}

/* ── Bridge → Transfer mapping ────────────────────────────────────── */

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
  destination?: TransferDestination;
};

function formatDurationMin(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "0m";
  const total = Math.round(min);
  const days = Math.floor(total / (60 * 24));
  const hours = Math.floor((total % (60 * 24)) / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

function bridgeTransfer(b: BridgeData, destination?: TransferDestination): TransferVM {
  const carLike = b.transport === "car" || b.transport === "taxi";
  const duration = formatDurationMin(b.duration_min);
  if (carLike) return { mode: "car", duration, legs: [], steps: [], destination };
  return {
    mode: "transit",
    duration,
    legs: [{ kind: "bus", label: b.line ?? "—" }],
    steps: [
      {
        kind: "bus",
        title: b.line ? `${b.line} ·` : "Transit",
        place: b.stops ?? undefined,
        subtitle: b.note ?? undefined,
      },
    ],
  };
}

function destinationFromActivity(a: Activity): TransferDestination | undefined {
  if (a.location_lat == null || a.location_lng == null) return undefined;
  return { lat: a.location_lat, lng: a.location_lng, placeId: a.location_place_id, title: a.title };
}

/* ── Item model ───────────────────────────────────────────────────── */

type Item =
  | { kind: "activity"; activity: Activity }
  | { kind: "transfer"; id: string; transfer: TransferVM };

type LodgingVM = {
  id: string;
  title: string;
  icon: IconCmp;
  address: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  nightIndex: number;
  nightsTotal: number;
  stayId?: string;
  activityId?: string;
};

function buildItems(
  acts: Activity[],
  expanded: boolean,
  injectSample: boolean,
  computedBridges?: Map<string, BridgeData>,
  incomingChainPrevId?: string | null,
): Item[] {
  const items: Item[] = [];
  const visible = [...acts]
    .sort((a, b) => a.position - b.position)
    .filter((a) => expanded || a.fuzzy !== true);

  if (incomingChainPrevId && visible.length > 0) {
    const first = visible[0];
    const computedIn = computedBridges?.get(`${incomingChainPrevId}|${first.id}`);
    const bridge = computedIn ?? first.bridge_in_json ?? null;
    if (bridge) {
      items.push({
        kind: "transfer",
        id: `${first.id}-in`,
        transfer: bridgeTransfer(bridge, destinationFromActivity(first)),
      });
    }
  }

  visible.forEach((activity, i) => {
    items.push({ kind: "activity", activity });
    const last = i === visible.length - 1;
    if (last) return;
    const next = visible[i + 1];
    const saved = activity.bridge_out_json;
    const computed = computedBridges?.get(`${activity.id}|${next.id}`);
    const bridge = saved ?? computed ?? null;
    if (bridge) {
      items.push({
        kind: "transfer",
        id: `${activity.id}-br`,
        transfer: bridgeTransfer(bridge, destinationFromActivity(next)),
      });
    } else if (injectSample) {
      items.push({
        kind: "transfer",
        id: `${activity.id}-sample`,
        transfer: { mode: "transit", duration: "46 min", legs: SAMPLE_LEGS, steps: SAMPLE_STEPS },
      });
    }
  });
  return items;
}

function buildLodging(
  accommodation: AccommodationDisplay | null | undefined,
  dayId: string,
): LodgingVM | null {
  if (!accommodation) return null;
  return {
    id: `lodging-${dayId}`,
    title: accommodation.name,
    icon: accommodationIcon(accommodation.type),
    address: accommodation.address,
    placeId: accommodation.place_id,
    lat: accommodation.lat,
    lng: accommodation.lng,
    nightIndex: accommodation.night_index,
    nightsTotal: accommodation.nights_total,
    stayId: accommodation.stay_id,
    activityId: accommodation.activity_id,
  };
}

/* ── DnD wrappers (identici a TimelineV2) ─────────────────────────── */

function SortableActivityRow({
  scheduledId,
  dayId,
  index,
  children,
}: {
  scheduledId: string;
  dayId: string;
  index: number;
  children: (handle: {
    dragHandleProps: import("react").HTMLAttributes<HTMLSpanElement> & {
      ref?: import("react").Ref<HTMLSpanElement>;
    };
    isDragging: boolean;
  }) => import("react").ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: scheduledId,
    data: { type: "row" as const, dayId, index },
  });

  const style: import("react").CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handle = {
    dragHandleProps: {
      ref: setActivatorNodeRef,
      ...listeners,
      ...attributes,
    } as import("react").HTMLAttributes<HTMLSpanElement> & {
      ref?: import("react").Ref<HTMLSpanElement>;
    },
    isDragging,
  };

  return (
    <div ref={setNodeRef} style={style} data-row-id={scheduledId}>
      {children(handle)}
    </div>
  );
}

function DayDropContainer({
  dayId,
  endIndex,
  className,
  children,
}: {
  dayId: string;
  endIndex: number;
  className?: string;
  children: import("react").ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `day-end-${dayId}`,
    data: { type: "day-end" as const, dayId, index: endIndex },
  });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

/* ── Drag preview projection ──────────────────────────────────────── */

function applyDragPreview(
  days: TimelineV2MobileDayData[],
  preview: { scheduledId: string; targetDayId: string; targetIndex: number },
): TimelineV2MobileDayData[] {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);
  const fromIdx = sorted.findIndex((d) =>
    d.activities.some((x) => x.id === preview.scheduledId),
  );
  if (fromIdx === -1) return days;
  const fromDay = sorted[fromIdx];
  const target = fromDay.activities.find((x) => x.id === preview.scheduledId);
  if (!target) return days;
  const toIdx = sorted.findIndex((d) => d.id === preview.targetDayId);
  if (toIdx === -1) return days;
  const toDay = sorted[toIdx];

  const sourceActs = fromDay.activities.filter((a) => a.id !== target.id);
  const destBase =
    fromDay.id === toDay.id
      ? sourceActs
      : [...toDay.activities].sort((a, b) => a.position - b.position);
  const moved = { ...target, day_id: toDay.id };
  const idx = Math.max(0, Math.min(preview.targetIndex, destBase.length));
  const newDest = [
    ...destBase.slice(0, idx),
    moved,
    ...destBase.slice(idx),
  ].map((a, i) => ({ ...a, position: i + 1 }));

  return sorted.map((d) => {
    if (d.id === toDay.id) return { ...d, activities: newDest };
    if (d.id === fromDay.id && fromDay.id !== toDay.id) {
      return { ...d, activities: sourceActs.map((a, i) => ({ ...a, position: i + 1 })) };
    }
    return d;
  });
}

/* ── Atoms mobile-compact ─────────────────────────────────────────── */

/** Rail column width: 30px (vs 44px desktop). */
const M_RAIL_COL = "30px";
const M_GRID = { gridTemplateColumns: `${M_RAIL_COL} minmax(0,1fr)` } as const;

/** Rail compatto a 30px. */
function MRailCell({
  line = "solid",
  tone = "default",
}: {
  line?: "solid" | "dashed" | "none";
  tone?: "default" | "selected";
}) {
  return (
    <div className="relative flex justify-center self-stretch">
      {line === "solid" ? (
        <div
          className={cn(
            "absolute inset-y-0 w-[3px] rounded-full",
            tone === "selected" ? "bg-ink" : "bg-timeline-rail",
          )}
        />
      ) : line === "dashed" ? (
        <div
          className={cn(
            "absolute inset-y-0 border-l-2 border-dashed",
            tone === "selected" ? "border-ink/50" : "border-ink/20",
          )}
        />
      ) : null}
    </div>
  );
}

/* ── DayStrip — targhe orizzontali sticky ─────────────────────────── */

/** Targa data 40px nella strip orizzontale (day-selector). */
function DayStripPlate({
  dateIso,
  dayNumber,
  selected,
  onClick,
}: {
  dateIso: string | null;
  dayNumber: number;
  selected: boolean;
  onClick: () => void;
}) {
  const parts = dateIso
    ? formatDayParts(dateIso)
    : { weekday: "", dayNum: dayNumber, monthShort: "" };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Giorno ${dayNumber}`}
      className={cn(
        "flex aspect-square w-10 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border transition-colors",
        selected
          ? "border-ink bg-ink text-white"
          : "border-border-strong bg-surface text-ink hover:border-ink/40",
      )}
    >
      <span
        className={cn(
          "text-[8px] font-extrabold uppercase leading-none tracking-wide",
          selected ? "text-primary-tint" : "text-ink/45",
        )}
      >
        {parts.weekday}
      </span>
      <span className="mt-px text-[15px] font-bold leading-none">
        {parts.dayNum}
      </span>
      <span
        className={cn(
          "text-[7px] font-medium uppercase leading-none",
          selected ? "text-white/60" : "text-ink/40",
        )}
      >
        {parts.monthShort}
      </span>
    </button>
  );
}

function DayStrip({
  days,
  selectedDayId,
  onSelect,
}: {
  days: TimelineV2MobileDayData[];
  selectedDayId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="sticky top-0 z-10 -mx-2 flex items-center gap-1.5 overflow-x-auto border-b border-border bg-surface px-2 py-1.5"
      role="tablist"
      aria-label="Seleziona giorno"
    >
      {days.map((d) => (
        <DayStripPlate
          key={d.id}
          dateIso={d.date}
          dayNumber={d.day_number}
          selected={selectedDayId === d.id}
          onClick={() => onSelect(d.id)}
        />
      ))}
    </div>
  );
}

/* ── DayHeader mobile ─────────────────────────────────────────────── */

function MDayHeader({
  dateIso,
  dayNumber,
  expanded,
  onToggle,
}: {
  dateIso: string | null;
  dayNumber: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const parts = dateIso
    ? formatDayParts(dateIso)
    : { weekday: "", dayNum: dayNumber, monthShort: "" };
  const longLabel = dateIso ? formatLongLabel(dateIso) : `Giorno ${dayNumber}`;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={`${longLabel} — ${expanded ? "comprimi" : "espandi"} giorno`}
      onClick={onToggle}
      className="group/day grid w-full cursor-pointer items-center gap-x-2 text-left"
      style={M_GRID}
    >
      <div className="relative flex justify-center py-0.5">
        <div
          className={cn(
            "absolute inset-y-0 w-[3px] rounded-full",
            expanded ? "bg-ink" : "bg-timeline-rail",
          )}
        />
        <div
          className={cn(
            "relative z-10 flex aspect-square w-[30px] flex-col items-center justify-center rounded-sm border transition-colors",
            expanded
              ? "border-ink bg-ink text-white"
              : "border-border-strong bg-surface text-ink group-hover/day:border-ink/40",
          )}
        >
          <span
            className={cn(
              "text-[7px] font-extrabold uppercase leading-none",
              expanded ? "text-primary-tint" : "text-ink/45",
            )}
          >
            {parts.weekday}
          </span>
          <span className="text-[13px] font-bold leading-none">{parts.dayNum}</span>
        </div>
      </div>
      <div className="flex min-h-[30px] items-center gap-1.5 rounded-sm px-1 transition-colors group-hover/day:bg-surface-soft">
        <span className="truncate text-[12px] font-semibold text-ink">{longLabel}</span>
        <span className="shrink-0 text-[10px] text-ink-faint">G{dayNumber}</span>
        <span className="flex-1" />
        <IconChevronDown
          size={13}
          className={cn(
            "shrink-0 text-ink-faint transition-transform",
            expanded && "rotate-180 text-ink",
          )}
        />
      </div>
    </button>
  );
}

/* ── NightCard mobile ─────────────────────────────────────────────── */

function MNightCard({
  lodging,
  fromIso,
  toIso,
  open,
  hovered,
  onOpen,
  onClose,
  onAddressChange,
  onConvertToStop,
  onExtendStay,
  onReduceStay,
}: {
  lodging: LodgingVM;
  fromIso: string | null;
  toIso: string | null;
  open: boolean;
  hovered: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAddressChange?: (activityId: string, place: PlaceResult | null) => void | Promise<void>;
  onConvertToStop?: (stayId: string) => void | Promise<void>;
  onExtendStay?: (stayId: string) => void | Promise<void>;
  onReduceStay?: (stayId: string) => void | Promise<void>;
}) {
  if (open) {
    return (
      <div className="my-2" data-row-id={lodging.id}>
        <ActivityStop
          title={lodging.title}
          icon={lodging.icon}
          accent="primary"
          state="open"
          mode="sleep"
          nights={lodging.nightsTotal}
          nightIndex={lodging.nightIndex}
          addressLocation={lodging.address}
          addressPlaceId={lodging.placeId}
          addressLat={lodging.lat}
          addressLng={lodging.lng}
          onAddressChange={(place) => {
            if (lodging.activityId) void onAddressChange?.(lodging.activityId, place);
          }}
          onOpen={onOpen}
          onClose={onClose}
          onRemove={onClose}
          onModeChange={(next) => {
            if (next === "stop" && lodging.stayId) {
              void onConvertToStop?.(lodging.stayId);
            }
          }}
          onNightsChange={(next) => {
            if (!lodging.stayId) return;
            if (next > lodging.nightsTotal) void onExtendStay?.(lodging.stayId);
            else if (next < lodging.nightsTotal) void onReduceStay?.(lodging.stayId);
          }}
        />
      </div>
    );
  }

  const fromLabel = fromIso ? formatShortDate(fromIso) : "";
  const toLabel = toIso ? formatShortDate(toIso) : "";

  return (
    <button
      type="button"
      onClick={onOpen}
      data-row-id={lodging.id}
      aria-label={`Pernottamento ${lodging.title} — apri editor`}
      className="my-1.5 block w-full cursor-pointer text-left"
    >
      <div
        className={cn(
          "flex flex-col rounded-md px-2.5 py-1.5 transition-colors",
          hovered ? "bg-stay-hover" : "bg-stay hover:bg-stay-hover",
        )}
      >
        <div className="flex items-center justify-between text-[10px] text-stay-text">
          <span className="tabular-nums">
            <span className="font-semibold text-ink">22:00</span> · check-in
          </span>
          <span>{fromLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 py-1">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-xs bg-primary text-white">
            <lodging.icon size={12} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">
            {lodging.title}
          </span>
          <span className="shrink-0 text-[9px] text-stay-text">
            {lodging.nightIndex}/{lodging.nightsTotal}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-ink/15 pt-1 text-[10px] text-stay-text">
          <span className="tabular-nums">
            <span className="font-semibold text-ink">09:00</span> · check-out
          </span>
          <span>{toLabel}</span>
        </div>
      </div>
    </button>
  );
}

/* ── End of trip ──────────────────────────────────────────────────── */

function MEndOfTrip() {
  return (
    <div className="mt-1 grid items-center gap-x-2" style={M_GRID}>
      <div className="flex justify-center py-1">
        <div className="h-1 w-6 bg-ink/15" />
      </div>
      <span className="text-[10px] text-ink-faint">Fine viaggio</span>
    </div>
  );
}

/* ── TimelineV2Mobile ─────────────────────────────────────────────── */

export function TimelineV2Mobile({
  days,
  chain,
  computedBridges,
  injectSampleTransfers = false,
  onSelectDay,
  onSelectActivity,
  onRemoveActivity,
  onMoveActivity,
  onDragMove,
  onConvertToSleep,
  onConvertToStop,
  onExtendStay,
  onReduceStay,
  onAddressChange,
  onUpdateActivityInstance,
  openOverride,
  hoveredRowId,
  className,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hoveredRowId) return;
    const root = rootRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-row-id="${hoveredRowId}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [hoveredRowId]);

  const collisionDetection: CollisionDetection = (args) => {
    const containers = args.droppableContainers;
    const rowContainers = containers.filter(
      (c) => (c.data.current as { type?: string } | undefined)?.type === "row",
    );
    const onRow = pointerWithin({ ...args, droppableContainers: rowContainers });
    if (onRow.length > 0) return onRow;
    const dayContainers = containers.filter(
      (c) => (c.data.current as { type?: string } | undefined)?.type === "day-end",
    );
    return closestCenter({ ...args, droppableContainers: dayContainers });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const originalLocation = new Map<string, { dayId: string; index: number }>();
  for (const d of days) {
    const acts = [...d.activities]
      .sort((a, b) => a.position - b.position)
      .filter((a) => a.fuzzy !== true);
    acts.forEach((a, i) => originalLocation.set(a.id, { dayId: d.id, index: i }));
  }

  type DropTarget = { dayId: string; index: number };
  const resolveDropTarget = (event: DragEndEvent): DropTarget | null => {
    const { over } = event;
    if (!over) return null;
    const orig = originalLocation.get(String(over.id));
    if (orig) return { dayId: orig.dayId, index: orig.index };
    const d = over.data.current as
      | { type?: "row" | "day-empty"; dayId?: string; index?: number }
      | undefined;
    if (!d?.dayId) return null;
    return { dayId: d.dayId, index: d.index ?? 0 };
  };

  const [dragPreview, setDragPreview] = useState<{
    scheduledId: string;
    targetDayId: string;
    targetIndex: number;
  } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    setOpenId(null);
    setActiveDragId(String(e.active.id));
    setDragPreview(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (over && over.id === active.id) return;
    let next: typeof dragPreview = null;
    if (over) {
      const activeOrig = originalLocation.get(String(active.id));
      const overOrig = originalLocation.get(String(over.id));
      const overData = over.data.current as
        | { type?: string; dayId?: string; index?: number }
        | undefined;
      if (activeOrig && overOrig && activeOrig.dayId !== overOrig.dayId) {
        next = {
          scheduledId: String(active.id),
          targetDayId: overOrig.dayId,
          targetIndex: overOrig.index,
        };
      } else if (
        activeOrig &&
        overData?.type === "day-end" &&
        overData.dayId &&
        overData.dayId !== activeOrig.dayId
      ) {
        next = {
          scheduledId: String(active.id),
          targetDayId: overData.dayId,
          targetIndex: overData.index ?? 0,
        };
      }
    }
    setDragPreview((prev) => {
      if (prev === null && next === null) return prev;
      if (
        prev &&
        next &&
        prev.scheduledId === next.scheduledId &&
        prev.targetDayId === next.targetDayId &&
        prev.targetIndex === next.targetIndex
      ) {
        return prev;
      }
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const preview = dragPreview;
    setDragPreview(null);
    if (preview) {
      void onDragMove?.(preview.scheduledId, preview.targetDayId, preview.targetIndex);
      return;
    }
    const target = resolveDropTarget(event);
    if (!target) return;
    const scheduledId = String(event.active.id);
    const source = event.active.data.current as
      | { dayId?: string; index?: number }
      | undefined;
    if (
      source?.dayId === target.dayId &&
      (source?.index === target.index || source?.index === target.index - 1)
    )
      return;
    void onDragMove?.(scheduledId, target.dayId, target.index);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setDragPreview(null);
  };

  useEffect(() => {
    onSelectActivity?.(openId);
  }, [openId, onSelectActivity]);

  const [lastOpenOverride, setLastOpenOverride] = useState(openOverride);
  if (openOverride !== lastOpenOverride) {
    setLastOpenOverride(openOverride);
    if (openOverride !== undefined) setOpenId(openOverride);
  }

  const selectDay = (id: string) => {
    const isCurrent = selectedDayId === id;
    const next = isCurrent ? null : id;
    setSelectedDayId(next);
    onSelectDay?.(next);
  };

  const previewDays = dragPreview ? applyDragPreview(days, dragPreview) : days;
  const sortedDays = [...previewDays].sort((a, b) => a.day_number - b.day_number);

  const sortableIdsByDay = new Map<string, string[]>();
  const sortableIndexByDay = new Map<string, Map<string, number>>();
  for (const d of sortedDays) {
    const ids: string[] = [];
    const dayMap = new Map<string, number>();
    const acts = [...d.activities].sort((a, b) => a.position - b.position);
    for (const a of acts) {
      if (a.fuzzy === true) continue;
      dayMap.set(a.id, ids.length);
      ids.push(a.id);
    }
    sortableIdsByDay.set(d.id, ids);
    sortableIndexByDay.set(d.id, dayMap);
  }

  const activeDragActivity = activeDragId
    ? sortedDays.flatMap((d) => d.activities).find((a) => a.id === activeDragId) ?? null
    : null;

  const firstDayId = sortedDays[0]?.id ?? null;
  const lastDayId = sortedDays[sortedDays.length - 1]?.id ?? null;
  const firstActivityIdByDay = new Map<string, string>();
  const lastActivityIdByDay = new Map<string, string>();
  for (const d of sortedDays) {
    const acts = [...d.activities].sort((a, b) => a.position - b.position);
    if (acts.length > 0) {
      firstActivityIdByDay.set(d.id, acts[0].id);
      lastActivityIdByDay.set(d.id, acts[acts.length - 1].id);
    }
  }
  const isFirstOfTrip = (dayId: string, activityId: string): boolean =>
    dayId === firstDayId && firstActivityIdByDay.get(dayId) === activityId;
  const isLastOfTrip = (dayId: string, activityId: string): boolean =>
    dayId === lastDayId && lastActivityIdByDay.get(dayId) === activityId;

  const chainPrevByDay = new Map<string, string>();
  if (chain && chain.length > 1) {
    for (let i = 1; i < chain.length; i++) {
      const prev = chain[i - 1];
      const curr = chain[i];
      if (curr.kind !== "activity") continue;
      if (chainPrevByDay.has(curr.dayId)) continue;
      chainPrevByDay.set(curr.dayId, prev.id);
    }
  }

  return (
    <DndContext
      id="explore-timeline-v2-mobile"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={rootRef}
        className={cn("flex w-full flex-col rounded-lg bg-surface px-2 pb-2", className)}
      >
        {/* Day strip sticky in cima — day-selector orizzontale. */}
        <DayStrip
          days={sortedDays}
          selectedDayId={selectedDayId}
          onSelect={selectDay}
        />

        <div className="flex flex-col pt-1">
          {sortedDays.map((day, dayIdx) => {
            const expanded = selectedDayId === day.id;
            // dayLoad: utile in futuro per una FillBar mobile. La targa
            // header mobile non la mostra (la fill è già letta dal
            // colore del giorno selezionato).
            void computeDayLoad(day.activities);
            const items = buildItems(
              day.activities,
              expanded,
              injectSampleTransfers,
              computedBridges,
              chainPrevByDay.get(day.id) ?? null,
            );
            const lodging = buildLodging(day.accommodation, day.id);
            const showNotes = expanded && !!day.notes;
            const nextDay = sortedDays[dayIdx + 1];

            const dayActsOrdered = [...day.activities]
              .filter((x) => x.fuzzy !== true)
              .sort((x, y) => x.position - y.position);
            const dayTimes = computeDayTimes({
              activities: dayActsOrdered,
              bridges: computedBridges,
              prevChainId: chainPrevByDay.get(day.id) ?? null,
            }).byId;

            const dayIds = sortableIdsByDay.get(day.id) ?? [];
            const sortableIndexOf =
              sortableIndexByDay.get(day.id) ?? new Map<string, number>();

            const tone = expanded ? ("selected" as const) : ("default" as const);

            return (
              <div key={day.id} className="flex flex-col">
                <MDayHeader
                  dateIso={day.date}
                  dayNumber={day.day_number}
                  expanded={expanded}
                  onToggle={() => selectDay(day.id)}
                />
                <DayDropContainer
                  dayId={day.id}
                  endIndex={dayIds.length}
                  className={cn(
                    "flex flex-col",
                    expanded && "rounded-md bg-surface-soft ring-1 ring-ink/10",
                  )}
                >
                  <SortableContext items={dayIds} strategy={verticalListSortingStrategy}>
                    {items.map((item) => {
                      if (item.kind === "transfer") {
                        const open = openId === item.id;
                        // Visibilità transfer: solo a giorno espanso, salvo
                        // open. Allineato a /design/timeline-readability it.10
                        // — qui semplifichiamo: muted quando non espanso.
                        if (!expanded && !open) {
                          return (
                            <div
                              key={item.id}
                              className="grid items-center gap-x-2"
                              style={M_GRID}
                            >
                              <MRailCell line="dashed" tone={tone} />
                              <div aria-hidden className="h-2.5" />
                            </div>
                          );
                        }
                        return (
                          <div
                            key={item.id}
                            className="grid items-center gap-x-2"
                            style={M_GRID}
                          >
                            <MRailCell line="dashed" tone={tone} />
                            <div className="py-0.5 pl-0.5">
                              <Transfer
                                mode={item.transfer.mode}
                                state={open ? "open" : "default"}
                                duration={item.transfer.duration}
                                legs={item.transfer.legs}
                                steps={item.transfer.steps}
                                destination={item.transfer.destination}
                                onOpen={() => setOpenId(item.id)}
                                onClose={() => setOpenId(null)}
                              />
                            </div>
                          </div>
                        );
                      }

                      const a = item.activity;
                      const open = openId === a.id;
                      const hovered = !open && hoveredRowId === a.id;
                      const fuzzy = a.fuzzy === true;
                      const Icon = getStopIcon(a.icon) ?? IconMapPin;
                      const rowTime = !fuzzy && expanded && a.time ? a.time : undefined;

                      const handleRemove = () => {
                        setOpenId(null);
                        onRemoveActivity?.(a.id);
                      };

                      if (fuzzy) {
                        return (
                          <div
                            key={a.id}
                            data-row-id={a.id}
                            className="grid items-center gap-x-2"
                            style={M_GRID}
                          >
                            <MRailCell line="solid" tone={tone} />
                            <div className="py-0.5">
                              <FuzzyStop
                                title={a.title}
                                icon={Icon}
                                size="sm"
                                state={open ? "open" : hovered ? "selected" : "default"}
                                description={a.short_desc ?? undefined}
                                onOpen={() => setOpenId(a.id)}
                                onClose={() => setOpenId(null)}
                                onRemove={handleRemove}
                              />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <SortableActivityRow
                          key={a.id}
                          scheduledId={a.id}
                          dayId={day.id}
                          index={sortableIndexOf.get(a.id) ?? 0}
                        >
                          {({ dragHandleProps, isDragging }) => {
                            const t = dayTimes.get(a.id);
                            const arrivalHM = t
                              ? { hour: Math.floor(t.arrivalMin / 60), minute: t.arrivalMin % 60 }
                              : null;
                            const departureHM = t
                              ? { hour: Math.floor(t.departureMin / 60), minute: t.departureMin % 60 }
                              : null;
                            const durationMin = a.duration_min ?? DEFAULT_ACTIVITY_DURATION_MIN;
                            const arrivalDateLabel =
                              arrivalHM && day.date
                                ? formatChipDate(day.date, t?.arrivalDayOffset ?? 0)
                                : undefined;
                            const departureDateLabel =
                              departureHM && day.date
                                ? formatChipDate(day.date, t?.departureDayOffset ?? 0)
                                : undefined;
                            return (
                              <div
                                className="grid items-center gap-x-2"
                                style={M_GRID}
                              >
                                <MRailCell line="solid" tone={tone} />
                                <div className="py-0.5">
                                  <ActivityStop
                                    dragHandleProps={dragHandleProps}
                                    isDragging={isDragging}
                                    title={a.title}
                                    icon={Icon}
                                    size="sm"
                                    state={open ? "open" : hovered ? "selected" : "default"}
                                    mode="stop"
                                    timeRange={a.time ?? "—"}
                                    time={rowTime}
                                    description={a.short_desc ?? undefined}
                                    arrivalHM={arrivalHM ?? undefined}
                                    departureHM={departureHM ?? undefined}
                                    arrivalDateLabel={arrivalDateLabel}
                                    departureDateLabel={departureDateLabel}
                                    durationMin={durationMin}
                                    onArrivalChange={(hm) => {
                                      void onUpdateActivityInstance?.(a.id, {
                                        time: formatHMForDb(hm),
                                      });
                                    }}
                                    onDepartureChange={(hm) => {
                                      if (!arrivalHM) return;
                                      const newDur = diffMinutesHM(arrivalHM, hm);
                                      void onUpdateActivityInstance?.(a.id, {
                                        duration_min: newDur,
                                      });
                                    }}
                                    onDurationChange={(min) => {
                                      void onUpdateActivityInstance?.(a.id, {
                                        duration_min: min,
                                      });
                                    }}
                                    addressLocation={a.location}
                                    addressPlaceId={a.location_place_id}
                                    addressLat={a.location_lat}
                                    addressLng={a.location_lng}
                                    onAddressChange={(place) => {
                                      const entityId = a.activity_id ?? a.entity_id ?? null;
                                      if (entityId) void onAddressChange?.(entityId, place);
                                    }}
                                    onOpen={() => setOpenId(a.id)}
                                    onClose={() => setOpenId(null)}
                                    onRemove={handleRemove}
                                    onMoveUp={
                                      onMoveActivity ? () => onMoveActivity(a.id, "up") : undefined
                                    }
                                    onMoveDown={
                                      onMoveActivity
                                        ? () => onMoveActivity(a.id, "down")
                                        : undefined
                                    }
                                    canMoveUp={!isFirstOfTrip(day.id, a.id)}
                                    canMoveDown={!isLastOfTrip(day.id, a.id)}
                                    onModeChange={(next) => {
                                      if (next === "sleep") {
                                        void onConvertToSleep?.(a.id);
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          }}
                        </SortableActivityRow>
                      );
                    })}
                  </SortableContext>

                  {showNotes ? (
                    <div className="grid items-stretch gap-x-2" style={M_GRID}>
                      <MRailCell line="solid" tone={tone} />
                      <div className="py-1.5">
                        <div className="flex flex-col gap-1 rounded-sm bg-surface-warm/80 p-2">
                          <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-primary">
                            Today notes
                          </p>
                          <p className="whitespace-pre-line text-[11px] leading-relaxed text-ink">
                            {day.notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DayDropContainer>

                {lodging ? (
                  <MNightCard
                    lodging={lodging}
                    fromIso={day.date}
                    toIso={nextDay?.date ?? null}
                    open={openId === lodging.id}
                    hovered={openId !== lodging.id && hoveredRowId === lodging.id}
                    onOpen={() => setOpenId(lodging.id)}
                    onClose={() => setOpenId(null)}
                    onAddressChange={onAddressChange}
                    onConvertToStop={onConvertToStop}
                    onExtendStay={onExtendStay}
                    onReduceStay={onReduceStay}
                  />
                ) : null}
              </div>
            );
          })}

          <MEndOfTrip />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragActivity ? (
          <ActivityStop
            title={activeDragActivity.title}
            icon={getStopIcon(activeDragActivity.icon) ?? IconMapPin}
            size="sm"
            mode="stop"
            state="default"
            time={activeDragActivity.time ?? undefined}
            className="bg-surface shadow-float opacity-95 rounded-sm"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
