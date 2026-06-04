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

import { type ComponentType, useState } from "react";
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
  dateRange = "Thu 04 → Sat 06",
  duration = "30 minutes",
  timeRange = "10:30 → 11:00",
  description,
  address = null,
  onAddressChange,
  arrival,
  departure,
  onOpen,
  onClose,
  onRemove,
  onNightsChange,
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
  dateRange?: string;
  /** "Stop" mode — how long the stop lasts. */
  duration?: string;
  /** "Stop" mode — the time window. */
  timeRange?: string;
  description?: string;
  /** Initial address (the field manages its own value afterwards). */
  address?: PlaceResult | null;
  onAddressChange?: (place: PlaceResult | null) => void;
  arrival?: ActivityTime;
  departure?: ActivityTime;
  onOpen?: () => void;
  onClose?: () => void;
  onRemove?: () => void;
  onNightsChange?: (next: number) => void;
  className?: string;
}) {
  const [addressValue, setAddressValue] = useState<PlaceResult | null>(address);
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
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <StopIconBadge icon={icon} tone={selected || accent === "primary" ? "primary" : "ink"} />
          <span className={cn("truncate text-[14px]", selected ? "text-white" : "text-ink")}>
            {title}
          </span>
        </span>
        {!selected ? (
          <IconGripVertical
            size={16}
            className={cn(
              "shrink-0 text-ink-faint transition-opacity",
              state === "hover"
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
          />
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

      <StopEditorCard icon={icon} title={title} onClose={onClose} onRemove={onRemove}>
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
                <IconCalendar size={14} className="shrink-0 text-ink" />
                <div className="flex flex-col">
                  <p className="leading-none text-ink">
                    <span className="text-[20px] font-medium">{nights}</span>{" "}
                    <span className="text-nano font-medium">nights</span>
                  </p>
                  <p className="text-nano text-ink-soft">{dateRange}</p>
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
          onChange={(place) => {
            setAddressValue(place);
            onAddressChange?.(place);
          }}
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
