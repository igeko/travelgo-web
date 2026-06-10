"use client";

/**
 * features/explore/ActivityStop.tsx
 * ─────────────────────────────────────────────────────────────────
 * Figma "Activity" — a lodging-type stop in the Explore timeline.
 * Collapsed it is a single row (icon badge + name); opened it expands
 * into the editor card with the Sleep/Stop toggle, a nights stepper,
 * description, address and the arrival/departure times.
 *
 * States: default · hover (drag handle) · selected (navy) · open.
 * Controlled — the host owns `state`, `mode` and the data.
 *
 * Atomic level: organism. Composes StopIconBadge, SegmentToggle,
 * StopEditorCard, AddressRow.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/client";
import {
  IconGripVertical,
  IconBed,
  IconMapPin,
  IconCalendar,
  IconPlus,
  IconMinus,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";
import { StopIconBadge } from "./StopIconBadge";
import { StopEditorCard } from "./StopEditorCard";
import { SegmentToggle } from "./SegmentToggle";
import { StoppingFor } from "./StoppingFor";
import { ArrivalDeparture, type ActivityTime } from "./ArrivalDeparture";
import {
  ActivityTimeChips,
  type TimeChipData,
  type TimeField,
} from "@/features/activity/ActivityTimeChips";
import { ActivityTimePicker } from "@/features/activity/ActivityTimePicker";
import { ActivityDurationPicker } from "@/features/activity/ActivityDurationPicker";
import { IconPicker } from "@/features/activity/IconPicker";
import { IconClock } from "@/components/ui/icons";

/** HH:mm in numerico — coerente con i picker (minuti su step di 15). */
export type ClockHM = { hour: number; minute: number };

/** Quale picker è aperto, se aperto. */
type OpenPicker = "arrival" | "departure" | "duration" | null;

/** "1h 30m" / "45m" / "2h" — riusato dalla riga Durata. */
function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type ActivityStopState = "default" | "hover" | "selected" | "open";
export type ActivityStopAccent = "ink" | "primary";
export type LodgingMode = "sleep" | "stop";
/**
 * Scala visiva della row collapsed.
 *   - "md": default desktop — min-h-8, badge 24px, font 14px, grip 16px.
 *   - "sm": mobile compatto — min-h-7, badge 20px, font 12px, grip 12px,
 *     grip visibile sempre al 40% (touch fallback al posto del solo
 *     hover-only). Lo stato "open" resta invariato in entrambi i casi
 *     (l'editor non si ridisegna a misura mobile in questa iterazione).
 */
export type ActivityStopSize = "md" | "sm";

export type { ActivityTime };

const MODE_OPTIONS = [
  { key: "sleep" as const, label: "Sleep", icon: IconBed },
  { key: "stop" as const, label: "Stop", icon: IconMapPin },
];

