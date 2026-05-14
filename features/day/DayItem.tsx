import { cn } from "@/lib/cn";

export type DayItemData = {
  /** Unique identifier for the day (e.g. "day-0", "day-1") */
  id: string;
  /** Day of week, 3 uppercase letters (e.g. "MON") */
  dow: string;
  /** Day-of-month number (rendered large) */
  dayNumber: number;
  /** Zone/region (e.g. "TOKYO / MT FUJI"). If absent → "No zone yet" */
  zone?: string;
  /** Place for the day (e.g. "Mt Fuji excursion"). If absent → placeFallback */
  place?: string;
};

export type DayItemProps = DayItemData & {
  selected?: boolean;
  onClick?: () => void;
  /** Fallback for the place when missing (defaults to "No place yet") */
  placeFallback?: string;
};

const ZONE_FALLBACK = "No zone yet";

/**
 * DayList row. Renders a <button> for accessibility (click + keyboard).
 * The selected state applies the ink background and an orange side-bar.
 */
export function DayItem({
  dow,
  dayNumber,
  zone,
  place,
  placeFallback = "No place yet",
  selected = false,
  onClick,
}: DayItemProps) {
  const zoneText = zone ?? ZONE_FALLBACK;
  const placeText = place ?? placeFallback;

  return (
    <li className="list-none border-b border-dashed border-border last:border-0 pr-1">
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "relative grid w-full items-center text-left",
          "grid-cols-[50px_1fr_14px] gap-2.5",
          "px-[10px] py-[8px] cursor-pointer transition-colors",
          !selected && "hover:bg-surface-soft",
          selected && "bg-ink text-white rounded-md my-0.5 py-[10px]",
        )}
      >
        {selected && (
          <span
            aria-hidden
            className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-1.5 h-[30px] bg-orange rounded-[3px]"
          />
        )}

        {/* Number + DOW */}
        <div className="text-center">
          <div
            className={cn(
              "text-[10px] tracking-[0.05em] uppercase",
              selected ? "text-white/70" : "text-ink-soft",
            )}
          >
            {dow}
          </div>
          <div
            className={cn(
              "text-lg font-semibold leading-tight",
              selected ? "text-white" : "text-ink",
            )}
          >
            {dayNumber}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div
            className={cn(
              "text-[10px] tracking-[0.05em] uppercase font-medium",
              selected ? "text-[#f9a87a]" : "text-orange",
              !zone && "italic opacity-70",
            )}
          >
            {zoneText}
          </div>
          <div
            className={cn(
              "text-[13px] truncate",
              selected ? "text-white" : "text-ink",
              !place && "italic opacity-60",
            )}
          >
            {placeText}
          </div>
        </div>

        {/* Chevron */}
        <span
          aria-hidden
          className={cn(
            "text-sm leading-none",
            selected ? "text-white/60" : "text-ink-faint",
          )}
        >
          ›
        </span>
      </button>
    </li>
  );
}
