"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import {
  IconBed,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconPlus,
} from "@/components/ui/icons";
import type { CompressOptions, UploadOptions } from "@/components/ui/ImagePicker";
import {
  DayInfoEditForm,
  resolveHeroBanner,
  type HeroBannerType,
  type HeroBannerData,
} from "./DayInfoEditForm";
import {
  LodgingEditForm,
  resolveEmoji,
  type HeroBannerSubBanner,
  type HeroBannerSubBannerData,
} from "./LodgingEditForm";

/* ─────────────────────────────────────────────────────────────────
   HeroBanner · Full-bleed hero + optional sub-banner (lodging).
   The hero and lodging editors live in standalone components
   (DayInfoEditForm / LodgingEditForm); this component owns the display
   chrome (banner, sub-banner, empty state) and the open/close state of
   the two inline accordions.
───────────────────────────────────────────────────────────────── */

// Re-exported so existing importers (TripDayView, sandbox, barrel) keep working.
export type { HeroBannerType, HeroBannerData } from "./DayInfoEditForm";
export type {
  LodgingType,
  HeroBannerSubBanner,
  HeroBannerSubBannerData,
} from "./LodgingEditForm";

/* ── Props ───────────────────────────────────────────────────────── */
export type HeroBannerProps = {
  resetKey?: string | number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  summary?: string;
  practicalNote?: string;
  type?: HeroBannerType;
  imageUrl?: string;
  editMode?: boolean;
  /** Client-side WebP compression for the banner image upload. */
  imageCompress?: CompressOptions;
  /** Supabase Storage destination for the banner image upload. */
  imageUpload?: UploadOptions;
  onSave?: (data: HeroBannerData) => void;
  onPrev?: () => void;
  onNext?: () => void;
  subBanner?: HeroBannerSubBanner;
  onSaveLodging?: (data: HeroBannerSubBannerData) => void;
  onRemoveLodging?: () => void;
  onAddLodging?: () => void;
  /** Numero corrente di notti della stay (modello nuovo). Pass-through al
   *  LodgingEditForm per mostrare lo stepper. */
  lodgingNights?: number;
  /** Stay esistente → +1 notte. Inoltrato come `onExtendNight` al form. */
  onExtendLodgingNight?: () => void;
  /** Stay esistente → −1 notte (la stay si elimina se collassa a 0). */
  onReduceLodgingNight?: () => void;
  className?: string;
};

export type HeroBannerHandle = {
  openEdit: () => void;
  openLodging: () => void;
};