export function ActivityStop({
  title,
  icon = IconBed,
  iconKey = null,
  onIconChange,
  state = "default",
  accent = "ink",
  mode = "sleep",
  onModeChange,
  nights = 2,
  nightIndex = 0,
  dateRange = "Thu 04 → Sat 06",
  duration = "30 minutes",
  timeRange = "10:30 → 11:00",
  time,
  description,
  addressLocation = null,
  addressPlaceId = null,
  addressLat = null,
  addressLng = null,
  onAddressChange,
  arrival,
  departure,
  arrivalHM,
  departureHM,
  arrivalDateLabel,
  departureDateLabel,
  durationMin,
  onArrivalChange,
  onDepartureChange,
  onDurationChange,
  onOpen,
  onClose,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  onNightsChange,
  dragHandleProps,
  isDragging = false,
  size = "md",
  className,
}: {
  title: string;
  icon?: IconCmp;
  /** Chiave dell'icona corrente (es. "coffee", "bed"). Usata dal IconPicker
   *  per evidenziare l'opzione selezionata. Se null, niente highlight. */
  iconKey?: string | null;
  /** Callback quando l'utente sceglie una nuova icona dal picker. Quando
   *  presente, lo StopIconBadge in stato open diventa un trigger del picker. */
  onIconChange?: (iconKey: string) => void;
  state?: ActivityStopState;
  /** Scala visiva del collapsed (vedi `ActivityStopSize`). Default "md". */
  size?: ActivityStopSize;
  /** Collapsed badge tone. "primary" paints the icon badge orange (used
   *  for accommodation rows in the Explore timeline). */
  accent?: ActivityStopAccent;
  mode?: LodgingMode;
  onModeChange?: (mode: LodgingMode) => void;
  nights?: number;
  /** 0-based index of the current night within a multi-night stay. Surfaced
   *  in the "Sleep" editor card as `nightIndex + 1` (the human-facing "1 / 3
   *  notti" label). Ignored when `nights <= 1`. */
  nightIndex?: number;
  dateRange?: string;
  /** "Stop" mode — how long the stop lasts. */
  duration?: string;
  /** "Stop" mode — the time window. */
  timeRange?: string;
  /** Collapsed row — small clock label rendered at the right edge before the
   *  drag handle. Used by the Explore timeline to surface the activity time
   *  on each row when the day is expanded. */
  time?: string;
  description?: string;
  /**
   * Address as four primitive props (NOT a pre-built PlaceResult object) so
   * the AddressField below sees a referentially stable `value` across renders.
   * Passing a freshly-allocated PlaceResult each render would re-fire the
   * field's sync effect on every keystroke and overwrite what the user typed.
   * We synthesise the PlaceResult via useMemo once per primitive change.
   */
  addressLocation?: string | null;
  addressPlaceId?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
  onAddressChange?: (place: PlaceResult | null) => void;
  arrival?: ActivityTime;
  departure?: ActivityTime;
  /**
   * Coppia HH:mm di arrivo/partenza per il nuovo ActivityTimeChips.
   * Quando presenti, le chip nuove sostituiscono il display legacy
   * (StoppingFor per mode="stop", ArrivalDeparture per mode="sleep").
   * Si attivano in coppia: se manca uno dei due, fallback al legacy.
   */
  arrivalHM?: ClockHM;
  departureHM?: ClockHM;
  /** Label data compatta (es. "Thu 04 Aug") accanto alle chip. */
  arrivalDateLabel?: string;
  departureDateLabel?: string;
  /** Durata in minuti — solo mode="stop"; abilita la riga Durata + il picker. */
  durationMin?: number;
  /** Click su chip Arrivo → conferma del picker: sposta `time`. */
  onArrivalChange?: (hm: ClockHM) => void;
  /**
   * Click su chip Partenza → conferma del picker. Per le activity
   * (mode="stop") il parent traduce in nuovo `duration_min` (arrivo
   * resta fermo). Per le accommodation (mode="sleep") in questa
   * iterazione la chip è read-only — questa callback non viene
   * passata.
   */
  onDepartureChange?: (hm: ClockHM) => void;
  /** Conferma del Duration picker (solo mode="stop"). */
  onDurationChange?: (durationMin: number) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onRemove?: () => void;
  /** Move the stop one slot up. When omitted, the up button is hidden
   *  (used to suppress reorder controls on lodging rows). */
  onMoveUp?: () => void;
  /** Move the stop one slot down. When omitted, the down button is hidden. */
  onMoveDown?: () => void;
  /** Whether Move Up is allowed. Defaults to true; pass false on the very
   *  first stop of the trip to grey-out the button. */
  canMoveUp?: boolean;
  /** Whether Move Down is allowed. Defaults to true; pass false on the very
   *  last stop of the trip. */
  canMoveDown?: boolean;
  onNightsChange?: (next: number) => void;
  /**
   * Drag handle props from @dnd-kit/sortable (listeners + attributes), to be
   * spread on the grip icon so the row stays clickable for opening the
   * detail and only the grip activates the drag.
   */
  dragHandleProps?: import("react").HTMLAttributes<HTMLSpanElement> & {
    ref?: import("react").Ref<HTMLSpanElement>;
  };
  /** Visual state from @dnd-kit's useSortable — half-opacity placeholder. */
  isDragging?: boolean;
  className?: string;
}) {
  const t = useTranslations("Explore");

  // Picker aperto: arrival/departure/duration esclusivi fra loro.
  // Il toggle (click sulla stessa chip due volte) chiude il picker.
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);
  // IconPicker: aperto dal click sullo StopIconBadge quando `onIconChange`
  // è presente. Indipendente dagli altri picker (vive a fianco del titolo
  // nell'header del pannello aperto).
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconPopoverRef = useRef<HTMLDivElement | null>(null);
  // Reset del picker quando il pannello si chiude (state ≠ "open"). Usiamo
  // il pattern "derive state from props" suggerito dai docs React (reset
  // in fase di render, evitando useEffect+setState che fa cascading
  // renders). Non è side-effect: setState in render viene catturato e
  // riapplicato nello stesso giro.
  const [lastState, setLastState] = useState(state);
  if (lastState !== state) {
    setLastState(state);
    if (state !== "open") {
      setOpenPicker(null);
      setIconPickerOpen(false);
    }
  }

  // Click-outside per chiudere il popover dell'IconPicker.
  useEffect(() => {
    if (!iconPickerOpen) return;
    function onPointerDown(e: PointerEvent) {
      const node = iconPopoverRef.current;
      if (!node || node.contains(e.target as Node)) return;
      setIconPickerOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [iconPickerOpen]);

  // Le chip sono sempre presenti sull'activity (mode="stop"): se l'utente
  // non ha ancora impostato un'ora vediamo "—:—" e la chip resta
  // cliccabile per aprire il picker. Sul lodging (mode="sleep") in questa
  // iterazione il display arriva solo se il parent passa esplicitamente
  // arrivalHM/departureHM (le accommodation_stays vengono cablate in un
  // passaggio successivo); altrimenti fallback al legacy ArrivalDeparture.
  const hasSleepChips = mode === "sleep" && !!arrivalHM && !!departureHM;
  const arrivalChipData: TimeChipData = {
    field: "arrival",
    hour: arrivalHM?.hour ?? null,
    minute: arrivalHM?.minute ?? null,
    date: arrivalDateLabel,
  };
  const departureChipData: TimeChipData = {
    field: "departure",
    hour: departureHM?.hour ?? null,
    minute: departureHM?.minute ?? null,
    date: departureDateLabel,
  };
  const togglePicker = (next: OpenPicker) =>
    setOpenPicker((current) => (current === next ? null : next));
  const handleChipClick = (f: TimeField) => {
    // Caso degenere: l'utente clicca Partenza prima di aver settato
    // l'Arrivo. La politica "Partenza ricalcola durata, Arrivo fisso"
    // richiede un Arrivo definito; redirigiamo silenziosamente sul
    // picker Arrivo, che è il primo step naturale.
    if (f === "departure" && arrivalChipData.hour == null) {
      togglePicker("arrival");
      return;
    }
    togglePicker(f);
  };

  // Activities created via Add-to-Trip / Go agent often save only
  // place_id + lat/lng on the entity, leaving the human-readable
  // `location` text NULL. When the user opens the detail card and we
  // would otherwise show an empty AddressField, we backfill the display
  // by calling /api/places/details (Google Place Details v1). The
  // result is cached server-side (24h) so repeat opens are free.
  const [fetchedFormatted, setFetchedFormatted] = useState<string | null>(null);
  useEffect(() => {
    if (state !== "open") return;
    if (addressLocation) return;
    if (!addressPlaceId) return;
    if (fetchedFormatted) return;
    let cancelled = false;
    api.places
      .details<{ formatted?: string }>(addressPlaceId)
      .then((p) => {
        if (!cancelled && p?.formatted) setFetchedFormatted(p.formatted);
      })
      .catch(() => {
        /* silent — keep empty placeholder */
      });
    return () => {
      cancelled = true;
    };
  }, [state, addressLocation, addressPlaceId, fetchedFormatted]);

  // Stable PlaceResult: rebuilt only when one of the four primitive fields
  // (or the lazily-fetched fallback) actually changes, so AddressField's
  // sync effect doesn't fire on every parent render and stomp on what the
  // user is typing.
  const addressValue = useMemo<PlaceResult | null>(() => {
    const effectiveLocation = addressLocation || fetchedFormatted;
    if (
      !effectiveLocation &&
      !addressPlaceId &&
      addressLat == null &&
      addressLng == null
    ) {
      return null;
    }
    return {
      formatted: effectiveLocation ?? "",
      name: effectiveLocation ?? "",
      placeId: addressPlaceId ?? "",
      lat: addressLat ?? 0,
      lng: addressLng ?? 0,
    };
  }, [addressLocation, addressPlaceId, addressLat, addressLng, fetchedFormatted]);
  /* ── Collapsed rows ─────────────────────────────────────────── */
  if (state !== "open") {
    const selected = state === "selected";
    const Wrapper = onOpen ? "button" : "div";
    // `state === "hover"` keeps the explicit demo state working in the
    // sandbox; the `hover:` / `group-hover:` pair adds the native pointer
    // affordance inside Timeline, where the parent doesn't track hover.
    const interactive = !!onOpen && !selected;
    const compact = size === "sm";
    return (
      <Wrapper
        type={onOpen ? "button" : undefined}
        onClick={onOpen}
        className={cn(
          "group flex w-full items-center justify-between rounded-sm pl-1",
          compact
            ? "min-h-7 gap-1.5 py-0.5 pr-2"
            : "min-h-8 gap-3 py-1 pr-3.5",
          onOpen && "cursor-pointer",
          state === "hover" && "bg-surface-soft",
          interactive && "hover:bg-surface-soft focus-visible:bg-surface-soft",
          selected && "bg-ink",
          isDragging && "opacity-40",
          className,
        )}
      >
        <span className={cn("flex min-w-0 flex-1 items-center", compact ? "gap-1.5" : "gap-2")}>
          <StopIconBadge
            icon={icon}
            tone={selected || accent === "primary" ? "primary" : "ink"}
            size={compact ? 20 : 24}
          />
          <span
            className={cn(
              "truncate",
              compact ? "text-[12px] font-medium" : "text-[14px]",
              selected ? "text-white" : "text-ink",
            )}
          >
            {title}
          </span>
        </span>
        {time ? (
          <span
            className={cn(
              "shrink-0 tabular-nums",
              compact ? "text-[10px]" : "text-nano",
              selected ? "text-white/70" : "text-ink-soft",
            )}
          >
            {time}
          </span>
        ) : null}
        {!selected ? (
          <span
            {...(dragHandleProps ?? {})}
            // Le listener del grip vivono qui — il click sul resto della
            // row apre il detail, il drag parte solo dall'icona stessa.
            onClick={(e) => {
              // Senza stopPropagation, il click sul grip aprirebbe il detail.
              e.stopPropagation();
              dragHandleProps?.onClick?.(e);
            }}
            className={cn(
              "inline-flex shrink-0 text-ink-faint transition-opacity",
              dragHandleProps ? "cursor-grab active:cursor-grabbing touch-none" : "",
              // Touch fallback: in mobile il grip è sempre visibile al 40%
              // (hover-only è invisibile su touch); su desktop resta hidden
              // di default e appare in hover.
              compact
                ? "opacity-40 group-hover:opacity-100 focus-within:opacity-100"
                : state === "hover"
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
            aria-label={dragHandleProps ? "Trascina per riordinare" : undefined}
            role={dragHandleProps ? "button" : undefined}
          >
            <IconGripVertical size={compact ? 12 : 16} />
          </span>
        ) : null}
      </Wrapper>
    );
  }

  /* ── Open ───────────────────────────────────────────────────── */
  const pickerMode = mode === "sleep" ? "lodging" : "activity";
  return (
    <div className={cn("flex w-full flex-col gap-1 rounded-sm bg-ink p-1", className)}>
      <div className="flex items-center gap-2 px-1 py-0.5">
        {onIconChange ? (
          <div ref={iconPopoverRef} className="relative">
            <button
              type="button"
              aria-label="Cambia icona"
              aria-expanded={iconPickerOpen}
              onClick={() => setIconPickerOpen((v) => !v)}
              className="block rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <StopIconBadge icon={icon} tone="primary" />
            </button>
            {iconPickerOpen ? (
              <div className="absolute left-0 top-full z-dropdown mt-2">
                <IconPicker
                  mode={pickerMode}
                  value={iconKey}
                  onChange={(key) => {
                    onIconChange(key);
                    setIconPickerOpen(false);
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <StopIconBadge icon={icon} tone="primary" />
        )}
        <span className="truncate text-[14px] text-white">{title}</span>
      </div>

      <StopEditorCard
        icon={icon}
        title={title}
        onClose={onClose}
        onRemove={onRemove}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      >
        {/* Sleep/Stop toggle + its dependent content (the Figma "Switch") */}
        <div className="flex w-full flex-col gap-4">
          <SegmentToggle
            value={mode}
            onChange={(m) => onModeChange?.(m as LodgingMode)}
            options={MODE_OPTIONS}
            ariaLabel="Lodging mode"
          />
          {mode === "sleep" ? (
            <div className="flex w-full items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <IconCalendar size={14} className="shrink-0 text-ink-soft" />
                <div className="flex flex-col">
                  <p className="flex items-baseline gap-0.5 leading-none">
                    <span className="text-[22px] font-medium text-ink">
                      {nightIndex + 1}
                    </span>
                    <span className="text-tiny font-medium text-ink-faint">
                      {nights > 1
                        ? ` / ${nights} ${t("nightsPlural")}`
                        : ` ${t("nightSingular")}`}
                    </span>
                  </p>
                  <p className="mt-[3px] text-micro text-ink-faint">{dateRange}</p>
                </div>
              </div>
              <Stepper
                onDecrement={() => onNightsChange?.(Math.max(0, nights - 1))}
                onIncrement={() => onNightsChange?.(nights + 1)}
              />
            </div>
          ) : (
            // Nuovo modello (sempre presente per mode="stop"): chip
            // arrivo→partenza + riga Durata + picker inline. Le chip sono
            // cliccabili anche senza ora impostata (placeholder "—:—"), e
            // il picker parte da default 09:00 / durata 60' quando i valori
            // non sono ancora salvati.
            <ActivityTimeStopBlock
              arrival={arrivalChipData}
              departure={departureChipData}
              durationMin={durationMin}
              openPicker={openPicker}
              onChipClick={handleChipClick}
              onClockToggle={() => togglePicker("duration")}
              onArrivalConfirm={(hm) => { onArrivalChange?.(hm); setOpenPicker(null); }}
              onDepartureConfirm={(hm) => { onDepartureChange?.(hm); setOpenPicker(null); }}
              onDurationConfirm={(d) => { onDurationChange?.(d); setOpenPicker(null); }}
            />
          )}
        </div>

        {description ? (
          <p className="w-full text-mini text-ink">{description}</p>
        ) : null}

        {/* Inline "passport row" — pin + value, underlined like the design mock
            (see AddressRow). No eyebrow label: the card already names the field. */}
        <AddressField
          value={addressValue}
          onChange={(place) => onAddressChange?.(place)}
          variant="inline"
          placeholder="Address"
          className="border-b border-ink"
        />

        {/* Arrival / Departure — lodging (Sleep). Quando il parent passa le
            HH:mm (mode="sleep" + arrivalHM/departureHM) usiamo le nuove
            chip read-only per coerenza visiva con le activity; il legacy
            ArrivalDeparture resta come fallback. */}
        {mode === "sleep" && hasSleepChips ? (
          <div className="w-full px-2">
            <ActivityTimeChips arrival={arrivalChipData} departure={departureChipData} />
          </div>
        ) : mode === "sleep" ? (
          <ArrivalDeparture arrival={arrival} departure={departure} />
        ) : null}
      </StopEditorCard>
    </div>
  );
}

/* ── Sub-parts ──────────────────────────────────────────────────── */

/**
 * Blocco "tempo" per le activity in stato open: chip arrivo→partenza,
 * riga durata (cliccabile) e popover (time/duration) inline sotto le
 * chip. Estratto qui per non far esplodere il render principale.
 */
function ActivityTimeStopBlock({
  arrival,
  departure,
  durationMin,
  openPicker,
  onChipClick,
  onClockToggle,
  onArrivalConfirm,
  onDepartureConfirm,
  onDurationConfirm,
}: {
  arrival: TimeChipData;
  departure: TimeChipData;
  durationMin?: number;
  openPicker: OpenPicker;
  onChipClick: (f: TimeField) => void;
  onClockToggle: () => void;
  onArrivalConfirm: (hm: ClockHM) => void;
  onDepartureConfirm: (hm: ClockHM) => void;
  onDurationConfirm: (durationMin: number) => void;
}) {
  // Click-outside per chiudere il picker aperto: l'unico modo "intuitivo"
  // di dismiss quando il popover floating sta sopra altri elementi. Il
  // ref include sia le chip sia la riga durata (i trigger) sia il popover
  // — un click che esce dall'intero blocco chiude. La conferma del picker
  // chiude già da sé tramite il parent.
  const blockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openPicker) return;
    function onPointerDown(e: PointerEvent) {
      const node = blockRef.current;
      if (!node || node.contains(e.target as Node)) return;
      // Convention del toggle interno: passare lo stesso field rifa il
      // toggle → null. Per "duration" usiamo il toggle dedicato; per
      // arrival/departure simuliamo il click sulla chip attualmente attiva.
      if (openPicker === "duration") onClockToggle();
      else if (openPicker === "arrival" || openPicker === "departure") onChipClick(openPicker);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openPicker, onChipClick, onClockToggle]);

  return (
    <div ref={blockRef} className="relative flex w-full flex-col gap-2">
      <ActivityTimeChips
        arrival={arrival}
        departure={departure}
        activeField={openPicker === "arrival" || openPicker === "departure" ? openPicker : null}
        onChipClick={onChipClick}
      />

      {/* Riga Durata — sempre visibile quando il parent passa duration
          (default 60' anche se l'utente non l'ha ancora salvata).
          Cliccabile come una chip ma più compatta, allineata a sinistra. */}
      {typeof durationMin === "number" ? (
        <button
          type="button"
          onClick={onClockToggle}
          className={cn(
            "flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-mini transition-colors",
            openPicker === "duration"
              ? "border-primary bg-primary-soft text-primary"
              : "border-transparent bg-surface-soft text-ink-soft hover:border-primary/40",
          )}
        >
          <IconClock size={12} aria-hidden />
          <span className="tracking-eyebrow uppercase text-micro text-ink-faint">Durata</span>
          <span className="font-semibold text-ink">{formatDuration(durationMin)}</span>
        </button>
      ) : null}

      {/* Popover floating — assoluto rispetto al blocco. Allineato a
          sinistra per arrival/duration, a destra per departure (lo
          posiziona sotto la rispettiva chip). z-dropdown per stare sopra
          il resto del pannello senza scavalcare modali. */}
      {openPicker ? (
        <div
          className={cn(
            "absolute top-full z-dropdown mt-2",
            openPicker === "departure" ? "right-0" : "left-0",
          )}
        >
          {openPicker === "arrival" ? (
            <ActivityTimePicker
              field="arrival"
              // Default 09:00 quando l'utente apre il picker su una chip
              // senza ora ancora impostata: è un orario "neutro" di
              // inizio giornata.
              hour={arrival.hour ?? 9}
              minute={arrival.minute ?? 0}
              onConfirm={(h, m) => onArrivalConfirm({ hour: h, minute: m })}
            />
          ) : null}
          {openPicker === "departure" ? (
            <ActivityTimePicker
              field="departure"
              // Default 10:00 (arrivo 09:00 + durata 60'); coerente con la
              // logica che la partenza dell'activity è derivata da arrivo
              // + durata e con DEFAULT_ACTIVITY_DURATION_MIN lato Timeline.
              hour={departure.hour ?? 10}
              minute={departure.minute ?? 0}
              onConfirm={(h, m) => onDepartureConfirm({ hour: h, minute: m })}
            />
          ) : null}
          {openPicker === "duration" && typeof durationMin === "number" ? (
            <ActivityDurationPicker
              durationMin={durationMin}
              onConfirm={onDurationConfirm}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stepper({
  onDecrement,
  onIncrement,
}: {
  onDecrement?: () => void;
  onIncrement?: () => void;
}) {
  const btn =
    "flex size-5 items-center justify-center rounded-xs text-ink transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink";
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Decrease nights" onClick={onDecrement} className={btn}>
        <IconMinus size={14} />
      </button>
      <button type="button" aria-label="Increase nights" onClick={onIncrement} className={btn}>
        <IconPlus size={14} />
      </button>
    </div>
  );
}
