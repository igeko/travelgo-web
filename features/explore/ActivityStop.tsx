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

import { useEffect, useMemo, useState, type ComponentType } from "react";
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

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type ActivityStopState = "default" | "hover" | "selected" | "open";
export type ActivityStopAccent = "ink" | "primary";
export type LodgingMode = "sleep" | "stop";

export type { ActivityTime };

const MODE_OPTIONS = [
  { key: "sleep" as const, label: "Sleep", icon: IconBed },
  { key: "stop" as const, label: "Stop", icon: IconMapPin },
];

export function ActivityStop({
  title,
  icon = IconBed,
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
  className,
}: {
  title: string;
  icon?: IconCmp;
  state?: ActivityStopState;
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
    return (
      <Wrapper
        type={onOpen ? "button" : undefined}
        onClick={onOpen}
        className={cn(
          "group flex min-h-8 w-full items-center justify-between gap-3 rounded-sm py-1 pr-3.5 pl-1",
          onOpen && "cursor-pointer",
          state === "hover" && "bg-surface-soft",
          interactive && "hover:bg-surface-soft focus-visible:bg-surface-soft",
          selected && "bg-ink",
          isDragging && "opacity-40",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <StopIconBadge icon={icon} tone={selected || accent === "primary" ? "primary" : "ink"} />
          <span className={cn("truncate text-[14px]", selected ? "text-white" : "text-ink")}>
            {title}
          </span>
        </span>
        {time ? (
          <span
            className={cn(
              "shrink-0 text-nano tabular-nums",
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
              state === "hover"
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
            aria-label={dragHandleProps ? "Trascina per riordinare" : undefined}
            role={dragHandleProps ? "button" : undefined}
          >
            <IconGripVertical size={16} />
          </span>
        ) : null}
      </Wrapper>
    );
  }

  /* ── Open ───────────────────────────────────────────────────── */
  return (
    <div className={cn("flex w-full flex-col gap-1 rounded-sm bg-ink p-1", className)}>
      <div className="flex items-center gap-2 px-1 py-0.5">
        <StopIconBadge icon={icon} tone="primary" />
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
            <StoppingFor duration={duration} timeRange={timeRange} />
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

        {/* Arrival / Departure — lodging (Sleep) only */}
        {mode === "sleep" && <ArrivalDeparture arrival={arrival} departure={departure} />}
      </StopEditorCard>
    </div>
  );
}

/* ── Sub-parts ──────────────────────────────────────────────────── */

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