export const HeroBanner = forwardRef<HeroBannerHandle, HeroBannerProps>(function HeroBanner({
  resetKey,
  eyebrow,
  title,
  subtitle,
  meta,
  summary,
  practicalNote,
  type,
  imageUrl,
  editMode = false,
  imageCompress,
  imageUpload,
  onSave,
  onPrev,
  onNext,
  subBanner,
  onSaveLodging,
  onRemoveLodging,
  onAddLodging,
  lodgingNights,
  onExtendLodgingNight,
  onReduceLodgingNight,
  className,
}, ref) {
  const t = useTranslations("HeroBanner");

  const [heroOpen, setHeroOpen] = useState(false);
  const [lodgingOpen, setLodgingOpen] = useState(false);

  const hasSubBanner    = !!subBanner;
  const lodgingEditable = editMode && hasSubBanner && !!onSaveLodging;

  function openHeroEdit() { setHeroOpen(true); setLodgingOpen(false); }
  function openLodgingEdit() { setLodgingOpen(true); setHeroOpen(false); }

  useImperativeHandle(ref, () => ({
    openEdit:    () => { if (!heroOpen)    openHeroEdit(); },
    openLodging: () => { if (!lodgingOpen) openLodgingEdit(); },
  }), [heroOpen, lodgingOpen]);

  const showEmptyLodging = !hasSubBanner;
  const heroFlat = heroOpen || lodgingOpen || hasSubBanner || showEmptyLodging;

  return (
    <div className={cn("flex flex-col", className)}>

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "relative overflow-hidden bg-ink min-h-[220px] bg-cover bg-center",
          heroFlat ? "rounded-t-[var(--radius-lg)]" : "rounded-lg",
        )}
        style={{ backgroundImage: `url(${resolveHeroBanner(type, imageUrl)})` }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(13,44,61,0.45) 0%, rgba(13,44,61,0) 38%, rgba(13,44,61,0.72) 100%)" }}
        />

        {editMode && (
          <button
            onClick={openHeroEdit}
            title={t("editDay")}
            className={cn(
              "absolute top-3 right-3 z-10 h-8 rounded-pill px-3",
              "inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 text-mini font-medium",
              heroOpen
                ? "bg-orange border border-orange text-white"
                : "bg-white/20 border border-white/30 text-white hover:bg-orange hover:border-orange",
            )}
          >
            <IconPencil size={13} />
            <span>{t("editDay")}</span>
          </button>
        )}

        <div className="absolute inset-x-[18px] bottom-4 z-10 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            {(eyebrow || subtitle) && (
              <div className="text-tiny font-medium tracking-[0.08em] uppercase opacity-85 mb-1">
                {eyebrow}
                {subtitle && (
                  <>
                    {eyebrow && " · "}
                    <span className="text-orange font-semibold">{subtitle.toUpperCase()}</span>
                  </>
                )}
              </div>
            )}
            <div className="text-[26px] font-semibold leading-[1.25] mb-1 truncate">{title}</div>
            {meta && <div className="text-micro opacity-75 uppercase tracking-eyebrow">{meta}</div>}
          </div>
          {(onPrev || onNext) && (
            <div className="flex gap-1.5 shrink-0">
              {onPrev && (
                <button onClick={onPrev} title={t("prev")}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 border border-white/20 hover:bg-white/25 transition-colors cursor-pointer">
                  <IconChevronLeft size={16} />
                </button>
              )}
              {onNext && (
                <button onClick={onNext} title={t("next")}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 border border-white/20 hover:bg-white/25 transition-colors cursor-pointer">
                  <IconChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ HERO EDIT FORM ══════════════════════════════════════════ */}
      {heroOpen && (
        <DayInfoEditForm
          resetKey={resetKey}
          title={title}
          subtitle={subtitle}
          summary={summary}
          practicalNote={practicalNote}
          type={type}
          imageUrl={imageUrl}
          imageCompress={imageCompress}
          imageUpload={imageUpload}
          onSave={(data) => { onSave?.(data); setHeroOpen(false); }}
          onCancel={() => setHeroOpen(false)}
          className={cn("border-t-0 !rounded-t-none", hasSubBanner && "!rounded-b-none")}
        />
      )}

      {/* ══ LODGING EDIT FORM ═══════════════════════════════════════ */}
      {lodgingOpen && (
        <LodgingEditForm
          resetKey={resetKey}
          initial={subBanner}
          showCaret
          onSave={(data) => { onSaveLodging?.(data); setLodgingOpen(false); }}
          onCancel={() => setLodgingOpen(false)}
          onRemove={onRemoveLodging ? () => { onRemoveLodging(); setLodgingOpen(false); } : undefined}
          nights={lodgingNights}
          onExtendNight={onExtendLodgingNight}
          onReduceNight={onReduceLodgingNight}
          className="border-t-0 !rounded-none"
        />
      )}

      {/* ══ EMPTY LODGING STATE ═════════════════════════════════════ */}
      {showEmptyLodging && (
        <div
          className="rounded-b-[var(--radius-lg)] -mt-px flex items-center justify-center gap-2.5 px-4 py-2.5 border-t border-white/[0.08]"
          style={{ background: "#1a3a4f", color: "white" }}
        >
          <IconBed size={16} className="text-white/55 shrink-0" />
          <span className="text-meta text-white/70">{t("lodging.empty")}</span>
          {editMode && (
            <>
              <span aria-hidden className="text-white/30 text-meta">·</span>
              <button
                type="button"
                onClick={onAddLodging ?? openLodgingEdit}
                className="inline-flex items-center gap-1 text-mini font-medium text-white/80 hover:text-white bg-white/[0.10] hover:bg-white/[0.18] border border-white/[0.18] rounded-pill px-3 py-1 transition-colors cursor-pointer"
              >
                <IconPlus size={13} className="text-orange" />
                {t("lodging.addStay")}
              </button>
            </>
          )}
        </div>
      )}

      {/* ══ SUB-BANNER (lodging) ════════════════════════════════════ */}
      {hasSubBanner && (
        <div
          className="rounded-b-[var(--radius-lg)] -mt-px grid gap-3 items-center px-4 py-2.5 border-t border-white/[0.08]"
          style={{
            background: "#1a3a4f",
            color: "white",
            gridTemplateColumns: lodgingEditable
              ? (subBanner.href ? "30px 1fr auto auto" : "30px 1fr auto")
              : (subBanner.href ? "30px 1fr auto" : "30px 1fr"),
          }}
        >
          <div className="w-[30px] h-[30px] rounded-lg bg-white/[0.08] flex items-center justify-center text-base shrink-0">
            {resolveEmoji(subBanner.type, subBanner.emoji)}
          </div>

          <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5">
            {subBanner.label && (
              <span className="text-micro font-semibold text-white/60 uppercase tracking-[0.08em]">
                {subBanner.label}
              </span>
            )}
            <span className="text-[14px] font-medium text-white truncate">{subBanner.name}</span>
            {subBanner.detail && (
              <span className="text-mini text-white/65 truncate">· {subBanner.detail}</span>
            )}
          </div>

          {subBanner.href && (
            <a href={subBanner.href} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-tiny font-medium text-white px-3 py-1.5 rounded-pill bg-white/[0.12] border border-white/[0.18] hover:bg-white/20 transition-colors whitespace-nowrap">
              {subBanner.ctaLabel ?? t("lodging.open")}
            </a>
          )}

          {lodgingEditable && (
            <button
              onClick={openLodgingEdit}
              title={t("lodging.editTitle")}
              className={cn(
                "shrink-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-150",
                lodgingOpen
                  ? "bg-orange text-white"
                  : "bg-white/[0.12] text-white/70 hover:bg-orange hover:text-white",
              )}
            >
              <IconPencil size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
HeroBanner.displayName = "HeroBanner";
