"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import {
  IconChevronDown,
  IconCheck,
  IconLink,
  IconMinus,
  IconPlus,
  IconTrash,
  IconX,
} from "@/components/ui/icons";
import { SoftField } from "@/components/ui/SoftField";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";
import { BudgetInput, type Currency } from "@/components/ui/BudgetInput";
import { Button } from "@/components/ui/Button";

/* ─────────────────────────────────────────────────────────────────
   LodgingEditForm · the lodging (sub-banner) editor.
   Extracted from HeroBanner so it can be reused standalone (sandbox,
   DayEditForm) and embedded as the lodging accordion inside HeroBanner.
───────────────────────────────────────────────────────────────── */

export const LODGING_TYPES = [
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

export function resolveEmoji(type?: LodgingType, fallback?: string): string {
  if (type) return LODGING_TYPES.find((t) => t.k === type)?.emoji ?? "📍";
  return fallback ?? "📍";
}

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

export type HeroBannerSubBannerData = HeroBannerSubBanner;

/* ─────────────────────────────────────────────────────────────────
   LodgingTypePicker — pill + dropdown
───────────────────────────────────────────────────────────────── */
export function LodgingTypePicker({
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

/* ── Imperative handle ───────────────────────────────────────────── */
export type LodgingEditFormHandle = {
  /** Read the current draft as a HeroBannerSubBannerData payload. */
  getData: () => HeroBannerSubBannerData;
};

export type LodgingEditFormProps = {
  /** Change this to re-seed the drafts from `initial`. */
  resetKey?: string | number;
  initial?: HeroBannerSubBanner | null;
  currencies?: Currency[];
  /** Called when the standalone footer's Save is pressed. */
  onSave?: (data: HeroBannerSubBannerData) => void;
  /** Called when the standalone footer's Cancel is pressed. */
  onCancel?: () => void;
  /** Called when the Remove button is pressed (only rendered when provided). */
  onRemove?: () => void;
  /**
   * Numero corrente di notti della stay. Quando > 0, il form mostra la
   * riga "Notti N · +/-" allineata alla logica della Timeline V2: l'utente
   * estende o riduce la stay senza chiudere l'editor. La mutation passa
   * per `onExtendNight` / `onReduceNight`, NON per `onSave` (è un'azione
   * indipendente con feedback immediato).
   */
  nights?: number;
  onExtendNight?: () => void;
  onReduceNight?: () => void;
  /** Hide the built-in footer (host provides its own + reads via ref). */
  hideFooter?: boolean;
  /** Hide the small "form title" eyebrow (host provides its own header). */
  hideTitle?: boolean;
  /** Show the upward caret used when attached below the hero (HeroBanner). */
  showCaret?: boolean;
  autoFocus?: boolean;
  className?: string;
};

export const LodgingEditForm = forwardRef<LodgingEditFormHandle, LodgingEditFormProps>(function LodgingEditForm({
  resetKey,
  initial,
  currencies = DEFAULT_CURRENCIES,
  onSave,
  onCancel,
  onRemove,
  nights,
  onExtendNight,
  onReduceNight,
  hideFooter = false,
  hideTitle = false,
  showCaret = false,
  autoFocus = true,
  className,
}, ref) {
  const t = useTranslations("HeroBanner");

  const [draftType,     setDraftType]     = useState<LodgingType>(initial?.type ?? "Hotel");
  const [draftName,     setDraftName]     = useState(initial?.name ?? "");
  const [draftPlace,    setDraftPlace]    = useState<PlaceResult | null>(initial?.place ?? null);
  const [draftHref,     setDraftHref]     = useState(initial?.href ?? "");
  const [draftBudget,   setDraftBudget]   = useState<number | undefined>(initial?.budgetAmount);
  const [draftCurrency, setDraftCurrency] = useState(initial?.budgetCurrency ?? currencies[0]?.code ?? "EUR");

  const [showAddress, setShowAddress] = useState(!!initial?.place || !!initial?.detail);
  const [showLink,    setShowLink]    = useState(!!initial?.href);
  const [showBudget,  setShowBudget]  = useState(!!initial?.budgetAmount);

  // Re-seed drafts when resetKey changes.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setDraftType(initial?.type ?? "Hotel");
    setDraftName(initial?.name ?? "");
    setDraftPlace(initial?.place ?? null);
    setDraftHref(initial?.href ?? "");
    setDraftBudget(initial?.budgetAmount);
    setDraftCurrency(initial?.budgetCurrency ?? currencies[0]?.code ?? "EUR");
    setShowAddress(!!initial?.place || !!initial?.detail);
    setShowLink(!!initial?.href);
    setShowBudget(!!initial?.budgetAmount);
  }

  function buildData(): HeroBannerSubBannerData {
    return {
      type: draftType,
      emoji: resolveEmoji(draftType),
      label: initial?.label,
      name: draftName,
      place: showAddress ? draftPlace : null,
      detail: showAddress ? draftPlace?.formatted : undefined,
      href: showLink ? draftHref : undefined,
      budgetAmount: showBudget ? draftBudget : undefined,
      budgetCurrency: draftCurrency,
    };
  }

  useImperativeHandle(ref, () => ({ getData: buildData }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave?.(buildData()); }}
      onKeyDown={(e) => { if (e.key === "Escape" && onCancel) { e.preventDefault(); onCancel(); } }}
      className={cn(
        "relative bg-surface border border-border-strong rounded-lg px-4 pt-4 pb-4 flex flex-col gap-3",
        className,
      )}
    >
      {showCaret && (
        <div
          aria-hidden
          className="absolute -bottom-[7px] left-[60px] w-3 h-3 bg-surface border-r border-b border-border-strong rotate-45 z-10"
        />
      )}

      {!hideTitle && (
        <div className="text-micro font-medium uppercase tracking-[0.08em] text-ink-soft mb-1">
          {t("lodging.formTitle")}
        </div>
      )}

      <LodgingTypePicker value={draftType} onChange={setDraftType} />

      {/* Nights stepper — visibile solo per stay esistenti (nights > 0).
          La mutation è indipendente dal Save (azione immediata, optimistic
          gestito dall'host). Stesso pattern della Timeline V2 lodging row. */}
      {typeof nights === "number" && nights > 0 && (onExtendNight || onReduceNight) ? (
        <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2">
          <span className="text-mini text-ink">
            <span className="text-[18px] font-semibold tabular-nums">{nights}</span>{" "}
            {nights === 1 ? "notte" : "notti"}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onReduceNight?.()}
              disabled={!onReduceNight}
              aria-label="Una notte in meno"
              className="flex size-7 items-center justify-center rounded-full border border-border text-ink-soft transition-colors hover:bg-surface-soft disabled:opacity-30"
            >
              <IconMinus size={13} />
            </button>
            <button
              type="button"
              onClick={() => onExtendNight?.()}
              disabled={!onExtendNight}
              aria-label="Una notte in più"
              className="flex size-7 items-center justify-center rounded-full border border-border text-ink-soft transition-colors hover:bg-surface-soft disabled:opacity-30"
            >
              <IconPlus size={13} />
            </button>
          </div>
        </div>
      ) : null}

      <SoftField
        value={draftName}
        onChange={setDraftName}
        label={t("lodging.name")}
        placeholder={t("lodging.namePlaceholder")}
        maxLength={80}
        hideCounter
        inputProps={{ autoFocus }}
      />

      {showAddress && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <AddressField
              value={draftPlace}
              onChange={setDraftPlace}
              label={t("lodging.address")}
              placeholder={t("lodging.addressPlaceholder")}
              showMapButton
            />
          </div>
          <button type="button" onClick={() => { setDraftPlace(null); setShowAddress(false); }}
            aria-label={t("lodging.removeAddress")}
            className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-danger-bg hover:text-danger-fg transition-colors">
            <IconX size={14} />
          </button>
        </div>
      )}

      {showLink && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <SoftField
              value={draftHref}
              onChange={setDraftHref}
              label={t("lodging.bookingLink")}
              placeholder={t("lodging.bookingLinkPlaceholder")}
            >
              <SoftField.Prefix><IconLink size={14} className="text-ink-faint" /></SoftField.Prefix>
            </SoftField>
          </div>
          <button type="button" onClick={() => { setDraftHref(""); setShowLink(false); }}
            aria-label={t("lodging.removeLink")}
            className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-danger-bg hover:text-danger-fg transition-colors">
            <IconX size={14} />
          </button>
        </div>
      )}

      {showBudget && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <BudgetInput
              amount={draftBudget}
              onAmountChange={setDraftBudget}
              currency={draftCurrency}
              onCurrencyChange={setDraftCurrency}
              currencies={currencies}
              label={t("lodging.budgetPerNight")}
            />
          </div>
          <button type="button" onClick={() => { setDraftBudget(undefined); setShowBudget(false); }}
            aria-label={t("lodging.removeBudget")}
            className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-danger-bg hover:text-danger-fg transition-colors">
            <IconX size={14} />
          </button>
        </div>
      )}

      {(!showAddress || !showLink || !showBudget) && (
        <div className="flex flex-wrap gap-3.5 items-center pt-1">
          {!showAddress && (
            <button type="button" onClick={() => setShowAddress(true)}
              className="text-mini text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
              {t("lodging.addAddress")}
            </button>
          )}
          {!showLink && (
            <button type="button" onClick={() => setShowLink(true)}
              className="text-mini text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
              {t("lodging.addLink")}
            </button>
          )}
          {!showBudget && (
            <button type="button" onClick={() => setShowBudget(true)}
              className="text-mini text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
              {t("lodging.addBudget")}
            </button>
          )}
        </div>
      )}

      {!hideFooter && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {onRemove ? (
            <Button variant="ghost" tone="danger" iconOnly={false} onClick={onRemove}>
              <IconTrash />
              {t("lodging.remove")}
            </Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <span className="text-micro text-ink-faint">{t("pressEnterToSave")}</span>
            {onCancel && <Button variant="text-only" iconOnly={false} onClick={onCancel}>{t("cancel")}</Button>}
            <Button type="submit" variant="solid" tone="neutral" iconOnly={false}>{t("save")}</Button>
          </div>
        </div>
      )}
    </form>
  );
});
LodgingEditForm.displayName = "LodgingEditForm";
