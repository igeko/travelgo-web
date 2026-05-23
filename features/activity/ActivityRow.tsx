"use client";

import { createElement, useState } from "react";
import Link from "next/link";
import {
  IconChevronRight,
  IconCoin,
  IconMapPin,
  IconPencil,
  IconPlayerPlay,
  IconUnlink,
} from "@/components/ui/icons";
import { StatusBadge, type ActivityStatus } from "@/components/ui/StatusBadge";
import { ActivityEditForm, type ActivityData } from "./ActivityEditForm";
import { Button } from "@/components/ui/Button";
import { getStopIcon } from "./Timeline/stopIcons";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */

export type ActivityRowState = "default" | "now" | "selected" | "past";

export type ActivityRowProps = {
  /** Activity start time, "HH:mm" format */
  time?: string;
  title: string;
  description?: string;
  location?: string;
  /** Google place_id — when present the location badge links to the exact place on Maps */
  placeId?: string;
  /** Geocoded latitude. The "Map" badge only renders for a geocoded place (placeId or lat+lng). */
  lat?: number | null;
  /** Geocoded longitude. */
  lng?: number | null;
  /** Map pin number shown on the location badge */
  pin?: number;
  /** Activity category icon key (see Timeline/stopIcons) — used to give the Map badge semantic context */
  icon?: string | null;
  /** Cost in local currency (e.g. "¥3,200") */
  cost?: string;
  /** Approx converted cost (e.g. "≈ €20") */
  costApprox?: string;
  status?: ActivityStatus;
  state?: ActivityRowState;
  /** Thumbnail URL. Falls back to default banner. */
  thumb?: string;
  /** Destination URL (read-only mode) */
  href?: string;
  /** If true, shows edit affordances and inline form */
  editMode?: boolean;
  /** Initial data for the edit form */
  initialData?: Partial<ActivityData>;
  /** Activity ID — passed to ActivityEditForm to enable the ImagePicker */
  activityId?: string;
  /** Trip ID — passed to ActivityEditForm for the storage path */
  tripId?: string;
  onSave?: (data: ActivityData) => void;
  onDelete?: () => void;
  onAskGo?: (title: string, activityId?: string) => void;
  /**
   * Click handler for the "Map" badge. Return `true` if the click was
   * handled in-app (e.g. zoomed the embedded map); returning falsy lets
   * the badge fall back to opening Google Maps in a new tab.
   */
  onMapClick?: () => boolean | void;
  /** Labels for the row actions (edit / unschedule). */
  editLabel?: string;
  unscheduleLabel?: string;
  className?: string;
};

const DEFAULT_THUMB = "/media/day-default-banner.png";

/* ─────────────────────────────────────────────────────────────────
   ActivityRow
───────────────────────────────────────────────────────────────── */

