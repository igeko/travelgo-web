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

import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
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
import type { PlaceResult } from "@/components/ui/AddressField";
import { FuzzyStop } from "./FuzzyStop";
import { Transfer, type TransferDestination, type TransferLeg, type TransferStep } from "./Transfer";
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
  /**
   * Chain canonico del trip (`buildTripChain`). Quando presente, la
   * Timeline può risalire al chain-stop precedente alla prima activity
   * di ogni giorno e prepende un Transfer "incoming" cross-day (es.
   * accommodation di ieri → prima activity di oggi, oppure ultima
   * activity di un giorno precedente → prima activity di oggi quando
   * giorni intermedi sono vuoti). Senza chain, niente Transfer incoming.
   */
  chain?: import("./tripChain").TripStop[];
  /**
   * Bridge calcolati lazy lato client (mode DRIVING default) per i leg
   * del chain. Chiave = `${prevId}|${currId}` con TripStop.id (scheduled.id
   * per activity, `acc:...` per accommodation). Usato sia per Transfer
   * activity↔activity intra-giorno sia per Transfer incoming cross-day.
   */
  computedBridges?: Map<string, BridgeData>;
  /** Japan & co. carry no bridge data — inject a sample Transfer between
   *  stops so the connector can be seen in context. */
  injectSampleTransfers?: boolean;
  /**
   * Fired su ogni cambio della selezione del giorno (single-selection).
   * Passa l'id del nuovo giorno selezionato, oppure `null` quando l'utente
   * deseleziona (click sullo stesso giorno aperto). Hosts usano sia il caso
   * positivo (focus su un giorno) sia il null (ritorno allo stato "nessun
   * focus") — es. ExploreNextShell spegne il dimming roadmap-pin/path quando
   * arriva null.
   */
  onSelectDay?: (dayId: string | null) => void;
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
   * Move a stop one slot up or down. Intra-day swap, or cross-day jump when
   * the stop is at the day boundary (first→last of previous day, last→first
   * of next day). Lodging rows are not routed here (they're pinned at the
   * bottom by design). The host typically returns immediately after firing
   * an optimistic update + background PATCH.
   */
  onMoveActivity?: (scheduledId: string, direction: "up" | "down") => void | Promise<void>;
  /**
   * Drag&drop: ricevuto quando l'utente rilascia un'attività su una
   * posizione specifica (target day + 0-based index, eventualmente cross-day).
   * Lo host applica un overlay ottimistico e fa POST /move-to.
   */
  onDragMove?: (
    scheduledId: string,
    targetDayId: string,
    targetIndex: number,
  ) => void | Promise<void>;
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
   * Address change from inside the activity detail. Receives the
   * underlying Property activity id (activities.id) and the new place
   * (or null when cleared). The host writes location/place_id/lat/lng
   * onto the activity entity and refreshes.
   */
  onAddressChange?: (
    activityId: string,
    place: PlaceResult | null,
  ) => void | Promise<void>;
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
  /** Destinazione del leg: usata dai deep-link Maps/Waze quando mode=car. */
  destination?: TransferDestination;
};

/** Formatta i minuti in `Ng Nh Nm`, droppando le componenti zero.
 *  Esempi: 8 → "8m"; 160 → "2h 40m"; 1500 → "1g 1h"; 1440 → "1g". */
