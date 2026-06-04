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
 * Atomic level: organism. Composes StopEditorCard + AddressRow +
 * ArrivalDeparture.
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType } from "react";
import { IconCoffee } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { StopEditorCard } from "./StopEditorCard";
import { AddressRow } from "./AddressRow";
import { StoppingFor } from "./StoppingFor";
import { ArrivalDeparture, type ActivityTime } from "./ArrivalDeparture";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type FuzzyStopState = "default" | "hover" | "selected" | "open";

export function FuzzyStop({
  title,
  icon: Icon = IconCoffee,
  state = "default",
  duration = "30 minutes",
  timeRange = "10:30 → 11:00",
  description,
  address,
  arrival,
  departure,
  onOpen,
  onClose,
  onRemove,
  className,
}: {
  title: string;
  icon?: IconCmp;
  state?: FuzzyStopState;
  duration?: string;
  timeRange?: string;
  description?: string;
  address?: string;
  arrival?: ActivityTime;
  departure?: ActivityTime;
  onOpen?: () => void;
  onClose?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  /* ── Collapsed rows ─────────────────────────────────────────── */
  if (state !== "open") {
    const selected = state === "selected";
    const Wrapper = onOpen ? "button" : "div";
    return (
      <Wrapper
        type={onOpen ? "button" : undefined}
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-2 rounded-sm p-1",
          onOpen && "cursor-pointer",
          state === "hover" && "bg-surface-soft",
          selected && "bg-ink",
          className,
        )}
      >
        <Icon size={16} className={cn("shrink-0", selected ? "text-white" : "text-ink-soft")} />
        <span
          className={cn(
            "truncate text-mini font-medium capitalize",
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
        <StoppingFor duration={duration} timeRange={timeRange} />

        {description ? <p className="w-full text-mini text-ink">{description}</p> : null}

        <AddressRow value={address} />

        <ArrivalDeparture arrival={arrival} departure={departure} />
      </StopEditorCard>
    </div>
  );
}
