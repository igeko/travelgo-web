"use client";

/**
 * features/explore/FuzzyStop.tsx
 * ─────────────────────────────────────────────────────────────────
 * Figma "Fuzzy" — a fuzzy-time stop in the Explore timeline (e.g. a
 * coffee break). A lighter sibling of ActivityStop: the collapsed row
 * is a small glyph + medium label; opened, the editor card carries a
 * "Stopping for N minutes / start → end" block instead of the
 * Sleep/Stop + nights controls.
 *
 * States: default · hover · selected (navy) · open.
 *
 * Atomic level: organism. Composes StopEditorCard + AddressRow + InlineActivityTime
 * (chip arrivo/partenza/durata identiche ad ActivityStop).
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType } from "react";
import { IconCoffee } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { StopEditorCard } from "./StopEditorCard";
import { AddressRow } from "./AddressRow";
import { InlineActivityTime, type ClockHM } from "./InlineActivityTime";
import { type ActivityTime } from "./ArrivalDeparture";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type FuzzyStopState = "default" | "hover" | "selected" | "open";
/** Scala visiva del collapsed (vedi `ActivityStopSize`). */
export type FuzzyStopSize = "md" | "sm";

export function FuzzyStop({
  title,
  icon: Icon = IconCoffee,
  state = "default",
  description,
  address,
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
  size = "md",
  className,
}: {
  title: string;
  icon?: IconCmp;
  state?: FuzzyStopState;
  description?: string;
  address?: string;
  /** @deprecated Legacy ArrivalDeparture display — sostituito dalle chip
   *  con picker via `arrivalHM` / `departureHM`. Mantenuto per
   *  retrocompatibilità sandbox. */
  arrival?: ActivityTime;
  departure?: ActivityTime;
  /** Tempi calcolati dal solver (cascade): valori in HH:mm numerico,
   *  identici a quelli usati da `ActivityStop` open per le chip di
   *  arrivo/partenza/durata. */
  arrivalHM?: ClockHM;
  departureHM?: ClockHM;
  arrivalDateLabel?: string;
  departureDateLabel?: string;
  durationMin?: number;
  onArrivalChange?: (hm: ClockHM) => void;
  onDepartureChange?: (hm: ClockHM) => void;
  onDurationChange?: (durationMin: number) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onRemove?: () => void;
  /** Scala visiva del collapsed. Default "md". */
  size?: FuzzyStopSize;
  className?: string;
}) {
  /* ── Collapsed rows ─────────────────────────────────────────── */
  if (state !== "open") {
    const selected = state === "selected";
    const Wrapper = onOpen ? "button" : "div";
    const compact = size === "sm";
    return (
      <Wrapper
        type={onOpen ? "button" : undefined}
        onClick={onOpen}
        className={cn(
          "flex w-full items-center rounded-sm",
          compact ? "gap-1.5 px-1 py-0.5" : "gap-2 p-1",
          onOpen && "cursor-pointer",
          state === "hover" && "bg-surface-soft",
          selected && "bg-ink",
          className,
        )}
      >
        <Icon
          size={compact ? 13 : 16}
          className={cn("shrink-0", selected ? "text-white" : "text-ink-soft")}
        />
        <span
          className={cn(
            "truncate font-medium capitalize",
            compact ? "text-[11px]" : "text-mini",
            selected ? "text-white" : "text-ink-soft",
          )}
        >
          {title}
        </span>
      </Wrapper>
    );
  }

  /* ── Open ───────────────────────────────────────────────────── */
  return (
    <div className={cn("flex w-full flex-col gap-1 rounded-sm bg-ink p-1", className)}>
      <div className="flex items-center gap-2 px-1 py-0.5">
        <Icon size={16} className="shrink-0 text-white" />
        <span className="truncate text-mini font-medium capitalize text-white">{title}</span>
      </div>

      <StopEditorCard icon={Icon} title={title} onClose={onClose} onRemove={onRemove}>
        {description ? <p className="w-full text-mini text-ink">{description}</p> : null}

        <AddressRow value={address} />

        <InlineActivityTime
          arrivalHM={arrivalHM}
          departureHM={departureHM}
          arrivalDateLabel={arrivalDateLabel}
          departureDateLabel={departureDateLabel}
          durationMin={durationMin}
          onArrivalChange={onArrivalChange}
          onDepartureChange={onDepartureChange}
          onDurationChange={onDurationChange}
        />
      </StopEditorCard>
    </div>
  );
}
