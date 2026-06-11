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

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconStar,
  IconX,
  IconHeart,
  IconClock,
  IconExternalLink,
  IconCalendarPlus,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconMapPin,
  IconCircleDashed,
  IconBed,
  IconBrandGoogleMaps,
} from "@/components/ui/icons";
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
  compact = false,
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
  /**
   * Add this place to the current trip (Google mode only). The current
   * enriched Place is forwarded when available; gli `opts` provengono dalla
   * voce dello split menu scelta dall'utente:
   * - `fuzzy: true` → riga creata senza orario (voce "Flessibile").
   * - `isAccommodation: true` → riga creata come pernottamento (voce
   *   "Pernottamento"); l'algoritmo add-to-trip ne fissa slot e check-in.
   */
  onAddToTrip?: (
    place: PlaceEnriched | null,
    opts?: { fuzzy?: boolean; isAccommodation?: boolean },
  ) => void;
  /**
   * Compact rendering for mobile sheet "place" state: label corta su
   * "Aggiungi al viaggio" e bottone Yumeji icon-only. Sul desktop popover
   * lasciare false (default) per labels piene.
   */
  compact?: boolean;
}) {
  const t = useTranslations("Explore");
  const [place, setPlace] = useState<PlaceEnriched | null>(initialPlace ?? null);
  const [loading, setLoading] = useState(!saved && !initialPlace);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  // Slider sulle foto Google: indice corrente, ripristinato a 0 quando
  // cambia il placeId (= nuovo set di photoRefs in arrivo).
  const [imgIdx, setImgIdx] = useState(0);

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

  // Reset all'apertura di un nuovo place: indice slider + flag immagine.
  useEffect(() => {
    setImgIdx(0);
    setImgLoaded(false);
    setImgError(false);
  }, [placeId]);

  const name = saved?.name || place?.name || fallbackName;
  // ~270px-wide slot → request a small photo (retina-ish) instead of 600px.
  // Slider: in modalità Google scorriamo le `photoRefs` (fino a 5 da
  // Place Details v1). In modalità saved restiamo sull'unica immagine.
  const photoRefs = saved ? null : (place?.photoRefs ?? []);
  const safeIdx = photoRefs && photoRefs.length > 0
    ? Math.min(imgIdx, photoRefs.length - 1)
    : 0;
  const photoUrl = saved
    ? saved.image
    : photoRefs && photoRefs[safeIdx]
      ? api.places.photoUrl(photoRefs[safeIdx], 400)
      : null;
  const photoCount = photoRefs?.length ?? 0;
  const hasSlider = photoCount > 1;
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
    !saved && (place?.openNow != null || price != null || place?.website != null || place?.placeId != null);

  return (
    <div className="place-card-in relative w-[270px] rounded-md border border-border-strong bg-surface shadow-float">
      {/* Photo + ink band — only when an image is available. Niente
          overflow-hidden sul wrapper esterno: il popover dello split
          button "Aggiungi al viaggio" deve poter uscire dal box. Le
          immagini sono comunque clippate dal blocco foto sotto (ha
          overflow-hidden + rounded-t-md per matchare i corner). */}
      {showImage ? (
        <div className="relative">
          {/* Aspect 3:2 → 270x180 (landscape) — molto più aria rispetto
              al precedente 130px (che ritagliava le foto a metà). */}
          <div className="relative aspect-[3/2] overflow-hidden rounded-t-md bg-gradient-to-br from-primary-soft to-surface-warm">
            {photoUrl && !imgError && (
              <img
                key={safeIdx}
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
            {/* Slider arrow buttons — visible solo quando ci sono ≥ 2 foto.
                Riposizionate a metà altezza, semi-trasparenti per non
                rubare attenzione all'immagine. */}
            {hasSlider && (
              <>
                <button
                  type="button"
                  aria-label="Foto precedente"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgLoaded(false);
                    setImgIdx((i) => (i - 1 + photoCount) % photoCount);
                  }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur-sm transition-colors hover:bg-ink/75"
                >
                  <IconChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Foto successiva"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgLoaded(false);
                    setImgIdx((i) => (i + 1) % photoCount);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur-sm transition-colors hover:bg-ink/75"
                >
                  <IconChevronRight size={16} />
                </button>
                {/* Dots indicator: piccoli puntini sopra la banda ink. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-12 flex items-center justify-center gap-1">
                  {photoRefs!.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === safeIdx ? "w-4 bg-white" : "w-1.5 bg-white/55",
                      )}
                    />
                  ))}
                </div>
              </>
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
            {place?.placeId && (
              <a
                href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place.placeId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-night hover:underline"
              >
                <IconBrandGoogleMaps className="h-3 w-3" stroke={2} />
                Google
              </a>
            )}
          </div>
        )}

        {/* Google actions — hidden in saved mode. Yumeji is always shown for
            backward compatibility; "Add to trip" appears only when wired. */}
        {!saved && (
          <div className="flex items-center gap-2">
            {onAddToTrip && (
              <SplitAddToTripButton
                compact={compact}
                onAddStop={() => onAddToTrip(place)}
                onAddFlex={() => onAddToTrip(place, { fuzzy: true })}
                onAddAccommodation={() => onAddToTrip(place, { isAccommodation: true })}
              />
            )}
            <Button
              variant="outline"
              tone="neutral"
              size="sm"
              iconOnly={onAddToTrip ? compact : false}
              aria-label={onAddToTrip && compact ? t("wishlist") : undefined}
              onClick={onFavorite}
              className={onAddToTrip ? "shrink-0" : "flex-1"}
            >
              <IconHeart /> {onAddToTrip && compact ? null : t("wishlist")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SplitAddToTripButton — corpo "Aggiungi al viaggio" + segmento chevron 32px.
 *
 * - Tap sul corpo → flusso default (tappa normale, `fuzzy: false`).
 * - Tap sul chevron → popover (`w-[180px]`, z-dropdown, ancorato al
 *   bottone) con due voci:
 *     · "Tappa"     → identico al corpo (fuzzy false).
 *     · "Flessibile" → identico al corpo MA `fuzzy: true` (la scheduled
 *       activity viene persistita senza orario; stesso giorno/posizione
 *       decisi dall'algoritmo add-to-trip, nessun endpoint nuovo).
 * - Chiusura: selezione voce, Esc, click-out, fuori-focus.
 *
 * Il caller (PlaceHoverCard) ha già rimosso l'`overflow-hidden` dal
 * wrapper card, quindi il popover può estendersi oltre il body senza
 * essere clippato.
 */
function SplitAddToTripButton({
  compact,
  onAddStop,
  onAddFlex,
  onAddAccommodation,
}: {
  compact: boolean;
  onAddStop: () => void;
  onAddFlex: () => void;
  onAddAccommodation: () => void;
}) {
  const t = useTranslations("Explore");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Click-out + Esc per chiudere. Stessa convention degli altri popover
  // (ActivityStop, IconPicker): pointerdown su un nodo esterno → close.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const node = rootRef.current;
      if (!node || node.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = compact ? t("addToTripShort") : t("addToTrip");

  return (
    <div ref={rootRef} className="relative flex-1">
      <div
        role="group"
        aria-label={t("addToTrip")}
        className="inline-flex h-8 w-full overflow-hidden rounded-md"
      >
        {/* Corpo sinistro: same default flow del bottone vecchio. */}
        <button
          type="button"
          onClick={onAddStop}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 bg-primary px-2 text-[13px] font-medium text-white transition-colors hover:bg-orange-deep",
          )}
        >
          <IconCalendarPlus size={14} />
          {label}
        </button>
        {/* Segmento chevron — 32px. Stesso bg, separatore bianco/25. */}
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("addToTripMenuLabel")}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-full w-8 shrink-0 items-center justify-center border-l border-white/25 bg-primary text-white transition-colors hover:bg-orange-deep",
            open && "bg-orange-deep",
          )}
        >
          <IconChevronDown size={14} />
        </button>
      </div>

      {/* Popover — w-[180px], z-dropdown, sotto al bottone con piccolo gap. */}
      {open ? (
        <div
          role="menu"
          aria-label={t("addToTripMenuLabel")}
          className="absolute right-0 top-full z-dropdown mt-1 w-[180px] rounded-md border border-border-strong bg-surface p-1 shadow-float"
        >
          <MenuItem
            icon={<IconMapPin size={16} />}
            label={t("addAsStop")}
            onClick={() => {
              setOpen(false);
              onAddStop();
            }}
          />
          <MenuItem
            icon={<IconCircleDashed size={16} />}
            label={t("addAsFlex")}
            hint={t("addAsFlexHint")}
            onClick={() => {
              setOpen(false);
              onAddFlex();
            }}
          />
          <MenuItem
            icon={<IconBed size={16} />}
            label={t("addAsAccommodation")}
            hint={t("addAsAccommodationHint")}
            onClick={() => {
              setOpen(false);
              onAddAccommodation();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-surface-soft focus-visible:bg-surface-soft focus-visible:outline-none"
    >
      <span className="inline-flex size-5 shrink-0 items-center justify-center text-ink-soft">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{label}</span>
        {hint ? (
          <span className="truncate text-tiny text-ink-faint">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}
