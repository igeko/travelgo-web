import { SLOT_COLORS } from "./types";
import type { SlotKey } from "./types";

export function SlotStation({
  label,
  count,
  slot,
  showSlotColor = false,
}: {
  label: string;
  /** Number of activities in this slot (rendered as "N acts") */
  count?: number;
  /** The slot this station heads — drives the reference colour line. */
  slot?: SlotKey | null;
  /** Show a short line in the slot's reference colour next to the name. */
  showSlotColor?: boolean;
}) {
  const color = showSlotColor && slot ? SLOT_COLORS[slot] : null;

  return (
    <div className="flex items-baseline gap-3.5 mt-6 mb-1.5 first:mt-2">
      <span className="text-xs font-medium tracking-eyebrow-wide uppercase text-orange">
        {label}
      </span>
      {color && (
        <span
          aria-hidden="true"
          className="h-1 w-8 rounded-pill shrink-0 self-center"
          style={{ background: color }}
        />
      )}
      <span className="flex-1 h-px bg-orange/25" />
      {count !== undefined && (
        <span className="text-micro text-ink-soft tracking-[0.1em] uppercase">
          {count} acts
        </span>
      )}
    </div>
  );
}
