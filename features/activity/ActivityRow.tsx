import Link from "next/link";
import {
  IconChevronRight,
  IconCoin,
  IconPlayerPlay,
} from "@/components/ui/icons";
import {
  StatusBadge,
  type ActivityStatus,
} from "@/components/ui/StatusBadge";

export type ActivityRowState = "default" | "now" | "selected" | "in-edit";

export type ActivityRowProps = {
  /** Activity start time, "HH:mm" format */
  time: string;
  title: string;
  description?: string;
  /** Map pin number (optional) */
  pin?: number;
  location?: string;
  /** Cost in local currency (e.g. "¥3,200") */
  cost?: string;
  /** Approx converted cost (e.g. "≈ €20") */
  costApprox?: string;
  /** Booking status */
  status?: ActivityStatus;
  /** Visual row state (default, now, selected, in-edit) */
  state?: ActivityRowState;
  /** Thumbnail URL. If omitted, soft background. */
  thumb?: string;
  /** Destination URL */
  href?: string;
};

const STATE_CLASSES: Record<ActivityRowState, string> = {
  default:
    "hover:bg-[rgba(13,44,61,0.04)] hover:px-3.5 hover:-mx-3.5",
  now: "bg-surface px-3.5 -mx-3.5",
  selected: "bg-surface px-3.5 -mx-3.5",
  "in-edit":
    "bg-surface-warm px-3.5 -mx-3.5 outline outline-1 outline-dashed outline-orange-border",
};

export function ActivityRow({
  time,
  title,
  description,
  pin,
  location,
  cost,
  costApprox,
  status,
  state = "default",
  thumb,
  href = "#",
}: ActivityRowProps) {
  const isNow = state === "now";

  return (
    <Link
      href={href}
      data-state={state}
      className={`
        group relative grid gap-[18px] items-start py-3.5 my-1 rounded-md
        text-inherit no-underline transition-[background,padding,margin] duration-200
        grid-cols-[100px_1fr_16px]
        max-[720px]:flex max-[720px]:flex-col max-[720px]:gap-2.5 max-[720px]:p-3.5
        ${STATE_CLASSES[state]}
      `}
    >
      {/* Orange side-bar · only in "now" state */}
      {isNow && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[70%] bg-orange rounded-r-[3px] z-[2] max-[720px]:top-[15%] max-[720px]:bottom-[15%] max-[720px]:h-auto max-[720px]:translate-y-0"
        />
      )}

      {/* Thumbnail with time overlay */}
      <div
        className="
          relative w-[100px] h-[100px] rounded-[12px] overflow-hidden bg-surface-soft bg-cover bg-center shrink-0
          max-[720px]:w-full max-[720px]:h-40
          max-[520px]:h-[140px]
        "
        style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-transparent from-30% to-black/60"
        />
        {isNow && (
          <span className="absolute top-2 left-2 z-[1] inline-flex items-center gap-[3px] bg-orange text-white px-2 py-[2px] rounded-pill text-[9px] font-medium tracking-[0.05em] shadow-[0_1px_4px_rgba(0,0,0,0.25)]">
            <IconPlayerPlay className="w-[11px] h-[11px]" />
            NOW
          </span>
        )}
        <div className="absolute left-2.5 bottom-2 z-[1] text-white text-lg font-medium leading-none tracking-[-0.02em] tabular-nums [text-shadow:0_1px_4px_rgba(0,0,0,0.4)] max-[720px]:left-3.5 max-[720px]:bottom-3 max-[720px]:text-[22px] max-[520px]:text-xl">
          {time}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3 max-[720px]:flex-col-reverse max-[720px]:items-start max-[720px]:gap-1.5">
          <div className="text-lg font-medium leading-[1.25] text-ink flex-1 min-w-0 max-[720px]:text-[17px] max-[520px]:text-base">
            {title}
          </div>
          {status && (
            <StatusBadge
              status={status}
              className="
                max-[720px]:absolute max-[720px]:top-6 max-[720px]:left-6 max-[720px]:z-[2]
                max-[720px]:bg-white/95 max-[720px]:backdrop-blur-md
                max-[720px]:shadow-[0_1px_4px_rgba(0,0,0,0.15)]
              "
            />
          )}
        </div>

        {description && (
          <p className="text-[13px] leading-[1.55] mt-1.5 text-ink max-[520px]:text-xs">
            {description}
          </p>
        )}

        <div className="flex items-center gap-3.5 mt-2.5 flex-wrap">
          {location && (
            <span className="text-[11px] text-ink-soft inline-flex items-center gap-1.5 cursor-pointer">
              {pin !== undefined && (
                <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-orange text-white text-[10px] font-medium leading-none shrink-0 transition-transform group-hover:scale-110">
                  {pin}
                </span>
              )}
              <span className="font-medium text-ink underline underline-offset-[3px] decoration-orange/25">
                {location}
              </span>
              <span className="text-orange text-[11px]">↗</span>
            </span>
          )}

          {cost && (
            <span className="text-[11px] text-ink-soft inline-flex items-center gap-1">
              <IconCoin className="w-3 h-3 text-ink-soft" />
              <b className="font-medium text-ink">{cost}</b>
              {costApprox && <span>· {costApprox}</span>}
            </span>
          )}
        </div>
      </div>

      {/* Chevron · hidden on mobile */}
      <IconChevronRight className="w-4 h-4 self-center text-ink-faint transition-[color,transform] duration-200 group-hover:text-ink group-hover:translate-x-0.5 max-[720px]:hidden" />
    </Link>
  );
}
