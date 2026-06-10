"use client";

/**
 * features/explore/TimelineV2.tsx
 * ─────────────────────────────────────────────────────────────────
 * Timeline V2 — porting del prototipo `/design/timeline-readability` V1
 * (Route Rail + Night Divider, congelata it.6) sui dati reali della
 * Explore Timeline. Drop-in compatible con `Timeline`: stessi Props,
 * stesso behaviour, solo il LOOK cambia.
 *
 * Layout chiave:
 *  - Rail 44px continuo a sinistra (collapsed: bg-timeline-rail;
 *    selected day: bg-ink + ring sul blocco contenuti).
 *  - DayHeader = targa data 44px DENTRO la rail-cell + label estesa +
 *    fillBar + chevron-down sempre visibile.
 *  - Stop / Transfer / Fuzzy / TodayNotes vivono dentro il blocco
 *    contenuti del giorno; transfer = rail dashed.
 *  - Banda notte (NightBand) FRA i giorni, FUORI dal grid del giorno:
 *    card bianca a 3 righe (check-in / nome / check-out). Multi-notte
 *    → una banda per notte. Cliccando si apre l'editor reale
 *    (ActivityStop in mode="sleep") con tutta la logica esistente.
 *
 * Componenti reali riusati senza modifica:
 *  - ActivityStop (collapsed e open per stop e per lodging)
 *  - Transfer (collapsed e open, intra-day e cross-day incoming)
 *  - FuzzyStop
 *
 * Il file vecchio `Timeline.tsx` NON viene toccato.
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
import { useTranslations } from "next-intl";
import { EditableText } from "@/components/ui/EditableText";
import { ActivityStop } from "./ActivityStop";
import { StopIconBadge } from "./StopIconBadge";
import type { PlaceResult } from "@/components/ui/AddressField";
import { FuzzyStop } from "./FuzzyStop";
import { Transfer, type TransferDestination, type TransferLeg, type TransferStep } from "./Transfer";
import type { AccommodationDisplay } from "./resolveAccommodations";
import { computeDayTimes, DEFAULT_ACTIVITY_DURATION_MIN } from "@/lib/scheduling/computeDayTimes";

/* ── Public types — same shape as Timeline (drop-in) ──────────────── */

export type TimelineV2DayData = Day & {
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
  days: TimelineV2DayData[];
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
  /**
   * Cambio icona dal IconPicker (StopIconBadge nell'open card). Riceve
   * l'activity entity id (NON lo scheduled id) e la nuova icon key. La
   * scrittura va su `activities.icon` — l'icona è dato di entità, non
   * dell'istanza schedulata.
   */
  onIconChange?: (activityId: string, iconKey: string) => void | Promise<void>;
  /** Editing inline del titolo (activities.title). Riceve l'entity id. */
  onTitleChange?: (activityId: string, title: string) => void | Promise<void>;
  /** Editing inline della descrizione (activities.short_desc). */
  onShortDescChange?: (activityId: string, shortDesc: string) => void | Promise<void>;
  /** Editing inline delle note del giorno (days.notes). */
  onDayNotesChange?: (dayId: string, notes: string) => void | Promise<void>;
  onUpdateActivityInstance?: (
    scheduledId: string,
    patch: { time?: string | null; duration_min?: number | null },
  ) => void | Promise<void>;
  openOverride?: string | null;
  hoveredRowId?: string | null;
  className?: string;
};

/* ── Date / clock helpers ─────────────────────────────────────────── */

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

