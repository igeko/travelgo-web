"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import {
  IconBed,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconCheck,
  IconPencil,
  IconPlus,
  IconX,
  IconTrash,
  IconLink,
} from "@/components/ui/icons";
import { SoftField } from "@/components/ui/SoftField";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";
import { BudgetInput, type Currency } from "@/components/ui/BudgetInput";
import { Button } from "@/components/ui/Button";
import { ImagePicker, type CompressOptions, type UploadOptions } from "@/components/ui/ImagePicker";

/* ─────────────────────────────────────────────────────────────────
   HeroBanner · Full-bleed hero + optional sub-banner (lodging).
   Both sections are independently editable via inline accordions.
───────────────────────────────────────────────────────────────── */

/* ── Hero type chips ─────────────────────────────────────────────── */
const HERO_TYPE_CHIPS = ["City", "Nature", "Roadtrip", "Beach", "Village", "Rest"] as const;
export type HeroBannerType = (typeof HERO_TYPE_CHIPS)[number];

const DEFAULT_BANNER = "/media/day-default-banner.png";

/** Maps a HeroBannerType to its default background image. Falls back to the generic default. */
const HERO_TYPE_BANNERS: Record<HeroBannerType, string> = {
  City:     "/media/day-banner-city.png",
  Nature:   "/media/day-banner-nature.png",
  Roadtrip: "/media/day-banner-roadtrip.png",
  Beach:    "/media/day-banner-beach.png",
  Village:  "/media/day-banner-village.png",
  Rest:     DEFAULT_BANNER,
};

function resolveHeroBanner(type?: HeroBannerType, imageUrl?: string): string {
  if (imageUrl) return imageUrl;
  if (type) return HERO_TYPE_BANNERS[type];
  return DEFAULT_BANNER;
}

/* ── Lodging types ───────────────────────────────────────────────── */
const LODGING_TYPES = [
  { k: "Hotel",      emoji: "🏨" },
  { k: "B&B",        emoji: "🛏" },
  { k: "Apartment",  emoji: "🏡" },
  { k: "Hostel",     emoji: "🏠" },
  { k: "Campground", emoji: "⛺" },
  { k: "Ryokan",     emoji: "🏯" },
  { k: "Other",      emoji: "📍" },
] as const;
export type LodgingType = (typeof LODGING_TYPES)[number]["k"];

const DEFAULT_CURRENCIES: Currency[] = [
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
  { code: "USD", symbol: "$" },
];

/* ── Sub-banner data ─────────────────────────────────────────────── */
export type HeroBannerSubBanner = {
  type?: LodgingType;
  emoji?: string;
  label?: string;
  name: string;
  detail?: string;
  place?: PlaceResult | null;
  href?: string;
  ctaLabel?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
};

/* ── Save payloads ───────────────────────────────────────────────── */
export type HeroBannerData = {
  title: string;
  subtitle: string;
  imageUrl: string;
  type?: HeroBannerType;
  summary?: string;
  practicalNote?: string;
};

export type HeroBannerSubBannerData = HeroBannerSubBanner;

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
  className?: string;
};

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
function resolveEmoji(type?: LodgingType, fallback?: string): string {
  if (type) return LODGING_TYPES.find((t) => t.k === type)?.emoji ?? "📍";
  return fallback ?? "📍";
}

