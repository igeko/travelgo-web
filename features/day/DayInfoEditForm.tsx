"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { SoftField } from "@/components/ui/SoftField";
import { Button } from "@/components/ui/Button";
import { ImagePicker, type CompressOptions, type UploadOptions } from "@/components/ui/ImagePicker";

/* ─────────────────────────────────────────────────────────────────
   DayInfoEditForm · the "day anagrafica" editor.
   Extracted from HeroBanner so it can be reused standalone (sandbox,
   DayEditForm) and embedded as the hero accordion inside HeroBanner.

   Two consumption modes:
   - standalone: renders its own footer (Save / Cancel). Parent listens
     via onSave().
   - embedded: pass hideFooter and read the draft via ref.getData() when
     the host's own footer fires.
───────────────────────────────────────────────────────────────── */

export const HERO_TYPE_CHIPS = ["City", "Nature", "Roadtrip", "Beach", "Village", "Rest"] as const;
export type HeroBannerType = (typeof HERO_TYPE_CHIPS)[number];

const DEFAULT_BANNER = "/media/day-default-banner.png";

/** Maps a HeroBannerType to its default background image. Falls back to the generic default. */
export const HERO_TYPE_BANNERS: Record<HeroBannerType, string> = {
  City:     "/media/day-banner-city.png",
  Nature:   "/media/day-banner-nature.png",
  Roadtrip: "/media/day-banner-roadtrip.png",
  Beach:    "/media/day-banner-beach.png",
  Village:  "/media/day-banner-village.png",
  Rest:     DEFAULT_BANNER,
};

export function resolveHeroBanner(type?: HeroBannerType, imageUrl?: string): string {
  if (imageUrl) return imageUrl;
  if (type) return HERO_TYPE_BANNERS[type];
  return DEFAULT_BANNER;
}

/* ── Save payload ────────────────────────────────────────────────── */
export type HeroBannerData = {
  title: string;
  subtitle: string;
  imageUrl: string;
  type?: HeroBannerType;
  summary?: string;
  practicalNote?: string;
};

/* ── Imperative handle ───────────────────────────────────────────── */
export type DayInfoEditFormHandle = {
  /** Read the current draft as a HeroBannerData payload. */
  getData: () => HeroBannerData;
};