export function ActivityRow({
  time,
  title,
  description,
  location,
  placeId,
  lat,
  lng,
  pin,
  icon,
  cost,
  costApprox,
  status,
  state = "default",
  thumb,
  href = "#",
  editMode = false,
  initialData,
  activityId,
  tripId,
  onSave,
  onDelete,
  onAskGo,
  onMapClick,
  editLabel = "Edit",
  unscheduleLabel = "Remove from day",
  className,
}: ActivityRowProps) {
  const [editOpen, setEditOpen] = useState(false);

  const isNow      = state === "now";
  const isSelected = state === "selected";
  const isPast     = state === "past";
  const isActive   = isNow || isSelected;

  const categoryIcon = getStopIcon(icon);

  // The "Map" badge only makes sense for a geocoded place: a Google place_id
  // or explicit coordinates. A free-text `location` alone is NOT a saved
  // address and must not surface the map action.
  const hasCoords = lat != null && lng != null;
  const hasMapTarget = !!placeId || hasCoords;

  /* ── Row wrapper classes ── */
  const rowBase = cn(
    "group relative flex gap-3 items-start",
    "rounded-md px-4 py-3",
    "transition-all duration-150 cursor-pointer select-none",
    // Past: desaturate + dim
    isPast && "opacity-50 grayscale-[60%]",
    // Now: warm accent background
    isNow && "bg-orange-soft",
    // Selected: soft surface lift
    isSelected && "bg-surface shadow-sm",
    // Edit-open: dashed warm outline
    editOpen && "bg-surface-warm outline outline-1 outline-dashed outline-orange-border",
    // Hover (only when not active/open)
    !isActive && !editOpen && "hover:bg-surface-soft",
    className,
  );

  /* ── Thumbnail ── */
  const thumbEl = (
    <div
      className={cn(
        "relative shrink-0 rounded-[10px] overflow-hidden bg-cover bg-center",
        "w-[114px] h-[88px]",
      )}
      style={{ backgroundImage: `url(${thumb ?? DEFAULT_THUMB})` }}
    >
      {/* Gradient for text legibility */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
      />

      {/* NOW badge */}
      {isNow && (
        <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-[3px] bg-orange text-white px-1.5 py-[2px] rounded-pill text-micro font-semibold tracking-[0.05em] shadow-sm">
          <IconPlayerPlay className="w-2.5 h-2.5" />
          NOW
        </span>
      )}

      {/* Time */}
      {time && (
        <span className="absolute bottom-1.5 left-2 z-10 text-white text-meta font-semibold tabular-nums leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
          {time}
        </span>
      )}
    </div>
  );

  /* ── Content ── */
  const contentEl = (
    <div className="flex-1 min-w-0 pt-0.5">

      {/* Title row */}
      <div className="flex items-start gap-2">
        <span className={cn(
          "flex-1 min-w-0 text-[15px] font-semibold leading-snug",
          isPast ? "text-ink-soft" : "text-ink",
        )}>
          {title}
        </span>

        {/* Status badge */}
        {status && (
          <StatusBadge status={status} className="shrink-0 mt-px" />
        )}

        {/* Row actions — edit + unschedule, visible on hover in edit mode */}
        {editMode && (
          <div
            className={cn(
              "flex items-center gap-1.5 shrink-0 transition-opacity duration-100",
              editOpen ? "opacity-100" : "opacity-30 group-hover:opacity-100 focus-within:opacity-100",
            )}
          >
            <Button
              variant="outline"
              iconOnly
              aria-label={editLabel}
              title={editLabel}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditOpen((v) => !v); }}
            >
              <IconPencil />
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                iconOnly
                aria-label={unscheduleLabel}
                title={unscheduleLabel}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
              >
                <IconUnlink />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="mt-1 text-meta leading-relaxed text-ink-soft line-clamp-2">
          {description}
        </p>
      )}

      {/* Meta row */}
      {(hasMapTarget || cost) && (
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {hasMapTarget && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onMapClick?.()) return; // handled in-app (e.g. zoomed the map)
                const url = placeId
                  ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
                  : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              title={location}
              className={cn(
                "inline-flex items-center gap-1 text-tiny font-medium transition-colors",
                "px-2 py-[3px] rounded-pill border border-border",
                "text-ink-soft bg-surface hover:bg-surface-soft hover:text-ink hover:border-border-strong",
              )}
            >
              {pin !== undefined ? (
                <span className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full bg-orange text-white text-[9px] font-semibold leading-none shrink-0">
                  {pin}
                </span>
              ) : categoryIcon ? (
                createElement(categoryIcon, { className: "w-3 h-3 shrink-0 text-orange" })
              ) : (
                <IconMapPin className="w-3 h-3 shrink-0" />
              )}
              Map
            </button>
          )}
          {cost && (
            <span className="inline-flex items-center gap-1 text-tiny text-ink-soft">
              <IconCoin className="w-3 h-3 shrink-0" />
              <b className="font-semibold text-ink">{cost}</b>
              {costApprox && <span>· {costApprox}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );

  /* ── Chevron ── */
  const chevronEl = (
    <IconChevronRight className={cn(
      "w-4 h-4 self-center shrink-0 transition-[color,transform] duration-150 text-ink-faint",
      "group-hover:text-ink group-hover:translate-x-0.5",
    )} />
  );

  /* ── Left accent bar (NOW) ── */
  const accentBar = isNow && (
    <span
      aria-hidden
      className="absolute left-0 top-3 bottom-3 w-[3px] bg-orange rounded-r-full"
    />
  );

  return (
    <div className="relative">

      {/* Row */}
      {editMode ? (
        <div
          className={rowBase}
          onClick={() => setEditOpen((v) => !v)}
          aria-expanded={editOpen}
        >
          {accentBar}
          {thumbEl}
          {contentEl}
          {chevronEl}
        </div>
      ) : (
        <Link href={href} className={rowBase}>
          {accentBar}
          {thumbEl}
          {contentEl}
          {chevronEl}
        </Link>
      )}

      {/* Inline edit form */}
      {editMode && editOpen && (
        <div className="mt-1 mb-2">
          <ActivityEditForm
            isNew={false}
            initialData={initialData}
            activityId={activityId}
            tripId={tripId}
            onSave={(data) => { onSave?.(data); setEditOpen(false); }}
            onCancel={() => setEditOpen(false)}
            onDelete={onDelete ? () => { onDelete(); setEditOpen(false); } : undefined}
            onAskGo={onAskGo}
          />
        </div>
      )}
    </div>
  );
}
