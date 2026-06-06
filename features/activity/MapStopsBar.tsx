"use client";

import { createElement, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { IconChevronRight, IconMapPin } from "@/components/ui/icons";
import { getStopIcon } from "./Timeline/stopIcons";
import type { RouteStop } from "@/features/activity/types";

type Props = {
  /** Ordered stops shown on the map (only activities with coordinates). */
  stops: RouteStop[];
  /** Zoom the map onto the stop at `index`. */
  onFocus: (index: number) => void;
};

/**
 * Horizontal "route" of activity shortcuts under the map: each chip focuses
 * the map on its stop. Scrolls horizontally when the chips overflow one row.
 */
export function MapStopsBar({ stops, onFocus }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Translate vertical mouse-wheel scroll into horizontal so a plain mouse can
  // pan the row. Native non-passive listener is required to call preventDefault.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el || el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  if (stops.length === 0) return null;
  return (
    <div
      ref={scrollRef}
      className="scrollbar-x -mx-1 mb-4 flex items-center gap-1 overflow-x-auto px-1 pb-2"
    >
      {stops.map((stop, i) => {
        const Icon = getStopIcon(stop.iconKey) ?? IconMapPin;
        return (
          <div key={i} className="flex shrink-0 items-center gap-1">
            {i > 0 && (
              <IconChevronRight className="size-3.5 shrink-0 text-ink-faint" />
            )}
            <button
              type="button"
              onClick={() => onFocus(i)}
              title={stop.name}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-border bg-surface",
                "px-2.5 py-1.5 text-mini font-medium text-ink-soft transition-colors",
                "hover:bg-surface-soft hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-border",
              )}
            >
              {createElement(Icon, { className: "size-4 shrink-0 text-primary" })}
              <span className="max-w-40 truncate whitespace-nowrap">{stop.name}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
