"use client";

/**
 * PlaceHoverCard — 270px popover anchored above a map pin (design:
 * /design/place-hover, desktop variant). Shows a photo with an ink band
 * (name + rating/day), a short summary, a meta row and action buttons.
 *
 * Two data sources, ONE layout:
 *  - Google mode: rich place data fetched lazily by `placeId`.
 *  - Saved mode: pass `saved` to render the trip's OWN stored data (activity /
 *    accommodation) — no Google lookup. Extra fields (time, day, type, link)
 *    render only when present.
 *
 * When no image is available the photo section is omitted entirely and a
 * compact text header (name + rating/day) takes its place.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconStar, IconX, IconHeart, IconClock, IconExternalLink, IconCalendarPlus } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";

/** Trip-stored details for the saved (non-Google) card mode. */
export type SavedPlaceInfo = {
  name: string;
  /** Full image URL (activity hero_image / day image_url), or null for the gradient fallback. */
  image: string | null;
  /** Summary paragraph — activity description, falls back to address. */
  description: string | null;
  address: string | null;
  /** Activity time "HH:mm". */
  time: string | null;
  /** "Day 3" / "Days 3–5" — already localized by the caller. */
  dayLabel: string | null;
  /** Accommodation kind label (hotel/campground/…). */
  typeLabel: string | null;
  /** Accommodation URL. */
  url: string | null;
};