/** "WED" / "5" / "AGO" — pezzi della targa data del DayHeader V2. */
function formatDayParts(iso: string): { weekday: string; dayNum: number; monthShort: string } {
  const d = localDate(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const monthShort = d
    .toLocaleDateString("it-IT", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  return { weekday, dayNum: d.getDate(), monthShort };
}

/** "Mercoledì 5 Agosto" — label estesa a destra della targa. */
function formatLongLabel(iso: string): string {
  const d = localDate(iso);
  const weekdayLong = d.toLocaleDateString("it-IT", { weekday: "long" });
  const day = d.getDate();
  const monthLong = d.toLocaleDateString("it-IT", { month: "long" });
  return `${weekdayLong[0].toUpperCase()}${weekdayLong.slice(1)} ${day} ${monthLong[0].toUpperCase()}${monthLong.slice(1)}`;
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
  /** Distanza già formattata (es. "32 km", "480 m"). Undefined quando il
   *  leg non ha distance_m (bridge legacy persistito, fallback senza geo). */
  distance?: string;
  /** Minuti grezzi del leg — usati dall'host per decidere `muted` (giorni
   *  collapsed: i leg >= 60 min restano comunque visibili, /design
   *  /timeline-readability it.10). */
  durationMin: number;
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

/** Formatta metri in user-facing: < 1 km → "X m", < 10 km → "Y,Z km" a 1
 *  decimale, ≥ 10 km → "Z km" arrotondato. */
function formatDistanceMeters(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "0 m";
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function bridgeTransfer(b: BridgeData, destination?: TransferDestination): TransferVM {
  const carLike = b.transport === "car" || b.transport === "taxi";
  const duration = formatDurationMin(b.duration_min);
  const durationMin = Number.isFinite(b.duration_min) ? b.duration_min : 0;
  const distance =
    typeof b.distance_m === "number" && b.distance_m > 0
      ? formatDistanceMeters(b.distance_m)
      : undefined;
  if (carLike) return { mode: "car", duration, distance, durationMin, legs: [], steps: [], destination };
  return {
    mode: "transit",
    duration,
    distance,
    durationMin,
    legs: [{ kind: "bus", label: b.line ?? "—" }],
    steps: [{ kind: "bus", title: b.line ? `${b.line} ·` : "Transit", place: b.stops ?? undefined, subtitle: b.note ?? undefined }],
  };
}

function destinationFromActivity(a: Activity): TransferDestination | undefined {
  if (a.location_lat == null || a.location_lng == null) return undefined;
  return { lat: a.location_lat, lng: a.location_lng, placeId: a.location_place_id, title: a.title };
}

/* ── Item model (stop column) ─────────────────────────────────────── */

type Item =
  | { kind: "activity"; activity: Activity }
  | { kind: "transfer"; id: string; transfer: TransferVM };

type LodgingVM = {
  id: string;
  title: string;
  /** Descrizione breve della Property che backa lo stay (activities.short_desc).
   *  Solo canonical resolver — null dal legacy. */
  shortDesc: string | null;
  icon: IconCmp;
  /** Icon key sull'entità Property (activities.icon). Quando set, l'icon
   *  componente sopra è già `getStopIcon(iconKey)`; manteniamo la key per
   *  passarla al IconPicker e segnalare la selezione corrente. */
  iconKey: string | null;
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

  // Transfer (incoming cross-day + activity↔activity intra-day): renderizzati
  // SOLO a giorno espanso. Niente spacer muted, niente eccezione per leg
  // lunghi — i giorni collapsed compattano davvero lo spazio verticale
  // (decisione utente, supera l'eccezione documentata in it.10).
  if (expanded && incomingChainPrevId && visible.length > 0) {
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
    if (!expanded) return; // collapsed: niente transfer fra le tappe.
    const next = visible[i + 1];
    const saved = activity.bridge_out_json;
    const computed = computedBridges?.get(`${activity.id}|${next.id}`);
    // Saved vince su tutto tranne distance_m: i bridge persistiti pre-feature
    // non hanno la distanza salvata, e il computed di sessione ce l'ha — la
    // backfillamo così l'utente vede subito i km senza un refresh "magico"
    // dopo che useChainBridges riscrive il bridge.
    const bridge: BridgeData | null = saved && computed
      ? { ...saved, distance_m: saved.distance_m ?? computed.distance_m ?? null }
      : saved ?? computed ?? null;
    if (bridge) {
      items.push({
        kind: "transfer",
        id: `${activity.id}-br`,
        transfer: bridgeTransfer(bridge, destinationFromActivity(next)),
      });
    } else if (injectSample && expanded) {
      // Sample injectato solo a giorno espanso: 46 min è sotto la soglia,
      // quindi sui collapsed sparisce comunque.
      items.push({
        kind: "transfer",
        id: `${activity.id}-sample`,
        transfer: { mode: "transit", duration: "46 min", durationMin: 46, legs: SAMPLE_LEGS, steps: SAMPLE_STEPS },
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
  // L'icona viene risolta in cascade: prima activities.icon (se presente),
  // poi mappa per `accommodation.type`, poi fallback IconBed.
  const fromKey = accommodation.iconKey ? getStopIcon(accommodation.iconKey) : null;
  return {
    id: `lodging-${dayId}`,
    title: accommodation.name,
    shortDesc: accommodation.short_desc ?? null,
    icon: fromKey ?? accommodationIcon(accommodation.type),
    iconKey: accommodation.iconKey ?? null,
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

/* ── DnD wrappers ─────────────────────────────────────────────────── */

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
  days: TimelineV2DayData[],
  preview: { scheduledId: string; targetDayId: string; targetIndex: number },
): TimelineV2DayData[] {
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

/* ── Atoms ────────────────────────────────────────────────────────── */

const RAIL_COL = "44px";

/** Rail cell — la stripe verticale di sinistra (44px) col line solid/dashed. */
function RailCell({
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

/** FillBar — usata nell'header del giorno (replica del prototipo). */
function FillBar({ pct, overflow }: { pct: number; overflow?: boolean }) {
  return (
    <span className="inline-block h-1 w-12 overflow-hidden rounded-full bg-ink/10">
      <span
        className={cn(
          "block h-full rounded-full",
          overflow ? "bg-warning-fg" : "bg-success-fg",
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/* ── DayHeader V2 ─────────────────────────────────────────────────── */

function DayHeaderV2({
  dateIso,
  dayNumber,
  fillPct,
  overflow,
  expanded,
  onToggle,
}: {
  dateIso: string | null;
  dayNumber: number;
  fillPct: number;
  overflow: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const parts = dateIso ? formatDayParts(dateIso) : { weekday: "", dayNum: dayNumber, monthShort: "" };
  const longLabel = dateIso ? formatLongLabel(dateIso) : `Giorno ${dayNumber}`;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={`${longLabel} — ${expanded ? "comprimi" : "espandi"} giorno`}
      onClick={onToggle}
      className="group/day grid w-full cursor-pointer items-center gap-x-3 text-left"
      style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
    >
      <div className="relative flex justify-center py-1">
        {/* Rail-stub dentro la cella header: collega visivamente con il rail
            del blocco contenuti sotto. */}
        <div
          className={cn(
            "absolute inset-y-0 w-[3px] rounded-full",
            expanded ? "bg-ink" : "bg-timeline-rail",
          )}
        />
        <div
          className={cn(
            "relative z-10 flex aspect-square w-11 flex-col items-center justify-center rounded-md border transition-colors",
            expanded
              ? "border-ink bg-ink text-white"
              : "border-border-strong bg-surface text-ink shadow-xs group-hover/day:border-ink/40",
          )}
        >
          <span
            className={cn(
              "text-[9px] font-extrabold uppercase leading-none tracking-wide",
              expanded ? "text-primary-tint" : "text-ink/45",
            )}
          >
            {parts.weekday}
          </span>
          <span className="mt-0.5 text-[17px] font-bold leading-none">
            {parts.dayNum}
          </span>
          <span
            className={cn(
              "text-[8px] font-medium uppercase leading-none",
              expanded ? "text-white/60" : "text-ink/40",
            )}
          >
            {parts.monthShort}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors group-hover/day:bg-surface-soft">
        <span className="truncate text-[15px] font-semibold text-ink">
          {longLabel}
        </span>
        <span className="shrink-0 text-[11px] text-ink-soft">G{dayNumber}</span>
        <span className="flex-1" />
        <FillBar pct={fillPct} overflow={overflow} />
        <IconChevronDown
          size={15}
          className={cn(
            "shrink-0 text-ink-faint transition-transform group-hover/day:text-ink",
            expanded && "rotate-180 text-ink",
          )}
        />
      </div>
    </button>
  );
}

/* ── NightBand V2 ─────────────────────────────────────────────────── */

/**
 * Banda notte FRA i giorni — collapsed: card a UNA RIGA (it.12) come una
 * stop card normale, con sfondo stay soft. Mostra solo riquadro icona
 * (tipo struttura) + nome + "Notte N di M" a destra. Orari e date
 * check-in/check-out vivono nel detail/editor (TimePair). Quando aperta,
 * ospita il vero `ActivityStop` mode="sleep" con tutta la logica
 * esistente (toggle sleep↔stop, stepper notti, address change, remove).
 */
function NightBandV2({
  lodging,
  open,
  hovered,
  onOpen,
  onClose,
  onAddressChange,
  onIconChange,
  onTitleChange,
  onShortDescChange,
  onConvertToStop,
  onExtendStay,
  onReduceStay,
}: {
  lodging: LodgingVM;
  open: boolean;
  hovered: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAddressChange?: (activityId: string, place: PlaceResult | null) => void | Promise<void>;
  onIconChange?: (activityId: string, iconKey: string) => void | Promise<void>;
  onTitleChange?: (activityId: string, title: string) => void | Promise<void>;
  onShortDescChange?: (activityId: string, shortDesc: string) => void | Promise<void>;
  onConvertToStop?: (stayId: string) => void | Promise<void>;
  onExtendStay?: (stayId: string) => void | Promise<void>;
  onReduceStay?: (stayId: string) => void | Promise<void>;
}) {
  // Open state: stessa ActivityStop usata dall'editor di prima.
  if (open) {
    return (
      <div className="my-2" data-row-id={lodging.id}>
        <ActivityStop
          title={lodging.title}
          icon={lodging.icon}
          iconKey={lodging.iconKey}
          onIconChange={onIconChange && lodging.activityId ? (key) => {
            void onIconChange(lodging.activityId!, key);
          } : undefined}
          accent="primary"
          state="open"
          mode="sleep"
          description={lodging.shortDesc ?? undefined}
          nights={lodging.nightsTotal}
          nightIndex={lodging.nightIndex}
          addressLocation={lodging.address}
          addressPlaceId={lodging.placeId}
          addressLat={lodging.lat}
          addressLng={lodging.lng}
          onAddressChange={(place) => {
            if (lodging.activityId) void onAddressChange?.(lodging.activityId, place);
          }}
          onTitleCommit={onTitleChange && lodging.activityId ? (next) => {
            void onTitleChange(lodging.activityId!, next);
          } : undefined}
          onShortDescCommit={onShortDescChange && lodging.activityId ? (next) => {
            void onShortDescChange(lodging.activityId!, next);
          } : undefined}
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

  return (
    <button
      type="button"
      onClick={onOpen}
      data-row-id={lodging.id}
      aria-label={`Pernottamento ${lodging.title} — apri editor`}
      className={cn(
        "group my-2 block w-full cursor-pointer text-left",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 transition-colors",
          hovered ? "border-ink/50" : "border-border-strong hover:border-ink/50",
        )}
      >
        <StopIconBadge icon={lodging.icon} tone="primary" />
        <span className="min-w-0 flex-1 truncate text-meta font-medium text-ink">
          {lodging.title}
        </span>
        <span className="shrink-0 text-[11px] text-ink-soft">
          Notte {lodging.nightIndex} di {lodging.nightsTotal}
        </span>
      </div>
    </button>
  );
}

/* ── End of trip ──────────────────────────────────────────────────── */

function EndOfTripV2() {
  return (
    <div
      className="mt-1 grid items-center gap-x-3"
      style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
    >
      <div className="flex justify-center py-1">
        <div className="h-1 w-9 bg-ink/15" />
      </div>
      <span className="text-[11px] text-ink-faint">Fine viaggio</span>
    </div>
  );
}

/* ── TimelineV2 ───────────────────────────────────────────────────── */

export function TimelineV2({
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
  onIconChange,
  onTitleChange,
  onShortDescChange,
  onDayNotesChange,
  onUpdateActivityInstance,
  openOverride,
  hoveredRowId,
  className,
}: Props) {
  const t = useTranslations("Explore");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Scroll-into-view per la row in hover (sync con i pin in mappa). Porta in
  // cima il GIORNO che contiene la row (DayBadge come primo elemento
  // visibile), non la row singola: la querySelector trova la row,
  // closest('[data-day-id]') risale al DayDropContainer di quel giorno e
  // `scrollIntoView({block:"start"})` lo allinea al top del container
  // scrollabile. Self-clamping quando il giorno è già abbastanza in fondo.
  // Fallback alla row stessa nel caso teorico in cui il day wrapper manchi.
  //
  // Debounce 300ms: passare velocemente sopra più pin con il mouse non deve
  // sparare uno scroll per ogni pin attraversato — solo se l'utente resta
  // fermo per ≥ 300ms su un pin ci interessa portare il suo giorno in cima.
  useEffect(() => {
    if (!hoveredRowId) return;
    const root = rootRef.current;
    if (!root) return;
    const timer = window.setTimeout(() => {
      const row = root.querySelector<HTMLElement>(`[data-row-id="${hoveredRowId}"]`);
      if (!row) return;
      const target = row.closest<HTMLElement>("[data-day-id]") ?? row;
      target.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [hoveredRowId]);

  // ── DnD: sensors + collision detection (copia dal Timeline v1) ───
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

  // Lookup originale (pre-preview) di (dayId, index) per ogni scheduled id.
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
    ) return;
    void onDragMove?.(scheduledId, target.dayId, target.index);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setDragPreview(null);
  };

  // Bubble openId → host (selectedActivityId per Add-to-Trip downstream).
  useEffect(() => {
    onSelectActivity?.(openId);
  }, [openId, onSelectActivity]);

  // openOverride sync (pattern "adjust during render" — react.dev).
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

  // Drag preview projection sui days → sortedDays.
  const previewDays = dragPreview ? applyDragPreview(days, dragPreview) : days;
  const sortedDays = [...previewDays].sort((a, b) => a.day_number - b.day_number);

  // Sortable IDs per day (verticalListSortingStrategy scoped).
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

  // DragOverlay ghost lookup.
  const activeDragActivity = activeDragId
    ? sortedDays.flatMap((d) => d.activities).find((a) => a.id === activeDragId) ?? null
    : null;

  // Move guards (trip-absolute first / last).
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

  // chainPrev per day → incoming Transfer cross-day.
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
      id="explore-timeline-v2"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={rootRef}
        className={cn("flex w-full flex-col rounded-lg bg-surface p-2", className)}
      >
        {sortedDays.map((day) => {
          const expanded = selectedDayId === day.id;
          const dayLoad = computeDayLoad(day.activities);
          const items = buildItems(
            day.activities,
            expanded,
            injectSampleTransfers,
            computedBridges,
            chainPrevByDay.get(day.id) ?? null,
          );
          const lodging = buildLodging(day.accommodation, day.id);
          // Note editabili: visibile (anche da vuoto, con placeholder) quando
          // il giorno è espanso E il parent passa l'handler. Altrimenti, fallback
          // legacy: solo se ci sono note salvate.
          const showNotes = expanded && (!!onDayNotesChange || !!day.notes);

          // Solver tempi: arrivo/partenza per ogni activity del giorno.
          const dayActsOrdered = [...day.activities]
            .filter((x) => x.fuzzy !== true)
            .sort((x, y) => x.position - y.position);
          const dayTimes = computeDayTimes({
            activities: dayActsOrdered,
            bridges: computedBridges,
            prevChainId: chainPrevByDay.get(day.id) ?? null,
          }).byId;

          const dayIds = sortableIdsByDay.get(day.id) ?? [];
          const sortableIndexOf = sortableIndexByDay.get(day.id) ?? new Map<string, number>();

          // Tone del rail: ink quando il giorno è selected, rail-soft altrimenti.
          const tone = expanded ? ("selected" as const) : ("default" as const);

          return (
            <div key={day.id} className="flex flex-col" data-day-id={day.id}>
              <DayHeaderV2
                dateIso={day.date}
                dayNumber={day.day_number}
                fillPct={dayLoad.fillPct}
                overflow={dayLoad.overflow}
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
                      // Spec /design/timeline-readability it.10: i Transfer
                      // appaiono SOLO a giorno espanso (eccezione leg lunghi
                      // ≥ 60 min, gestita upstream in `buildItems`). Sui
                      // giorni collapsed non vengono proprio renderizzati
                      // — niente spacer muted, lo spazio verticale si
                      // compatta davvero.
                      return (
                        <div
                          key={item.id}
                          className="grid items-center gap-x-3"
                          style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
                        >
                          <RailCell line="dashed" tone={tone} />
                          <div className="py-1 pl-1">
                            <Transfer
                              mode={item.transfer.mode}
                              state={open ? "open" : "default"}
                              duration={item.transfer.duration}
                              distance={item.transfer.distance}
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
                    // Orario row: usa il tempo CALCOLATO dal solver (cascade
                    // dayStart 09:00 + bridges + duration_min + override
                    // `time`). `a.time` da solo non basta — solo la prima
                    // tappa lo ha settato (anchor), le altre lo derivano.
                    const computedArrivalMin = dayTimes.get(a.id)?.arrivalMin ?? null;
                    const rowTime = !fuzzy && expanded && computedArrivalMin != null
                      ? `${String(Math.floor(computedArrivalMin / 60)).padStart(2, "0")}:${String(computedArrivalMin % 60).padStart(2, "0")}`
                      : undefined;

                    const handleRemove = () => {
                      setOpenId(null);
                      onRemoveActivity?.(a.id);
                    };

                    // Fuzzy: non sortable.
                    if (fuzzy) {
                      return (
                        <div
                          key={a.id}
                          data-row-id={a.id}
                          className="grid items-center gap-x-3"
                          style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
                        >
                          <RailCell line="solid" tone={tone} />
                          <div className="py-0.5">
                            <FuzzyStop
                              title={a.title}
                              icon={Icon}
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
                          const arrivalDateLabel = arrivalHM && day.date
                            ? formatChipDate(day.date, t?.arrivalDayOffset ?? 0)
                            : undefined;
                          const departureDateLabel = departureHM && day.date
                            ? formatChipDate(day.date, t?.departureDayOffset ?? 0)
                            : undefined;
                          return (
                            <div
                              className="grid items-center gap-x-3"
                              style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
                            >
                              <RailCell line="solid" tone={tone} />
                              <div className="py-0.5">
                                <ActivityStop
                                  dragHandleProps={dragHandleProps}
                                  isDragging={isDragging}
                                  title={a.title}
                                  icon={Icon}
                                  iconKey={a.icon}
                                  onIconChange={onIconChange ? (key) => {
                                    const entityId = a.activity_id ?? a.entity_id ?? null;
                                    if (entityId) void onIconChange(entityId, key);
                                  } : undefined}
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
                                    void onUpdateActivityInstance?.(a.id, { time: formatHMForDb(hm) });
                                  }}
                                  onDepartureChange={(hm) => {
                                    if (!arrivalHM) return;
                                    const newDur = diffMinutesHM(arrivalHM, hm);
                                    void onUpdateActivityInstance?.(a.id, { duration_min: newDur });
                                  }}
                                  onDurationChange={(min) => {
                                    void onUpdateActivityInstance?.(a.id, { duration_min: min });
                                  }}
                                  addressLocation={a.location}
                                  addressPlaceId={a.location_place_id}
                                  addressLat={a.location_lat}
                                  addressLng={a.location_lng}
                                  onAddressChange={(place) => {
                                    const entityId = a.activity_id ?? a.entity_id ?? null;
                                    if (entityId) void onAddressChange?.(entityId, place);
                                  }}
                                  onTitleCommit={onTitleChange ? (next) => {
                                    const entityId = a.activity_id ?? a.entity_id ?? null;
                                    if (entityId) void onTitleChange(entityId, next);
                                  } : undefined}
                                  onShortDescCommit={onShortDescChange ? (next) => {
                                    const entityId = a.activity_id ?? a.entity_id ?? null;
                                    if (entityId) void onShortDescChange(entityId, next);
                                  } : undefined}
                                  onOpen={() => setOpenId(a.id)}
                                  onClose={() => setOpenId(null)}
                                  onRemove={handleRemove}
                                  onMoveUp={onMoveActivity ? () => onMoveActivity(a.id, "up") : undefined}
                                  onMoveDown={onMoveActivity ? () => onMoveActivity(a.id, "down") : undefined}
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

                {/* Today notes — solo se espanso. Editabili inline quando il
                    parent passa `onDayNotesChange` (anche da vuoto, con placeholder). */}
                {showNotes ? (
                  <div
                    className="grid items-stretch gap-x-3"
                    style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
                  >
                    <RailCell line="solid" tone={tone} />
                    <div className="py-2">
                      <div className="flex flex-col gap-1.5 rounded-sm bg-surface-warm/80 p-3">
                        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
                          Today notes
                        </p>
                        {onDayNotesChange ? (
                          <EditableText
                            value={day.notes ?? ""}
                            onCommit={(next) => onDayNotesChange(day.id, next)}
                            placeholder={t("dayNotesPlaceholder")}
                            multiline
                            rows={2}
                            inputClassName="text-mini leading-relaxed text-ink whitespace-pre-line"
                          />
                        ) : (
                          <p className="whitespace-pre-line text-mini leading-relaxed text-ink">
                            {day.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Empty-day drop placeholder: senza contenuto il DayDropContainer
                    collassa a 0px e nessun pointer/closestCenter lo seleziona —
                    quindi i drop sui giorni vuoti fallivano. Visibile solo
                    durante un drag attivo, dà area + feedback. */}
                {activeDragId && dayIds.length === 0 ? (
                  <div
                    className="grid items-center gap-x-3"
                    style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
                  >
                    <RailCell line="dashed" tone={tone} />
                    <div className="my-1 h-12 rounded-md border border-dashed border-border bg-surface-soft/60" />
                  </div>
                ) : null}
              </DayDropContainer>

              {/* Banda notte — FUORI dal day block, fra i giorni. Multi-notte:
                  appare una volta per ogni notte (la stessa stay genera una
                  banda per ogni giorno di check-in lungo lo span). */}
              {lodging ? (
                <NightBandV2
                  lodging={lodging}
                  open={openId === lodging.id}
                  hovered={openId !== lodging.id && hoveredRowId === lodging.id}
                  onOpen={() => setOpenId(lodging.id)}
                  onClose={() => setOpenId(null)}
                  onAddressChange={onAddressChange}
                  onIconChange={onIconChange}
                  onTitleChange={onTitleChange}
                  onShortDescChange={onShortDescChange}
                  onConvertToStop={onConvertToStop}
                  onExtendStay={onExtendStay}
                  onReduceStay={onReduceStay}
                />
              ) : null}
            </div>
          );
        })}

        <EndOfTripV2 />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragActivity ? (
          <ActivityStop
            title={activeDragActivity.title}
            icon={getStopIcon(activeDragActivity.icon) ?? IconMapPin}
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