function formatDurationMin(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "0m";
  const total = Math.round(min);
  const days = Math.floor(total / (60 * 24));
  const hours = Math.floor((total % (60 * 24)) / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}h`);
  // Mostra i minuti quando: non c'è nessun pezzo più grande, OPPURE sono > 0
  // (così "1g 0h 0m" diventa "1g", "2h 40m" resta "2h 40m", "8m" resta "8m").
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
    steps: [{ kind: "bus", title: b.line ? `${b.line} ·` : "Transit", place: b.stops ?? undefined, subtitle: b.note ?? undefined }],
  };
}

/** La destinazione del leg = la tappa di ARRIVO (stop curr). I deep-link
 *  Maps/Waze portano l'utente lì. Activity → usa location_*; lasciamo
 *  null quando coords mancano (il Transfer cade nel branch placeholder). */
function destinationFromActivity(a: Activity): TransferDestination | undefined {
  if (a.location_lat == null || a.location_lng == null) return undefined;
  return { lat: a.location_lat, lng: a.location_lng, placeId: a.location_place_id, title: a.title };
}

/* ── Item model ─────────────────────────────────────────────────── */

/** Stop-column items rendered between the DayBadge (row 1) and the bottom
 *  accommodation row. Lodging is NOT part of this union — it has its own
 *  pinned-to-bottom slot, separate from the stop sequence. */
type Item =
  | { kind: "activity"; activity: Activity; accent?: "ink" | "primary" }
  | { kind: "transfer"; id: string; transfer: TransferVM };

type LodgingItem = {
  kind: "lodging";
  id: string;
  title: string;
  icon: IconCmp;
  address: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  nightIndex: number;
  nightsTotal: number;
  /** Stay id — present when projected from accommodation_nights; lets
   *  the Sleep/Stop toggle and the Stepper mutate the right stay. */
  stayId?: string;
  /** Property activity id — target for Property-level edits (address). */
  activityId?: string;
};

/** Build the day's stop sequence (activities + their transfers). The
 *  accommodation is intentionally NOT included here — it's pinned to the
 *  bottom of the day's column (after Today notes when expanded) by the
 *  Timeline render, so it stays the last visible element in any state. */
function buildItems(
  acts: Activity[],
  expanded: boolean,
  injectSample: boolean,
  /** Fallback: bridge calcolato lazy per i leg senza bridge_out_json
   *  salvato. Chiave `${prevId}|${currId}` (TripStop.id). Quando presente
   *  sostituisce l'iniezione del sample-transfer (che era solo onboarding). */
  computedBridges?: Map<string, BridgeData>,
  /** Quando il host passa anche il chain del trip, possiamo prependere
   *  un Transfer "incoming" prima della prima activity di un giorno —
   *  sourceando dal chain-stop precedente (può essere l'accommodation
   *  del giorno prima o l'ultima activity di un giorno precedente quando
   *  il giorno intermedio è vuoto). */
  incomingChainPrevId?: string | null,
): Item[] {
  const items: Item[] = [];

  const visible = [...acts]
    .sort((a, b) => a.position - b.position)
    .filter((a) => expanded || a.fuzzy !== true);

  // Incoming Transfer: prima della prima activity, se c'è un chain-stop
  // precedente E abbiamo un bridge per quel leg (bridge_in salvato OR
  // computed). Saved bridge_in_json può essere stantio (lo stesso problema
  // di bridge_out su prev), ma se siamo arrivati qui senza computed non
  // abbiamo alternativa migliore.
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
    // Priority: bridge salvato sul DB > computed lazy lato client >
    // sample (solo se `injectSample` attivo, fallback di onboarding).
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
): LodgingItem | null {
  if (!accommodation) return null;
  // ID scoped to the day: the same hotel across 5 nights becomes 5 distinct
  // lodging items, so opening one doesn't open them all.
  return {
    kind: "lodging",
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

/* ── Sortable row ───────────────────────────────────────────────── */

/**
 * Wrapper di un'attività che la rende sortable via @dnd-kit. Applica
 * setNodeRef + transform sul `<div>` esterno (grid cell) e passa i listener
 * del drag come `dragHandleProps` al child via render-prop — così solo
 * l'icona grip dentro ActivityStop attiva il drag, mentre il click su
 * tutto il resto della row continua ad aprire il detail.
 */
function SortableActivityRow({
  scheduledId,
  dayId,
  index,
  row,
  children,
}: {
  scheduledId: string;
  dayId: string;
  /** 0-based index dell'activity tra quelle SORTABILI dello stesso day. */
  index: number;
  /** CSS grid-row sulla cella esterna (1..lastRow). */
  row: number;
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
    gridColumn: 2,
    gridRow: row,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  // Memoize handle to keep it stable per dragging state. dragHandleProps
  // is spread into the grip <span> inside ActivityStop.
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
    <div ref={setNodeRef} style={style} className="py-0.5">
      {children(handle)}
    </div>
  );
}

/* ── Drag preview projection ──────────────────────────────────────── */

/**
 * Anticipated cross-day move: copia di TimelineDayData[] con l'activity
 * trascinata rimossa dal day di partenza e inserita nel day target alla
 * posizione `targetIndex`. Usato dal Timeline durante onDragOver per dare
 * a @dnd-kit/sortable un input coerente — così la preview anticipata
 * (verticalListSortingStrategy) agisce anche cross-day. La proiezione è
 * locale e visiva: lo state reale viene aggiornato dal host solo al
 * dragEnd via `onDragMove`.
 */
function applyDragPreview(
  days: TimelineDayData[],
  preview: { scheduledId: string; targetDayId: string; targetIndex: number },
): TimelineDayData[] {
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

/* ── Timeline ───────────────────────────────────────────────────── */

export function Timeline({
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
  openOverride,
  className,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Single-selection model: at most one day is "selected" at a time. A
  // selected active day is expanded (full content + ink badge); a selected
  // empty day just gets its badge marked (no content to expand).
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);


  // ── Drag&drop sensors ──────────────────────────────────────────
  // Activation distance: 6px — distinguishes a tap/click (apre il detail)
  // da un drag (entra in modalità sortable). Senza, ogni mouseDown sul grip
  // farebbe partire un drag spurio.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Risolutore drop: dato l'evento end di @dnd-kit, ricava (dayId, index)
  // del target. Restituisce null quando non c'è un over significativo.
  type DropTarget = { dayId: string; index: number };
  const resolveDropTarget = (event: DragEndEvent): DropTarget | null => {
    const { over } = event;
    if (!over) return null;
    const d = over.data.current as
      | { type?: "row" | "day-empty"; dayId?: string; index?: number }
      | undefined;
    if (!d?.dayId) return null;
    return { dayId: d.dayId, index: d.index ?? 0 };
  };

  const handleDragStart = (e: DragStartEvent) => {
    // Close the inline popover at drag start so the cards visually match
    // their dragged state — also avoids the editor floating mid-drag.
    setOpenId(null);
    setActiveDragId(String(e.active.id));
    setDragPreview(null);
  };

  /**
   * Cross-day preview: quando l'utente passa sopra un day diverso da quello
   * di partenza, applichiamo un dragPreview che muove l'attività dal
   * SortableContext di origine a quello di destinazione. Così @dnd-kit
   * vede l'item nel context target e mostra la preview anticipata
   * (spostamento degli altri item per fare spazio). Same-day reorder è
   * già gestito nativamente dal SortableContext del day stesso.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    // Compute the desired preview (or null) and only commit it when it
    // actually changes — onDragOver fires very frequently and re-applying
    // an identical object would create a new reference each time, kicking
    // off an infinite render → over → render loop.
    let next: typeof dragPreview = null;
    if (over) {
      const overData = over.data.current as
        | { type?: string; dayId?: string; index?: number }
        | undefined;
      const activeData = active.data.current as
        | { dayId?: string; index?: number }
        | undefined;
      if (overData?.dayId && activeData?.dayId !== overData.dayId) {
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
    setDragPreview(null);
    const target = resolveDropTarget(event);
    if (!target) return;
    const scheduledId = String(event.active.id);
    const source = event.active.data.current as
      | { dayId?: string; index?: number }
      | undefined;
    // Skip no-ops: same day + same index (or index right after itself).
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

  // Single-selection toggle. Click on the currently selected day → deselect
  // (badge un-marks, active day collapses). Click on any other day → switch
  // selection to it. Empty days share the same handler so they get the same
  // visual feedback as active ones. onSelectDay fires SEMPRE — con `id` su
  // selezione, `null` su deselezione — così l'host può spegnere il day-focus
  // mode quando l'utente torna allo stato "tutto in evidenza".
  const selectDay = (id: string) => {
    const isCurrent = selectedDayId === id;
    const next = isCurrent ? null : id;
    setSelectedDayId(next);
    onSelectDay?.(next);
  };

  // Drag preview: durante `onDragOver` il host può "muovere" l'attività
  // trascinata in un day diverso (visivamente). Applichiamo la proiezione
  // ai `days` prima di derivare sortedDays/sortableIds, così il
  // SortableContext del day target vede l'item nel suo array e
  // verticalListSortingStrategy mostra la preview anticipata.
  const [dragPreview, setDragPreview] = useState<{
    scheduledId: string;
    targetDayId: string;
    targetIndex: number;
  } | null>(null);
  const previewDays = useMemo(
    () => (dragPreview ? applyDragPreview(days, dragPreview) : days),
    [days, dragPreview],
  );
  const sortedDays = [...previewDays].sort((a, b) => a.day_number - b.day_number);

  // IDs sortabili PER DAY: ogni day ha il proprio SortableContext, così la
  // preview di reorder anticipato di @dnd-kit (verticalListSortingStrategy)
  // agisce SOLO entro il day di partenza — niente swap globale lineare che
  // farebbe sparire la prima attività del day target in cross-day drag.
  // Per il cross-day il visual feedback arriva dal DragOverlay (ghost che
  // segue il cursore) e dal `data.dayId` sull'item over.
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

  // Activity oggi in trascinamento — per renderizzare il preview nel
  // DragOverlay (ghost che segue il cursore, indipendente dal grid layout).
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragActivity =
    activeDragId
      ? sortedDays
          .flatMap((d) => d.activities)
          .find((a) => a.id === activeDragId) ?? null
      : null;

  // Move guards: we grey-out Move Up only on the ABSOLUTE first stop of
  // the trip (first day, first activity) and Move Down only on the
  // ABSOLUTE last (last day, last activity). The key insight is that the
  // backend supports cross-day jumps at the day border — so an activity
  // that is the last of its day is still movable as long as there are
  // more days after it (even empty ones), where it will land as the first.
  // The previous, simpler check (`a.id === lastScheduledId`) wrongly
  // disabled Move Down on the last populated activity even when empty
  // tail days remained.
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
  /** True only for the very first scheduled activity of the trip. */
  const isFirstOfTrip = (dayId: string, activityId: string): boolean =>
    dayId === firstDayId && firstActivityIdByDay.get(dayId) === activityId;
  /** True only for the very last scheduled activity of the trip. */
  const isLastOfTrip = (dayId: string, activityId: string): boolean =>
    dayId === lastDayId && lastActivityIdByDay.get(dayId) === activityId;

  // Per ogni dayId, l'id del chain-stop IMMEDIATAMENTE precedente alla
  // sua prima activity (in ordine di chain). Usato per disegnare il
  // Transfer incoming cross-day. Map vuota quando `chain` non è passato
  // o quando il giorno è il primo con attività (niente prev).
  const chainPrevByDay = new Map<string, string>();
  if (chain && chain.length > 1) {
    for (let i = 1; i < chain.length; i++) {
      const prev = chain[i - 1];
      const curr = chain[i];
      // Solo activity (le accommodation vengono mostrate come lodging
      // pinned-to-bottom, no incoming Transfer). E solo per la PRIMA
      // entry di un dayId nuova (cioè quando curr.dayId !== prev.dayId
      // OR curr è il primo activity del suo giorno nel chain).
      if (curr.kind !== "activity") continue;
      // Se il dayId è già mappato, lo abbiamo già; il primo hit vince
      // (corrisponde alla prima activity del giorno nel chain order).
      if (chainPrevByDay.has(curr.dayId)) continue;
      chainPrevByDay.set(curr.dayId, prev.id);
    }
  }

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
    <div className={cn("flex w-full flex-col gap-y-[3px] rounded-lg bg-surface p-2", className)}>
      {segments.map((seg) => {
        if (seg.kind === "empty") {
          return (
            <EmptyDaysBlock
              key={`empty-${seg.days[0].id}`}
              days={seg.days}
              startIdx={seg.startIdx}
              totalDays={sortedDays.length}
              selectedDayId={selectedDayId}
              onSelectDay={selectDay}
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

        const expanded = selectedDayId === day.id;
        const items = buildItems(
          day.activities,
          expanded,
          injectSampleTransfers,
          computedBridges,
          chainPrevByDay.get(day.id) ?? null,
        );
        const lodging = buildLodging(day.accommodation, day.id);
        const showNotes = expanded && !!day.notes;

        // Row 1 col 2 ("slot accanto al DayBadge") must NEVER be empty when
        // the day has content: hosts the first stop if any, otherwise the
        // lodging. Pinning rules:
        //   - First stop (when present) → row 1, accanto al badge.
        //   - Lodging → row 1 if there are no stops, else last row (sotto le
        //     note quando espanse). Mai duplicato.
        //   - Today notes → row immediately before the bottom lodging (or last
        //     row if no bottom lodging), only when expanded.
        const firstSlotIsItem = items.length > 0;
        const firstSlotIsLodging = !firstSlotIsItem && lodging !== null;
        const stopsBelowCount = firstSlotIsItem ? items.length - 1 : 0;
        const renderLodgingBottom = lodging !== null && firstSlotIsItem;
        const notesRow = showNotes ? 2 + stopsBelowCount : null;
        const lodgingRow = firstSlotIsLodging
          ? 1
          : renderLodgingBottom
            ? 2 + stopsBelowCount + (showNotes ? 1 : 0)
            : null;
        const lastRow =
          1 + stopsBelowCount + (showNotes ? 1 : 0) + (renderLodgingBottom ? 1 : 0);

        return (
          <div
            key={day.id}
            className="grid items-start gap-x-2"
            style={{ gridTemplateColumns: "36px minmax(0, 1fr)" }}
          >
            {/* Column 1 — the day's "spine": DayBadge stacked above the rail
                with a fixed 3px gap, then (if last) the bottom terminator.
                Wrapping them in a single flex column keeps the 3px constraint
                between badge and rail independent of row heights or whether
                a first-slot is open. */}
            <div
              style={{ gridColumn: 1, gridRow: `1 / ${lastRow + 1}` }}
              className="flex flex-col self-stretch"
            >
              <button
                type="button"
                onClick={() => selectDay(day.id)}
                aria-expanded={expanded}
                aria-label={`${weekday} ${dateLabel} — ${expanded ? "comprimi" : "espandi"} giorno`}
                className="w-full cursor-pointer"
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

              {/* Rail — 3px below the badge, fills the remaining height. The X
                  close affordance is absolutely positioned inside it when the
                  day is expanded. */}
              <button
                type="button"
                onClick={() => selectDay(day.id)}
                aria-hidden
                tabIndex={-1}
                className={cn(
                  "relative mt-[3px] w-full flex-1 cursor-pointer rounded-xs transition-colors",
                  expanded ? "bg-ink hover:bg-ink-hover" : "bg-timeline-rail hover:bg-surface-soft",
                )}
              >
                {expanded && lastRow >= 2 ? (
                  <IconX
                    size={16}
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 bottom-2 -translate-x-1/2 text-white"
                  />
                ) : null}
              </button>

              {isLast ? (
                <div
                  aria-hidden
                  className="flex w-9 flex-col items-center"
                >
                  <div className="h-0.5" />
                  <div className="h-1 w-full bg-ink/15" />
                </div>
              ) : null}
            </div>

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

{/* Stops: time on the rail (col 1) + stop/transfer (col 2), same row.
                items[0] is pinned to row 1 (accanto al DayBadge); subsequent
                items fall to rows 2..items.length. Today notes and the bottom
                accommodation slot (when applicable) are rendered AFTER this
                loop. */}
            {(() => {
              // Un SortableContext PER day: la preview di reorder anticipato
              // di @dnd-kit agisce SOLO entro questo day (verticalListSortingStrategy).
              // Cross-day, l'item attivo non muove visivamente gli items del day
              // target — è il DragOverlay (ghost) a seguire il cursore, e il
              // drop atterra sull'item over con `data.dayId` del day giusto.
              const dayIds = sortableIdsByDay.get(day.id) ?? [];
              const sortableIndexOf = sortableIndexByDay.get(day.id) ?? new Map<string, number>();
              return (
                <SortableContext items={dayIds} strategy={verticalListSortingStrategy}>
                  {items.map((item, i) => {
              const row = i + 1;
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
                      destination={item.transfer.destination}
                      onOpen={() => setOpenId(item.id)}
                      onClose={() => setOpenId(null)}
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

              // Fuzzy stops: not sortable. Wrap as before.
              if (fuzzy) {
                return (
                  <div key={a.id} style={{ gridColumn: 2, gridRow: row }} className="py-0.5">
                    <FuzzyStop
                      title={a.title}
                      icon={Icon}
                      state={open ? "open" : "default"}
                      description={a.short_desc ?? undefined}
                      onOpen={() => setOpenId(a.id)}
                      onClose={() => setOpenId(null)}
                      onRemove={handleRemove}
                    />
                  </div>
                );
              }
              return (
                <SortableActivityRow
                  key={a.id}
                  scheduledId={a.id}
                  dayId={day.id}
                  index={sortableIndexOf.get(a.id) ?? 0}
                  row={row}
                >
                  {({ dragHandleProps, isDragging }) => (
                    <ActivityStop
                      dragHandleProps={dragHandleProps}
                      isDragging={isDragging}
                      title={a.title}
                      icon={Icon}
                      state={open ? "open" : "default"}
                      mode="stop"
                      timeRange={a.time ?? "—"}
                      time={rowTime}
                      description={a.short_desc ?? undefined}
                      addressLocation={a.location}
                      addressPlaceId={a.location_place_id}
                      addressLat={a.location_lat}
                      addressLng={a.location_lng}
                      onAddressChange={(place) => {
                        // Edit goes to the Property activity entity (a.activity_id),
                        // not to the scheduled instance (a.id) — the address is
                        // entity-level data shared by every occurrence.
                        const entityId = a.activity_id ?? a.entity_id ?? null;
                        if (entityId) void onAddressChange?.(entityId, place);
                      }}
                      onOpen={() => setOpenId(a.id)}
                      onClose={() => setOpenId(null)}
                      onRemove={handleRemove}
                      onMoveUp={onMoveActivity ? () => onMoveActivity(a.id, "up") : undefined}
                      onMoveDown={onMoveActivity ? () => onMoveActivity(a.id, "down") : undefined}
                      canMoveUp={!isFirstOfTrip(day.id, a.id)}
                      canMoveDown={!isLastOfTrip(day.id, a.id)}
                      onModeChange={(next) => {
                        // stop → sleep: cross-table conversion. The scheduled
                        // row is replaced by a 1-night stay starting on its day.
                        if (next === "sleep") {
                          void onConvertToSleep?.(a.id);
                        }
                      }}
                    />
                  )}
                </SortableActivityRow>
              );
            })}
                </SortableContext>
              );
            })()}

            {/* TODAY NOTES — only when the day is expanded. Sits BELOW the
                stops and ABOVE the accommodation (which is pinned to the
                very bottom of the day). */}
            {showNotes && notesRow !== null ? (
              <div style={{ gridColumn: 2, gridRow: notesRow }} className="py-3">
                <div className="flex flex-col gap-2.5 rounded-sm bg-surface-warm/70 p-4">
                  <p className="text-mini font-medium uppercase tracking-meta text-primary">
                    Today notes
                  </p>
                  <p className="whitespace-pre-line text-mini text-ink">{day.notes}</p>
                </div>
              </div>
            ) : null}

            {/* ACCOMMODATION — placed at `lodgingRow`, computed above:
                  - row 1 (accanto al DayBadge) when there are no stops, so the
                    slot next to the badge is never empty;
                  - last row (below Today notes) when there is at least one
                    stop — chronologically you reach the hotel at the end of
                    the day. */}
            {lodging && lodgingRow !== null ? (() => {
              const open = openId === lodging.id;
              const stayId = lodging.stayId;
              const activityId = lodging.activityId;
              const currentNights = lodging.nightsTotal;
              return (
                <div
                  style={{ gridColumn: 2, gridRow: lodgingRow }}
                  className="py-0.5"
                >
                  <ActivityStop
                    title={lodging.title}
                    icon={lodging.icon}
                    accent="primary"
                    state={open ? "open" : "default"}
                    mode="sleep"
                    nights={lodging.nightsTotal}
                    nightIndex={lodging.nightIndex}
                    addressLocation={lodging.address}
                    addressPlaceId={lodging.placeId}
                    addressLat={lodging.lat}
                    addressLng={lodging.lng}
                    onAddressChange={(place) => {
                      if (activityId) void onAddressChange?.(activityId, place);
                    }}
                    onOpen={() => setOpenId(lodging.id)}
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
            })() : null}

          </div>
        );
      })}
    </div>

    {/* DragOverlay: rende un "fantasma" dell'attività trascinata fuori dal
        grid layout, così l'item segue il cursore anche oltre i confini del
        day di partenza (senza, l'item con opacity 40 sembra "scomparire"
        nell'apparente vuoto del SortableContext, soprattutto cross-day). */}
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
  selectedDayId,
  onSelectDay,
  showHintCard = true,
}: {
  days: TimelineDayData[];
  startIdx: number;
  /** Lunghezza totale della timeline — serve per sapere se l'ultimo giorno
   *  del block coincide con l'ultimo dell'intera lista (→ doppia barretta). */
  totalDays: number;
  /** Currently selected day id (Timeline-internal). Used to mark the matching
   *  empty DayBadge as `selected`, so empty days get the same visual feedback
   *  as active ones when clicked. */
  selectedDayId: string | null;
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
        className="flex flex-col gap-[3px] self-start"
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
              aria-pressed={selectedDayId === day.id}
              className="cursor-pointer"
            >
              <DayBadge
                weekday={weekday}
                date={dateLabel}
                isFirst={isFirst}
                selected={selectedDayId === day.id}
              />
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