function priceSymbols(level?: number): string | null {
  if (level == null || level <= 0) return null;
  return "€".repeat(Math.min(level, 4));
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

export function PlaceHoverCard({
  placeId,
  saved,
  initialPlace,
  fallbackName,
  onClose,
  onFavorite,
  onAddToTrip,
}: {
  /** Google place id — required unless `saved` is given. */
  placeId?: string;
  /** Trip-stored data; when present the card renders this and skips the Google fetch. */
  saved?: SavedPlaceInfo;
  /** Pre-fetched Google place data — skips the lazy fetch. Useful for SSR / sandbox. */
  initialPlace?: PlaceEnriched | null;
  fallbackName: string;
  onClose: () => void;
  onFavorite?: () => void;
  /** Add this place to the current trip (Google mode only). */
  onAddToTrip?: () => void;
}) {
  const t = useTranslations("Explore");
  const [place, setPlace] = useState<PlaceEnriched | null>(initialPlace ?? null);
  const [loading, setLoading] = useState(!saved && !initialPlace);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (saved || initialPlace || !placeId) return;
    let cancelled = false;
    setLoading(true);
    setPlace(null);
    api.places
      .enriched<PlaceEnriched>(placeId)
      .then((p) => { if (!cancelled) setPlace(p); })
      .catch(() => { /* keep fallback */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [placeId, saved, initialPlace]);

  const name = saved?.name || place?.name || fallbackName;
  // ~270px-wide slot → request a small photo (retina-ish) instead of 600px.
  const photoUrl = saved
    ? saved.image
    : place?.photoRefs?.[0]
      ? api.places.photoUrl(place.photoRefs[0], 400)
      : null;
  const price = priceSymbols(place?.priceLevel);
  const showImage = photoUrl && !imgError;
  const summary = saved ? saved.description || saved.address : place?.editorialSummary || place?.address;

  // Right-side accessory shown next to the name (rating · ratings count in
  // Google mode, day label in saved mode).
  const nameAccessory =
    saved ? (
      saved.dayLabel ? (
        <span className="shrink-0 text-[12px]">{saved.dayLabel}</span>
      ) : null
    ) : place?.rating != null ? (
      <span className="inline-flex shrink-0 items-center gap-1 text-[12px]">
        <IconStar className="h-3 w-3" stroke={2.5} style={{ color: "#FAC775" }} />
        {place.rating}
        {place.userRatingsTotal != null && (
          <span className="text-white/65">({formatCount(place.userRatingsTotal)})</span>
        )}
      </span>
    ) : null;

  const hasGoogleMeta =
    !saved && (place?.openNow != null || price != null || place?.website != null);

  return (
    <div className="place-card-in w-[270px] overflow-hidden rounded-md border border-border-strong bg-surface shadow-float">
      {/* Photo + ink band — only when an image is available. */}
      {showImage ? (
        <div className="relative">
          <div className="relative h-[130px] overflow-hidden bg-gradient-to-br from-primary-soft to-surface-warm">
            {photoUrl && !imgError && (
              <img
                src={photoUrl}
                alt={name}
                loading="lazy"
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ease-out",
                  imgLoaded ? "opacity-100" : "opacity-0",
                )}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-ink px-3 py-2 text-white">
              <span className="truncate text-[14px] font-medium leading-tight">{name}</span>
              {nameAccessory && <span className={saved ? "text-white/80" : ""}>{nameAccessory}</span>}
            </div>
          </div>
          <Button
            variant="over-media"
            size="sm"
            iconOnly
            aria-label={t("close")}
            onClick={onClose}
            className="absolute right-2 top-2"
          >
            <IconX size={14} />
          </Button>
        </div>
      ) : (
        // Text header (no image) — name + accessory + close button.
        <div className="flex items-start justify-between gap-2 px-3 pt-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[14px] font-medium leading-tight text-ink">{name}</span>
            {nameAccessory && <span className="text-ink-soft">{nameAccessory}</span>}
          </div>
          <Button
            variant="ghost"
            tone="neutral"
            size="sm"
            iconOnly
            aria-label={t("close")}
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0"
          >
            <IconX size={14} />
          </Button>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col gap-2 p-3">
        {loading && !place ? (
          <div className="h-8 w-full animate-pulse rounded bg-surface-soft" />
        ) : summary ? (
          <p className="text-[12px] leading-snug text-ink-soft">{summary}</p>
        ) : null}

        {/* Saved extras — each shown only when present. */}
        {saved && (saved.time || saved.typeLabel || saved.url) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
            {saved.time && (
              <span className="inline-flex items-center gap-1">
                <IconClock className="h-3 w-3 text-ink-faint" stroke={2} />
                {saved.time}
              </span>
            )}
            {saved.typeLabel && (
              <span className="rounded-pill bg-night-soft px-2 py-0.5 font-medium uppercase tracking-meta text-night">
                {saved.typeLabel}
              </span>
            )}
            {saved.url && (
              <a
                href={saved.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-night hover:underline"
              >
                <IconExternalLink className="h-3 w-3" stroke={2} />
                {t("openLink")}
              </a>
            )}
          </div>
        )}

        {/* Google meta row — open/now · price · website. */}
        {hasGoogleMeta && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
            {place?.openNow != null && (
              <span className="inline-flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", place.openNow ? "bg-success-fg" : "bg-danger-fg")} />
                {place.openNow ? t("open") : t("closed")}
              </span>
            )}
            {price && <span>{price}</span>}
            {place?.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-night hover:underline"
              >
                <IconExternalLink className="h-3 w-3" stroke={2} />
                {t("website")}
              </a>
            )}
          </div>
        )}

        {/* Google actions — hidden in saved mode. Yumeji is always shown for
            backward compatibility; "Add to trip" appears only when wired. */}
        {!saved && (
          <div className="flex items-center gap-2">
            {onAddToTrip && (
              <Button
                variant="solid"
                tone="neutral"
                size="sm"
                onClick={onAddToTrip}
                className="flex-1 bg-primary border-primary text-white hover:bg-orange-deep hover:border-orange-deep hover:text-white"
              >
                <IconCalendarPlus /> {t("addToTrip")}
              </Button>
            )}
            <Button
              variant="outline"
              tone="neutral"
              size="sm"
              onClick={onFavorite}
              className={onAddToTrip ? "shrink-0" : "flex-1"}
            >
              <IconHeart /> {t("wishlist")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