export type DayInfoEditFormProps = {
  /** Change this to re-seed the drafts from props (e.g. when the day changes). */
  resetKey?: string | number;
  title: string;
  subtitle?: string;
  summary?: string;
  practicalNote?: string;
  type?: HeroBannerType;
  imageUrl?: string;
  imageCompress?: CompressOptions;
  imageUpload?: UploadOptions;
  /** Called when the standalone footer's Save is pressed. */
  onSave?: (data: HeroBannerData) => void;
  /** Called when the standalone footer's Cancel is pressed. */
  onCancel?: () => void;
  /** Hide the built-in footer (host provides its own + reads via ref). */
  hideFooter?: boolean;
  /** Hide the small "form title" eyebrow (host provides its own header). */
  hideTitle?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/** Left image column width · the empty grid cells below the image reuse it
 *  so every input field shares the same left edge. */
const IMG_W = 120;
const IMG_H = 68;

export const DayInfoEditForm = forwardRef<DayInfoEditFormHandle, DayInfoEditFormProps>(function DayInfoEditForm({
  resetKey,
  title,
  subtitle,
  summary,
  practicalNote,
  type,
  imageUrl,
  imageCompress,
  imageUpload,
  onSave,
  onCancel,
  hideFooter = false,
  hideTitle = false,
  autoFocus = true,
  className,
}, ref) {
  const t = useTranslations("HeroBanner");

  const [draftPlace,         setDraftPlace]         = useState(title);
  const [draftZone,          setDraftZone]          = useState(subtitle ?? "");
  const [draftSummary,       setDraftSummary]       = useState(summary ?? "");
  const [draftPracticalNote, setDraftPracticalNote] = useState(practicalNote ?? "");
  const [draftImageUrl,      setDraftImageUrl]      = useState(imageUrl ?? "");
  const [draftHeroType,      setDraftHeroType]      = useState<HeroBannerType | undefined>(type);

  // Re-seed drafts when resetKey changes (mirrors the original HeroBanner
  // behaviour). Done during render via a previous-value guard.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setDraftPlace(title);
    setDraftZone(subtitle ?? "");
    setDraftSummary(summary ?? "");
    setDraftPracticalNote(practicalNote ?? "");
    setDraftImageUrl(imageUrl ?? "");
    setDraftHeroType(type);
  }

  function buildData(): HeroBannerData {
    return {
      title: draftPlace,
      subtitle: draftZone,
      imageUrl: draftImageUrl,
      type: draftHeroType,
      summary: draftSummary || undefined,
      practicalNote: draftPracticalNote || undefined,
    };
  }

  useImperativeHandle(ref, () => ({ getData: buildData }));

  const gridCols = { gridTemplateColumns: `${IMG_W}px 1fr` } as const;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave?.(buildData()); }}
      onKeyDown={(e) => { if (e.key === "Escape" && onCancel) { e.preventDefault(); onCancel(); } }}
      className={cn(
        "bg-surface border border-border-strong rounded-lg px-4 pt-4 pb-4 flex flex-col gap-5",
        className,
      )}
    >
      {!hideTitle && (
        <div className="text-micro font-medium uppercase tracking-[0.08em] text-ink-soft">
          {t("hero.formTitle")}
        </div>
      )}

      {/* Single grid · image (col 1, spans the two top fields) + every input
          field in col 2 so they all share the same left edge. */}
      <div className="grid gap-x-4 gap-y-5 items-start" style={gridCols}>
        {/* Image · row-span 2 to sit beside zone + location */}
        <div className="row-span-2">
          <ImagePicker
            currentImageUrl={resolveHeroBanner(draftHeroType, draftImageUrl)}
            currentLabel={draftImageUrl ? "custom photo" : `${draftHeroType ?? "default"}`}
            thumbnailWidth={IMG_W}
            thumbnailHeight={IMG_H}
            compress={imageCompress ?? { maxWidth: 1920, maxHeight: 600, quality: 0.90 }}
            upload={imageUpload}
            onApply={(result) => {
              // Append cache-buster so the browser doesn't serve the old image
              // after an overwrite (same URL, same filename). The bust is only
              // for the live draft preview; onSave strips it before writing to DB.
              const url = result.publicUrl ? `${result.publicUrl}?t=${Date.now()}` : result.previewUrl;
              setDraftImageUrl(url);
            }}
            onReset={() => setDraftImageUrl("")}
          />
        </div>

        {/* col 2, row 1 */}
        <SoftField value={draftZone} onChange={setDraftZone} label={t("hero.zone")} placeholder={t("hero.zonePlaceholder")} maxLength={120} hideCounter labelAlwaysVisible inputProps={{ autoFocus }} />
        {/* col 2, row 2 */}
        <SoftField value={draftPlace} onChange={setDraftPlace} label={t("hero.location")} placeholder={t("hero.locationPlaceholder")} maxLength={120} hideCounter labelAlwaysVisible />

        {/* Remaining fields · empty col-1 cell keeps the shared left edge */}
        <div aria-hidden />
        <SoftField
          value={draftSummary}
          onChange={setDraftSummary}
          label={t("hero.summary")}
          placeholder={t("hero.summaryPlaceholder")}
          multiline
          rows={2}
          maxLength={280}
          labelAlwaysVisible
        />

        <div aria-hidden />
        <SoftField
          value={draftPracticalNote}
          onChange={setDraftPracticalNote}
          label={t("hero.practicalNote")}
          placeholder={t("hero.practicalNotePlaceholder")}
          maxLength={120}
          hideCounter
          labelAlwaysVisible
        />

        {/* Type · labelled chip group */}
        <div aria-hidden />
        <div className="flex flex-col gap-2">
          <span className="text-[9px] uppercase tracking-[0.08em] text-ink-faint font-medium px-0.5">
            {t("hero.type")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {HERO_TYPE_CHIPS.map((chip) => (
              <button key={chip} type="button" onClick={() => setDraftHeroType(chip)}
                className={cn(
                  "px-2.5 py-1 rounded-pill text-tiny border cursor-pointer transition-colors font-sans",
                  draftHeroType === chip
                    ? "bg-ink text-white border-ink font-medium"
                    : "bg-surface text-ink-soft border-border hover:border-border-strong",
                )}>
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hideFooter && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-micro text-ink-faint">{t("pressEnterToSave")}</span>
          <div className="flex items-center gap-2">
            {onCancel && <Button variant="text-only" iconOnly={false} onClick={onCancel}>{t("cancel")}</Button>}
            <Button type="submit" variant="solid" tone="neutral" iconOnly={false}>{t("save")}</Button>
          </div>
        </div>
      )}
    </form>
  );
});
DayInfoEditForm.displayName = "DayInfoEditForm";