/* ─────────────────────────────────────────────────────────────────
   LodgingTypePicker — pill + dropdown
───────────────────────────────────────────────────────────────── */
function LodgingTypePicker({
  value,
  onChange,
}: {
  value: LodgingType;
  onChange: (v: LodgingType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = LODGING_TYPES.find((t) => t.k === value) ?? LODGING_TYPES[0];

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 bg-surface border rounded-pill px-4 py-2 text-meta text-ink font-sans cursor-pointer transition-colors",
          open ? "border-orange" : "border-border hover:border-border-strong",
        )}
      >
        <span className="text-[15px] leading-none">{cur.emoji}</span>
        <span className="font-medium">{cur.k}</span>
        <IconChevronDown
          size={14}
          className={cn("text-ink-faint transition-transform duration-150", open && "rotate-180 text-orange")}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 min-w-[200px] bg-surface border border-border rounded-md p-1 shadow-[0_8px_24px_rgba(13,44,61,0.10)] z-20 flex flex-col gap-px">
          {LODGING_TYPES.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => { onChange(t.k as LodgingType); setOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-3 py-[7px] text-meta text-ink rounded-lg cursor-pointer font-sans transition-colors",
                t.k === value ? "bg-surface-warm" : "hover:bg-surface-soft",
              )}
            >
              <span className="text-[15px] leading-none">{t.emoji}</span>
              <span>{t.k}</span>
              {t.k === value && <IconCheck size={14} className="ml-auto text-orange" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HeroBanner
───────────────────────────────────────────────────────────────── */
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
  className,
}, ref) {
  const t = useTranslations("HeroBanner");

  /* ── Hero edit state ── */
  const [heroOpen, setHeroOpen] = useState(false);
  const [draftPlace,         setDraftPlace]         = useState(title);
  const [draftZone,          setDraftZone]          = useState(subtitle ?? "");
  const [draftSummary,       setDraftSummary]       = useState(summary ?? "");
  const [draftPracticalNote, setDraftPracticalNote] = useState(practicalNote ?? "");
  const [draftImageUrl,      setDraftImageUrl]      = useState(imageUrl ?? "");
  const [draftHeroType,      setDraftHeroType]      = useState<HeroBannerType | undefined>(type);

  useEffect(() => {
    setDraftPlace(title);
    setDraftZone(subtitle ?? "");
    setDraftSummary(summary ?? "");
    setDraftPracticalNote(practicalNote ?? "");
    setDraftImageUrl(imageUrl ?? "");
    setDraftHeroType(type);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Lodging edit state ── */
  const [lodgingOpen, setLodgingOpen] = useState(false);
  const [draftLodgingType,     setDraftLodgingType]     = useState<LodgingType>(subBanner?.type ?? "Hotel");
  const [draftLodgingName,     setDraftLodgingName]     = useState(subBanner?.name ?? "");
  const [draftLodgingPlace,    setDraftLodgingPlace]    = useState<PlaceResult | null>(subBanner?.place ?? null);
  const [draftLodgingHref,     setDraftLodgingHref]     = useState(subBanner?.href ?? "");
  const [draftLodgingBudget,   setDraftLodgingBudget]   = useState<number | undefined>(subBanner?.budgetAmount);
  const [draftLodgingCurrency, setDraftLodgingCurrency] = useState(subBanner?.budgetCurrency ?? "EUR");

  const [showLodgingAddress, setShowLodgingAddress] = useState(!!subBanner?.place || !!subBanner?.detail);
  const [showLodgingLink,    setShowLodgingLink]    = useState(!!subBanner?.href);
  const [showLodgingBudget,  setShowLodgingBudget]  = useState(!!subBanner?.budgetAmount);

  const hasSubBanner    = !!subBanner;
  const lodgingEditable = editMode && hasSubBanner && !!onSaveLodging;

  /* ─── Hero handlers ── */
  function openHeroEdit() {
    setDraftPlace(title);
    setDraftZone(subtitle ?? "");
    setDraftSummary(summary ?? "");
    setDraftPracticalNote(practicalNote ?? "");
    setDraftImageUrl(imageUrl ?? "");
    setDraftHeroType(type);
    setHeroOpen(true);
    setLodgingOpen(false);
  }

  function saveHero() {
    onSave?.({
      title: draftPlace,
      subtitle: draftZone,
      imageUrl: draftImageUrl,
      type: draftHeroType,
      summary: draftSummary || undefined,
      practicalNote: draftPracticalNote || undefined,
    });
    setHeroOpen(false);
  }

  /* ─── Lodging handlers ── */
  function openLodgingEdit() {
    setDraftLodgingType(subBanner?.type ?? "Hotel");
    setDraftLodgingName(subBanner?.name ?? "");
    setDraftLodgingPlace(subBanner?.place ?? null);
    setDraftLodgingHref(subBanner?.href ?? "");
    setDraftLodgingBudget(subBanner?.budgetAmount);
    setDraftLodgingCurrency(subBanner?.budgetCurrency ?? "EUR");
    setShowLodgingAddress(!!subBanner?.place || !!subBanner?.detail);
    setShowLodgingLink(!!subBanner?.href);
    setShowLodgingBudget(!!subBanner?.budgetAmount);
    setLodgingOpen(true);
    setHeroOpen(false);
  }

  function saveLodging() {
    onSaveLodging?.({
      type: draftLodgingType,
      emoji: resolveEmoji(draftLodgingType),
      label: subBanner?.label,
      name: draftLodgingName,
      place: showLodgingAddress ? draftLodgingPlace : null,
      detail: showLodgingAddress ? draftLodgingPlace?.formatted : undefined,
      href: showLodgingLink ? draftLodgingHref : undefined,
      budgetAmount: showLodgingBudget ? draftLodgingBudget : undefined,
      budgetCurrency: draftLodgingCurrency,
    });
    setLodgingOpen(false);
  }

  /* ─── Imperative handle ── */
  useImperativeHandle(ref, () => ({
    openEdit:    () => { if (!heroOpen)    openHeroEdit(); },
    openLodging: () => { if (!lodgingOpen) openLodgingEdit(); },
  }), [heroOpen, lodgingOpen]);

  /* ─── Layout flags ── */
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
        style={{ backgroundImage: `url(${resolveHeroBanner(heroOpen ? draftHeroType : type, heroOpen ? draftImageUrl : imageUrl)})` }}
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
        <form
          onSubmit={(e) => { e.preventDefault(); saveHero(); }}
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setHeroOpen(false); } }}
          className={cn(
            "bg-surface border border-border-strong border-t-0 px-4 pt-4 pb-4 flex flex-col gap-3",
            !hasSubBanner ? "rounded-b-[var(--radius-lg)]" : "",
          )}
        >
          <div className="text-micro font-medium uppercase tracking-[0.08em] text-ink-soft mb-1">
            {t("hero.formTitle")}
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "120px 1fr" }}>
            <ImagePicker
              currentImageUrl={resolveHeroBanner(draftHeroType, draftImageUrl)}
              currentLabel={draftImageUrl ? "custom photo" : `${draftHeroType ?? "default"}`}
              thumbnailWidth={120}
              thumbnailHeight={68}
              compress={imageCompress ?? { maxWidth: 1920, maxHeight: 600, quality: 0.90 }}
              upload={imageUpload}
              onApply={(result) => {
                // Append cache-buster so the browser doesn't serve the old image
                // after an overwrite (same URL, same filename). The bust is only
                // for the live draft preview; onSave strips it before writing to DB.
                const url = result.publicUrl
                  ? `${result.publicUrl}?t=${Date.now()}`
                  : result.previewUrl;
                setDraftImageUrl(url);
              }}
              onReset={() => setDraftImageUrl("")}
            />
            <div className="flex flex-col gap-2">
              <SoftField value={draftZone} onChange={setDraftZone} label={t("hero.zone")} placeholder={t("hero.zonePlaceholder")} maxLength={120} hideCounter inputProps={{ autoFocus: true }} />
              <SoftField value={draftPlace} onChange={setDraftPlace} label={t("hero.location")} placeholder={t("hero.locationPlaceholder")} maxLength={120} hideCounter />
            </div>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: "120px 1fr" }}>
            <div />
            <div className="flex flex-col gap-2">
              <SoftField
                value={draftSummary}
                onChange={setDraftSummary}
                label={t("hero.summary")}
                placeholder={t("hero.summaryPlaceholder")}
                multiline
                rows={2}
                maxLength={280}
              />
              <SoftField
                value={draftPracticalNote}
                onChange={setDraftPracticalNote}
                label={t("hero.practicalNote")}
                placeholder={t("hero.practicalNotePlaceholder")}
                maxLength={120}
              />
            </div>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: "120px 1fr" }}>
            <div />
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

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-micro text-ink-faint">{t("pressEnterToSave")}</span>
            <div className="flex items-center gap-2">
              <Button variant="text-only" iconOnly={false} onClick={() => setHeroOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" variant="solid" tone="neutral" iconOnly={false}>{t("save")}</Button>
            </div>
          </div>
        </form>
      )}

      {/* ══ LODGING EDIT FORM ═══════════════════════════════════════ */}
      {lodgingOpen && (
        <form
          onSubmit={(e) => { e.preventDefault(); saveLodging(); }}
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setLodgingOpen(false); } }}
          className="relative bg-surface border border-border-strong border-t-0 px-4 pt-4 pb-4 flex flex-col gap-3"
        >
          <div
            aria-hidden
            className="absolute -bottom-[7px] left-[60px] w-3 h-3 bg-surface border-r border-b border-border-strong rotate-45 z-10"
          />

          <div className="text-micro font-medium uppercase tracking-[0.08em] text-ink-soft mb-1">
            {t("lodging.formTitle")}
          </div>

          <LodgingTypePicker value={draftLodgingType} onChange={setDraftLodgingType} />

          <SoftField
            value={draftLodgingName}
            onChange={setDraftLodgingName}
            label={t("lodging.name")}
            placeholder={t("lodging.namePlaceholder")}
            maxLength={80}
            hideCounter
            inputProps={{ autoFocus: true }}
          />

          {showLodgingAddress && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <AddressField
                  value={draftLodgingPlace}
                  onChange={setDraftLodgingPlace}
                  label={t("lodging.address")}
                  placeholder={t("lodging.addressPlaceholder")}
                  showMapButton
                />
              </div>
              <button type="button" onClick={() => { setDraftLodgingPlace(null); setShowLodgingAddress(false); }}
                aria-label={t("lodging.removeAddress")}
                className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-danger-bg hover:text-danger-fg transition-colors">
                <IconX size={14} />
              </button>
            </div>
          )}

          {showLodgingLink && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <SoftField
                  value={draftLodgingHref}
                  onChange={setDraftLodgingHref}
                  label={t("lodging.bookingLink")}
                  placeholder={t("lodging.bookingLinkPlaceholder")}
                >
                  <SoftField.Prefix><IconLink size={14} className="text-ink-faint" /></SoftField.Prefix>
                </SoftField>
              </div>
              <button type="button" onClick={() => { setDraftLodgingHref(""); setShowLodgingLink(false); }}
                aria-label={t("lodging.removeLink")}
                className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-danger-bg hover:text-danger-fg transition-colors">
                <IconX size={14} />
              </button>
            </div>
          )}

          {showLodgingBudget && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <BudgetInput
                  amount={draftLodgingBudget}
                  onAmountChange={setDraftLodgingBudget}
                  currency={draftLodgingCurrency}
                  onCurrencyChange={setDraftLodgingCurrency}
                  currencies={DEFAULT_CURRENCIES}
                  label={t("lodging.budgetPerNight")}
                />
              </div>
              <button type="button" onClick={() => { setDraftLodgingBudget(undefined); setShowLodgingBudget(false); }}
                aria-label={t("lodging.removeBudget")}
                className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-danger-bg hover:text-danger-fg transition-colors">
                <IconX size={14} />
              </button>
            </div>
          )}

          {(!showLodgingAddress || !showLodgingLink || !showLodgingBudget) && (
            <div className="flex flex-wrap gap-3.5 items-center pt-1">
              {!showLodgingAddress && (
                <button type="button" onClick={() => setShowLodgingAddress(true)}
                  className="text-mini text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
                  {t("lodging.addAddress")}
                </button>
              )}
              {!showLodgingLink && (
                <button type="button" onClick={() => setShowLodgingLink(true)}
                  className="text-mini text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
                  {t("lodging.addLink")}
                </button>
              )}
              {!showLodgingBudget && (
                <button type="button" onClick={() => setShowLodgingBudget(true)}
                  className="text-mini text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
                  {t("lodging.addBudget")}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            {onRemoveLodging ? (
              <Button variant="ghost" tone="danger" iconOnly={false} onClick={() => { onRemoveLodging(); setLodgingOpen(false); }}>
                <IconTrash />
                {t("lodging.remove")}
              </Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <span className="text-micro text-ink-faint">{t("pressEnterToSave")}</span>
              <Button variant="text-only" iconOnly={false} onClick={() => setLodgingOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" variant="solid" tone="neutral" iconOnly={false}>{t("save")}</Button>
            </div>
          </div>
        </form>
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
