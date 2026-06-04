/**
 * features/explore/StoppingFor.tsx
 * ─────────────────────────────────────────────────────────────────
 * The "Stopping for N minutes / start → end" caption shown for a
 * brief stop. Shared by FuzzyStop and by ActivityStop when its
 * Sleep/Stop toggle is set to "Stop".
 *
 * Atomic level: molecule.
 * ─────────────────────────────────────────────────────────────────
 */

import { IconClock } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function StoppingFor({
  duration = "30 minutes",
  timeRange = "10:30 → 11:00",
  className,
}: {
  duration?: string;
  timeRange?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center gap-2 px-2", className)}>
      <IconClock size={14} className="shrink-0 text-ink" />
      <div className="flex flex-col gap-0.5">
        <p className="text-nano text-ink">
          Stopping for{" "}
          <span className="border-b border-dashed border-ink-soft">{duration}</span>
        </p>
        <p className="text-nano text-ink-soft">{timeRange}</p>
      </div>
    </div>
  );
}
