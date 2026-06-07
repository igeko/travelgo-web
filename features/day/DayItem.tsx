import { cn } from "@/lib/cn";
import { IconClockExclamation } from "@/components/ui/icons";

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
  /** Collapsed mode: render only the date (dow + number), hiding zone/place. */
  compact?: boolean;
  /**
   * Compact-only — riempimento del giorno in percentuale (0–100). Pilota il
   * colore della fill bar: < 80 % verde, ≥ 80 % amber. Quando undefined la
   * fill bar resta una track vuota — utile finché il call site non ha
   * aggregato il carico per giorno.
   */
  fillPct?: number;
  /**
   * Compact-only — la giornata supera la capacità disponibile. Forza fill bar
   * piena rossa, badge bg-danger-bg, e icona clock-exclamation nello stub.
   */
  overflow?: boolean;
  /** Compact-only — primo giorno della colonna: badge con top quadrato e
   *  doppia barretta superiore come terminatore visivo. */
  isFirst?: boolean;
  /** Compact-only — ultimo giorno della colonna: badge e stub con bottom
   *  quadrato e doppia barretta inferiore. */
  isLast?: boolean;
};

const ZONE_FALLBACK = "No zone yet";

/* ── Compact helpers ───────────────────────────────────────────────── */

function fillBarColor(fillPct: number, overflow: boolean): string {
  if (overflow) return "bg-danger-fg";
  if (fillPct >= 80) return "bg-warning-fg";
  return "bg-ok-fg";
}

function FillBar({ fillPct, overflow }: { fillPct: number; overflow: boolean }) {
  const effective = overflow ? 100 : Math.max(0, Math.min(100, fillPct));
  return (
    <div className="w-9 h-1 bg-surface-soft overflow-hidden">
      <div
        className={cn("h-full", fillBarColor(fillPct, overflow))}
        style={{ width: `${effective}%` }}
      />
    </div>
  );
}

function AccentBar() {
  return <div className="w-9 h-1 bg-ink/15" />;
}

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
  compact = false,
  fillPct,
  overflow = false,
  isFirst = false,
  isLast = false,
}: DayItemProps) {
  const zoneText = zone ?? ZONE_FALLBACK;
  const placeText = place ?? placeFallback;

  if (compact) {
    // Overflow batte selected sul background: il rosso è il segnale di rischio
    // e deve restare visibile anche quando il giorno è selezionato.
    const badgeBg =
      overflow ? "bg-danger-bg border border-danger-border" :
      selected ? "bg-ink" :
      "bg-surface-soft";

    const badgeRadius =
      isFirst ? "rounded-t-none rounded-b-xs" :
      isLast  ? "rounded-b-none rounded-t-xs" :
      "rounded-xs";

    const dowColor =
      overflow ? "text-danger-fg" :
      selected ? "text-white/50" :
      "text-ink/40";

    const numColor =
      overflow ? "text-danger-fg" :
      selected ? "text-white" :
      "text-ink";

    const stubBg = overflow ? "bg-danger-bg" : "bg-surface-soft";
    const stubRadius = isLast ? "rounded-none" : "rounded-b-xs";
    const effectivePct = fillPct ?? 0;

    return (
      <li className="list-none">
        <button
          type="button"
          onClick={onClick}
          aria-current={selected ? "true" : undefined}
          aria-label={`${dow} ${dayNumber}`}
          className="flex w-9 flex-col items-center cursor-pointer mx-auto"
        >
          {isFirst && (
            <>
              <AccentBar />
              <div className="h-0.5" />
            </>
          )}

          <FillBar fillPct={effectivePct} overflow={overflow} />
          <div className="h-[3px]" />

          <div
            className={cn(
              "w-9 h-9 flex flex-col items-center justify-center gap-px",
              badgeBg,
              badgeRadius,
            )}
          >
            <span
              className={cn(
                "text-[9px] font-medium tracking-meta uppercase leading-none",
                dowColor,
              )}
            >
              {dow}
            </span>
            <span className={cn("text-[15px] font-medium leading-none", numColor)}>
              {dayNumber}
            </span>
          </div>

          <div
            className={cn(
              "w-9 mt-0.5 min-h-[44px] flex items-center justify-center",
              stubBg,
              stubRadius,
            )}
          >
            {overflow && <IconClockExclamation size={14} className="text-danger-fg" />}
          </div>

          {isLast && (
            <>
              <div className="h-0.5" />
              <AccentBar />
            </>
          )}
        </button>
      </li>
    );
  }

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
              "text-micro tracking-[0.05em] uppercase",
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
              "text-micro tracking-[0.05em] uppercase font-medium",
              selected ? "text-[#f9a87a]" : "text-orange",
              !zone && "italic opacity-70",
            )}
          >
            {zoneText}
          </div>
          <div
            className={cn(
              "text-meta truncate",
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
