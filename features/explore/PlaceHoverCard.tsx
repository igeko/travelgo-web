"use client";

/**
 * PlaceHoverCard — 300px popover anchored above a map pin (design:
 * /design/place-hover, desktop variant). Shows a photo with an ink band
 * (name + rating), a short summary, an open/price meta row and two actions
 * (Chiedi a Go · Yumeji). Rich data is fetched lazily by placeId.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconStar, IconX, IconHeart, IconMapPin } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";

function priceSymbols(level?: number): string | null {
  if (level == null || level <= 0) return null;
  return "€".repeat(Math.min(level, 4));
}

export function PlaceHoverCard({
  placeId,
  fallbackName,
  onClose,
  onFavorite,
}: {
  placeId: string;
  fallbackName: string;
  onClose: () => void;
  onFavorite?: () => void;
}) {
  const t = useTranslations("Explore");
  const [place, setPlace] = useState<PlaceEnriched | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPlace(null);
    api.places
      .enriched<PlaceEnriched>(placeId)
      .then((p) => { if (!cancelled) setPlace(p); })
      .catch(() => { /* keep fallback */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [placeId]);

  const name = place?.name || fallbackName;
  // ~270px-wide slot → request a small photo (retina-ish) instead of 600px.
  const photoUrl = place?.photoRefs?.[0] ? api.places.photoUrl(place.photoRefs[0], 400) : null;
  const price = priceSymbols(place?.priceLevel);
  const showImage = photoUrl && !imgError;

  return (
    <div className="place-card-in w-[270px] overflow-hidden rounded-md border border-border bg-surface shadow-float">
      {/* Photo + ink band */}
      <div className="relative">
        {/* Gradient base — always present; the photo fades in over it, and it
            stays as the fallback when there's no photo or it fails to load. */}
        <div className="relative h-[130px] overflow-hidden bg-gradient-to-br from-primary-soft to-surface-warm">
          {!showImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <IconMapPin className="h-7 w-7 text-ink/15" />
            </div>
          )}
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
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-ink px-3 py-2">
            <span className="truncate text-[14px] font-medium leading-tight text-white">{name}</span>
            {place?.rating != null && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-white">
                <IconStar className="h-3 w-3" stroke={2.5} style={{ color: "#FAC775" }} />
                {place.rating}
              </span>
            )}
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

      {/* Body */}
      <div className="flex flex-col gap-2 p-3">
        {loading && !place ? (
          <div className="h-8 w-full animate-pulse rounded bg-surface-soft" />
        ) : place?.editorialSummary ? (
          <p className="text-[12px] leading-snug text-ink-soft">{place.editorialSummary}</p>
        ) : place?.address ? (
          <p className="text-[12px] leading-snug text-ink-soft">{place.address}</p>
        ) : null}

        {/* Open/price info on the left, Yumeji action on the right (saves height). */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-[11px] text-ink-soft">
            {place?.openNow != null && (
              <span className="inline-flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", place.openNow ? "bg-success-fg" : "bg-danger-fg")} />
                {place.openNow ? t("open") : t("closed")}
              </span>
            )}
            {place?.openNow != null && price && <span className="text-ink-faint">·</span>}
            {price && <span>{price}</span>}
          </div>
          <Button variant="outline" tone="neutral" size="sm" onClick={onFavorite} className="shrink-0">
            <IconHeart /> {t("wishlist")}
          </Button>
        </div>
      </div>
    </div>
  );
}
