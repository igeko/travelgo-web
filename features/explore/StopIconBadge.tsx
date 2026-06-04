/**
 * features/explore/StopIconBadge.tsx
 * ─────────────────────────────────────────────────────────────────
 * The rounded-square category badge that prefixes a stop row.
 * tone drives the fill: "ink" on a light row, "primary" when the row
 * itself is selected/dark, "plain" for the title inside an open card.
 *
 * Atomic level: atom.
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

export type StopIconTone = "ink" | "primary" | "plain";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export function StopIconBadge({
  icon: Icon,
  tone = "ink",
  size = 24,
  className,
}: {
  icon: IconCmp;
  tone?: StopIconTone;
  /** Outer badge size in px. */
  size?: number;
  className?: string;
}) {
  const plain = tone === "plain";
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xs",
        tone === "ink" && "bg-ink text-white",
        tone === "primary" && "bg-primary text-white",
        plain && "text-ink",
        className,
      )}
    >
      <Icon size={Math.round(size * (plain ? 0.9 : 0.62))} />
    </span>
  );
}
