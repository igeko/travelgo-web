"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconCheck,
  IconPencil,
  IconUpload,
  IconX,
  IconTrash,
  IconLink,
} from "@/components/ui/icons";
import { SoftField } from "@/components/ui/SoftField";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";
import { BudgetInput, type Currency } from "@/components/ui/BudgetInput";
import { Button } from "@/components/ui/Button";

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
  /** Lodging type key — drives emoji */
  type?: LodgingType;
  /** Emoji override (used when type is not set) */
  emoji?: string;
  /** Small uppercase label, e.g. "Staying at" */
  label?: string;
  /** Primary name */
  name: string;
  /** Street address or locality */
  detail?: string;
  /** Resolved place (from AddressField) */
  place?: PlaceResult | null;
  /** External booking URL */
  href?: string;
  /** CTA label. Defaults to "Apri ↗" */
  ctaLabel?: string;
  /** Budget */
  budgetAmount?: number;
  budgetCurrency?: string;
};

/* ── Save payloads ───────────────────────────────────────────────── */
export type HeroBannerData = {
  title: string;
  subtitle: string;
  imageUrl: string;
  type?: HeroBannerType;
};

export type HeroBannerSubBannerData = HeroBannerSubBanner;

/* ── Props ───────────────────────────────────────────────────────── */
export type HeroBannerProps = {
  eyebrow?: string;
  title: string;
  /** Zone/area — shown uppercase in orange after the eyebrow */
  subtitle?: string;
  /** Secondary line below the title, e.g. "August 3, 2026 · 5 activities" */
  meta?: string;
  /** Day type — drives the default background image when imageUrl is not set */
  type?: HeroBannerType;
  imageUrl?: string;
  /** When true, shows the edit pencil on the hero and the lodging sub-banner */
  editMode?: boolean;
  /** Called when the hero edit form is saved */
  onSave?: (data: HeroBannerData) => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** Optional sub-banner (lodging). Shows pencil if onSaveLodging is provided. */
  subBanner?: HeroBannerSubBanner;
  /** Called when the lodging edit form is saved */
  onSaveLodging?: (data: HeroBannerSubBannerData) => void;
  /** Called when the user removes the lodging */
  onRemoveLodging?: () => void;
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

  // Close on outside click
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
          "inline-flex items-center gap-2 bg-surface border rounded-pill px-4 py-2 text-[13px] text-ink font-sans cursor-pointer transition-colors",
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
        <div className="absolute top-[calc(100%+4px)] left-0 min-w-[200px] bg-surface border border-border rounded-[12px] p-1 shadow-[0_8px_24px_rgba(13,44,61,0.10)] z-20 flex flex-col gap-px">
          {LODGING_TYPES.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => { onChange(t.k as LodgingType); setOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-3 py-[7px] text-[13px] text-ink rounded-lg cursor-pointer font-sans transition-colors",
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
export function HeroBanner({
  eyebrow,
  title,
  subtitle,
  meta,
  type,
  imageUrl,
  editMode = false,
  onSave,
  onPrev,
  onNext,
  subBanner,
  onSaveLodging,
  onRemoveLodging,
  className,
}: HeroBannerProps) {
  /* ── Hero edit state ── */
  const [heroOpen, setHeroOpen] = useState(false);
  const [draftPlace,    setDraftPlace]    = useState(title);
  const [draftZone,     setDraftZone]     = useState(subtitle ?? "");
  const [draftImageUrl, setDraftImageUrl] = useState(imageUrl ?? "");
  const [draftHeroType, setDraftHeroType] = useState<HeroBannerType | undefined>(type);

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

  const hasSubBanner      = !!subBanner;
  const lodgingEditable   = editMode && hasSubBanner && !!onSaveLodging;

  /* ─── Hero handlers ──────────────────────────────────────────── */
  function openHeroEdit() {
    setDraftPlace(title);
    setDraftZone(subtitle ?? "");
    setDraftImageUrl(imageUrl ?? "");
    setDraftHeroType(type);
    setHeroOpen(true);
    setLodgingOpen(false);
  }

  function saveHero() {
    onSave?.({ title: draftPlace, subtitle: draftZone, imageUrl: draftImageUrl, type: draftHeroType });
    setHeroOpen(false);
  }

  /* ─── Lodging handlers ───────────────────────────────────────── */
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

  /* ─── Layout flags ───────────────────────────────────────────── */
  // Hero bottom radius: flat when either form is open OR sub-banner present
  const heroFlat = heroOpen || lodgingOpen || hasSubBanner;

  return (
    <div className={cn("flex flex-col", className)}>

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "relative overflow-hidden bg-ink min-h-[220px] bg-cover bg-center",
          heroFlat ? "rounded-t-[var(--radius-lg)]" : "rounded-[var(--radius-lg)]",
        )}
        style={{ backgroundImage: `url(${resolveHeroBanner(heroOpen ? draftHeroType : type, imageUrl)})` }}
      >
        {/* Gradient — darker at top (eyebrow) and bottom (title/meta) */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(13,44,61,0.45) 0%, rgba(13,44,61,0) 38%, rgba(13,44,61,0.72) 100%)" }}
        />

        {/* Pencil handle — pill with label, over-media style */}
        {editMode && (
          <button
            onClick={openHeroEdit}
            title="Edit place"
            className={cn(
              "absolute top-3 right-3 z-10 h-8 rounded-pill px-3",
              "inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 text-[12px] font-medium",
              heroOpen
                ? "bg-orange border border-orange text-white"
                : "bg-white/20 border border-white/30 text-white hover:bg-orange hover:border-orange",
            )}
          >
            <IconPencil size={13} />
            <span>Edit Place</span>
          </button>
        )}

        {/* Content */}
        <div className="absolute inset-x-[18px] bottom-4 z-10 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            {(eyebrow || subtitle) && (
              <div className="text-[11px] font-medium tracking-[0.08em] uppercase opacity-85 mb-1">
                {eyebrow}
                {subtitle && (
                  <>
                    {eyebrow && " · "}
                    <span className="text-orange font-semibold">{subtitle.toUpperCase()}</span>
                  </>
                )}
              </div>
            )}
            <div className="text-[26px] font-semibold leading-[1.05] mb-1 truncate">{title}</div>
            {meta && <div className="text-[12px] opacity-75">{meta}</div>}
          </div>
          {(onPrev || onNext) && (
            <div className="flex gap-1.5 shrink-0">
              {onPrev && (
                <button onClick={onPrev} title="Previous"
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 border border-white/20 hover:bg-white/25 transition-colors cursor-pointer">
                  <IconChevronLeft size={16} />
                </button>
              )}
              {onNext && (
                <button onClick={onNext} title="Next"
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
        <div className={cn(
          "bg-surface border border-border-strong border-t-0 px-4 pt-4 pb-4 flex flex-col gap-3",
          !hasSubBanner ? "rounded-b-[var(--radius-lg)]" : "",
        )}>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft mb-1">
            Edit place
          </div>

          {/* Thumbnail + fields */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "120px 1fr" }}>
            <div
              className="relative rounded-[10px] overflow-hidden bg-surface-soft bg-cover bg-center cursor-pointer group"
              style={{ height: 68, backgroundImage: `url(${resolveHeroBanner(draftHeroType, draftImageUrl)})` }}
              title="Change image"
            >
              <div className="absolute inset-0 bg-ink/55 flex flex-col items-center justify-center gap-1 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <IconUpload size={18} />
                <span>Change</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <SoftField value={draftZone} onChange={setDraftZone} label="Zone" placeholder="e.g. Monte Fuji" maxLength={120} />
              <SoftField value={draftPlace} onChange={setDraftPlace} label="Place" placeholder="e.g. Escursione al Monte Fuji" />
            </div>
          </div>

          {/* Type chips */}
          <div className="flex flex-wrap gap-1.5">
            {HERO_TYPE_CHIPS.map((t) => (
              <button key={t} type="button" onClick={() => setDraftHeroType(t)}
                className={cn(
                  "px-2.5 py-1 rounded-pill text-[11px] border cursor-pointer transition-colors font-sans",
                  draftHeroType === t
                    ? "bg-ink text-white border-ink font-medium"
                    : "bg-surface text-ink-soft border-border hover:border-border-strong",
                )}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="text-only" iconOnly={false} onClick={() => setHeroOpen(false)}>Cancel</Button>
            <Button variant="solid" tone="neutral" iconOnly={false} onClick={saveHero}>Save</Button>
          </div>
        </div>
      )}

      {/* ══ LODGING EDIT FORM (opens between hero and sub-banner) ═══ */}
      {lodgingOpen && (
        <div className="relative bg-surface border border-border-strong border-t-0 px-4 pt-4 pb-4 flex flex-col gap-3">
          {/* Arrow-down pointing at the sub-banner below */}
          <div
            aria-hidden
            className="absolute -bottom-[7px] left-[60px] w-3 h-3 bg-surface border-r border-b border-border-strong rotate-45 z-10"
          />

          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft mb-1">
            Edit lodging
          </div>

          {/* Type picker */}
          <LodgingTypePicker value={draftLodgingType} onChange={setDraftLodgingType} />

          {/* Name */}
          <SoftField
            value={draftLodgingName}
            onChange={setDraftLodgingName}
            label="Accommodation name"
            placeholder="Accommodation name"
            maxLength={80}
            hideCounter
          />

          {/* Optional: address */}
          {showLodgingAddress && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <AddressField
                  value={draftLodgingPlace}
                  onChange={setDraftLodgingPlace}
                  label="Address"
                  placeholder="Street, city"
                  showMapButton
                />
              </div>
              <button type="button" onClick={() => { setDraftLodgingPlace(null); setShowLodgingAddress(false); }}
                aria-label="Remove address"
                className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-[#fcebeb] hover:text-[#9a3015] transition-colors">
                <IconX size={14} />
              </button>
            </div>
          )}

          {/* Optional: link */}
          {showLodgingLink && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <SoftField
                  value={draftLodgingHref}
                  onChange={setDraftLodgingHref}
                  label="Booking link"
                  placeholder="Booking URL or property website"
                >
                  <SoftField.Prefix><IconLink size={14} className="text-ink-faint" /></SoftField.Prefix>
                </SoftField>
              </div>
              <button type="button" onClick={() => { setDraftLodgingHref(""); setShowLodgingLink(false); }}
                aria-label="Remove link"
                className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-[#fcebeb] hover:text-[#9a3015] transition-colors">
                <IconX size={14} />
              </button>
            </div>
          )}

          {/* Optional: budget */}
          {showLodgingBudget && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <BudgetInput
                  amount={draftLodgingBudget}
                  onAmountChange={setDraftLodgingBudget}
                  currency={draftLodgingCurrency}
                  onCurrencyChange={setDraftLodgingCurrency}
                  currencies={DEFAULT_CURRENCIES}
                  label="Budget / night"
                />
              </div>
              <button type="button" onClick={() => { setDraftLodgingBudget(undefined); setShowLodgingBudget(false); }}
                aria-label="Remove budget"
                className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-[#fcebeb] hover:text-[#9a3015] transition-colors">
                <IconX size={14} />
              </button>
            </div>
          )}

          {/* "+ Add …" links */}
          {(!showLodgingAddress || !showLodgingLink || !showLodgingBudget) && (
            <div className="flex flex-wrap gap-3.5 items-center pt-1">
              {!showLodgingAddress && (
                <button type="button" onClick={() => setShowLodgingAddress(true)}
                  className="text-[12px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
                  + Add address
                </button>
              )}
              {!showLodgingLink && (
                <button type="button" onClick={() => setShowLodgingLink(true)}
                  className="text-[12px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
                  + Add link
                </button>
              )}
              {!showLodgingBudget && (
                <button type="button" onClick={() => setShowLodgingBudget(true)}
                  className="text-[12px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
                  + Add budget
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {onRemoveLodging ? (
              <Button variant="ghost" tone="danger" iconOnly={false} onClick={() => { onRemoveLodging(); setLodgingOpen(false); }}>
                <IconTrash />
                Remove lodging
              </Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <Button variant="text-only" iconOnly={false} onClick={() => setLodgingOpen(false)}>Cancel</Button>
              <Button variant="solid" tone="neutral" iconOnly={false} onClick={saveLodging}>Save</Button>
            </div>
          </div>
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
          {/* Emoji */}
          <div className="w-[30px] h-[30px] rounded-lg bg-white/[0.08] flex items-center justify-center text-base shrink-0">
            {resolveEmoji(subBanner.type, subBanner.emoji)}
          </div>

          {/* Body */}
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5">
            {subBanner.label && (
              <span className="text-[10px] font-semibold text-white/60 uppercase tracking-[0.08em]">
                {subBanner.label}
              </span>
            )}
            <span className="text-[14px] font-medium text-white truncate">{subBanner.name}</span>
            {subBanner.detail && (
              <span className="text-[12px] text-white/65 truncate">· {subBanner.detail}</span>
            )}
          </div>

          {/* CTA */}
          {subBanner.href && (
            <a href={subBanner.href} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-[11px] font-medium text-white px-3 py-1.5 rounded-pill bg-white/[0.12] border border-white/[0.18] hover:bg-white/20 transition-colors whitespace-nowrap">
              {subBanner.ctaLabel ?? "Apri ↗"}
            </a>
          )}

          {/* Pencil handle on sub-banner */}
          {lodgingEditable && (
            <button
              onClick={openLodgingEdit}
              title="Edit lodging"
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
}
