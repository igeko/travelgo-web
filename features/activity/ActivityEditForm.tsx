"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SoftField } from "@/components/ui/SoftField";
import { CyclePill, type CycleOption } from "@/components/ui/CyclePill";
import { PeriodBar, DEFAULT_PERIODS, type Period } from "@/components/ui/PeriodBar";
import { BudgetInput, type Currency } from "@/components/ui/BudgetInput";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";
import { ImagePicker } from "@/components/ui/ImagePicker";
import { IconMessage, IconSparkles, IconTrash, IconX } from "@/components/ui/icons";
import type { ActivityStatus } from "@/components/ui/StatusBadge";
import { useTripGo } from "@/features/go/TripGoContext";
import { api } from "@/lib/client";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */

export type ActivityData = {
  title: string;
  description: string;
  status: ActivityStatus | null;
  /** Period id: "morning" | "afternoon" | "evening" | "night" */
  period: string;
  /** Hour 0–23, undefined = no specific time */
  hour: number | undefined;
  /** Minute (0,5,10,…,55), undefined = no specific time */
  minute: number | undefined;
  /** Address — full PlaceResult if resolved via Google, null if none */
  place: PlaceResult | null;
  /** Budget amount */
  budgetAmount: number | undefined;
  /** Budget currency code */
  budgetCurrency: string;
  /** Cached place enrichment — persisted to DB and restored on next open */
  enrichedPlace?: PlaceEnriched | null;
  /** Hero image URL for the activity card thumbnail */
  heroImage?: string | null;
};

export type ActivityEditFormProps = {
  /** Initial values. If null, the form starts empty (new activity). */
  initialData?: Partial<ActivityData>;
  /** True when editing an existing activity. Shows the Delete button. */
  isNew?: boolean;
  /** Available periods (defaults to morning/afternoon/evening/night) */
  periods?: Period[];
  /** Currencies for BudgetInput */
  currencies?: Currency[];
  /** Called with the full ActivityData when the user presses Save */
  onSave: (data: ActivityData) => void;
  /** Called when the user presses Cancel */
  onCancel: () => void;
  /** Called when the user presses Delete (only rendered when isNew=false) */
  onDelete?: () => void;
  /** Called when the user clicks "Ask Go" — passes title and optional activityId */
  onAskGo?: (title: string, activityId?: string) => void;
  /**
   * Activity ID — when provided (edit mode), the ImagePicker is shown and
   * uploads to trips/{tripId}/activities/{activityId}/hero.webp.
   */
  activityId?: string;
  /** Trip ID — required alongside activityId for the storage path. */
  tripId?: string;
  className?: string;
};

/* ─────────────────────────────────────────────────────────────────
   Place enrichment types (mirrors /api/places/photo-search)
───────────────────────────────────────────────────────────────── */

type PlaceEnriched = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  weekdayText?: string[];
  website?: string;
  types?: string[];
  editorialSummary?: string;
  photoRefs: string[];
};

/* ─────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────── */

// STATUS_OPTIONS is defined inside the component to use translations

const DEFAULT_CURRENCIES: Currency[] = [
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
  { code: "USD", symbol: "$" },
];

const DEFAULT_THUMB = "/media/day-default-banner.png";
/** Width of the left image column — must match ImagePicker thumbnailWidth */
const IMG_COL_W = 120;
const IMG_COL_H = 93; // ~4:3 ratio

/* ─────────────────────────────────────────────────────────────────
   ActivityEditForm
───────────────────────────────────────────────────────────────── */

export function ActivityEditForm({
  initialData,
  isNew = true,
  periods = DEFAULT_PERIODS,
  currencies = DEFAULT_CURRENCIES,
  onSave,
  onCancel,
  onDelete,
  onAskGo,
  activityId,
  tripId,
  className,
}: ActivityEditFormProps) {
  const t = useTranslations("ActivityForm");

  const STATUS_OPTIONS: CycleOption<ActivityStatus | null>[] = [
    { value: null,     label: t("status"),       dotColor: "var(--color-ink-faint)" },
    { value: "todo",   label: t("statusTodo"),   dotColor: "#e24b4a" },
    { value: "booked", label: t("statusBooked"), dotColor: "#ef9f27" },
    { value: "paid",   label: t("statusPaid"),   dotColor: "#97c459" },
  ];

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [status, setStatus] = useState<ActivityStatus | null>(initialData?.status ?? null);
  const [period, setPeriod] = useState(initialData?.period ?? periods[0]?.id ?? "morning");
  const [hour, setHour] = useState<number | undefined>(initialData?.hour);
  const [minute, setMinute] = useState<number | undefined>(initialData?.minute);
  const [place, setPlace] = useState<PlaceResult | null>(initialData?.place ?? null);
  const [budgetAmount, setBudgetAmount] = useState<number | undefined>(initialData?.budgetAmount);
  const [budgetCurrency, setBudgetCurrency] = useState(initialData?.budgetCurrency ?? currencies[0]?.code ?? "EUR");

  const [showAddress, setShowAddress] = useState(!!initialData?.place);
  const [showBudget, setShowBudget] = useState(
    initialData?.budgetAmount !== undefined && initialData.budgetAmount > 0
  );
  const [heroImage, setHeroImage] = useState<string>(initialData?.heroImage ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ── Place enrichment state ── */
  const [enriched, setEnriched] = useState<PlaceEnriched | null>(
    (initialData?.enrichedPlace as PlaceEnriched | null | undefined) ?? null
  );
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [dismissedTitle, setDismissedTitle] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);
  /** Tracks the last title we searched for — avoids re-fetching on repeated blurs */
  const lastSearchedTitle = useRef<string | null>(
    initialData?.enrichedPlace ? (initialData.title ?? null) : null
  );

  /* ── Register this form as the active edit target in Go context ── */
  const { registerActiveEdit, unregisterActiveEdit } = useTripGo();
  const effectiveEditId = activityId ?? (isNew ? "new" : undefined);
  useEffect(() => {
    if (!effectiveEditId) return;
    registerActiveEdit(effectiveEditId, ({ title: t, description: d }) => {
      if (t) setTitle(t);
      if (d) setDescription(d);
    });
    return () => unregisterActiveEdit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEditId]);

  /* ── AI describe state ── */
  const [descLoading, setDescLoading] = useState(false);

  /* ── Photo import from enrichment panel ── */
  const [photoImportLoading, setPhotoImportLoading] = useState(false);

  async function handleImportPhoto() {
    if (!activityId || !tripId || !enriched?.photoRefs[0] || photoImportLoading) return;
    setPhotoImportLoading(true);
    try {
      const data = await api.media.importUrl({
        photoRef: enriched.photoRefs[0],
        bucket: "trip-media",
        storagePath: `trips/${tripId}/activities/${activityId}/hero.webp`,
        tripId,
      });
      setHeroImage(`${data.publicUrl}?t=${Date.now()}`);
    } catch {
      // silent fail — user can upload manually via ImagePicker
    } finally {
      setPhotoImportLoading(false);
    }
  }

  /* ── Photo-search triggered on title blur ── */
  async function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed.length < 3 || trimmed === lastSearchedTitle.current || trimmed === dismissedTitle) return;

    lastSearchedTitle.current = trimmed;
    setEnrichLoading(true);
    try {
      setEnriched(await api.places.photoSearch<PlaceEnriched>(trimmed));
    } catch {
      setEnriched(null);
    } finally {
      setEnrichLoading(false);
    }
  }

  /* ── Apply enriched place to the address field ── */
  function handleApplyPlace() {
    if (!enriched) return;
    setPlace({
      formatted: enriched.address,
      name: enriched.name,
      placeId: enriched.placeId,
      lat: enriched.lat,
      lng: enriched.lng,
    });
    setShowAddress(true);
  }

  /* ── "Go give me info" — AI description ── */
  async function handleGoGetInfo() {
    if (!title.trim() || descLoading) return;
    setDescLoading(true);
    try {
      const data = await api.ai.describe({
        name: title.trim(),
        address: enriched?.address ?? place?.formatted,
        types: enriched?.types,
        editorialSummary: enriched?.editorialSummary,
      });
      if (data.description) setDescription(data.description);
    } catch {
      // silent fail
    } finally {
      setDescLoading(false);
    }
  }

  /* ── Derived ── */
  const showEnrichment = enriched !== null && title.trim() !== dismissedTitle;

  // Left column shows only the saved hero image or the placeholder — never the
  // Google-sourced photo (that lives inside the enrichment panel on the right).
  const displayImageUrl = heroImage || DEFAULT_THUMB;
  // Google photo URL used exclusively inside the enrichment card
  const enrichedPhotoUrl = showEnrichment && enriched?.photoRefs[0]
    ? api.places.photoUrl(enriched.photoRefs[0], 400)
    : undefined;

  function handleSave() {
    onSave({
      title, description, status, period, hour, minute, place, budgetAmount, budgetCurrency,
      enrichedPlace: showEnrichment ? enriched : null,
      heroImage: heroImage ? heroImage.split("?")[0] || null : null,
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     Shared grid column definition
  ───────────────────────────────────────────────────────────────── */
  const gridCols = { gridTemplateColumns: `${IMG_COL_W}px 1fr` } as const;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
      className={cn(
        "relative bg-surface border border-border-strong rounded-lg",
        "p-4 flex flex-col gap-3",
        className,
      )}
    >
      {/* Caret arrow */}
      <div
        aria-hidden
        className="absolute -top-[7px] left-[60px] w-3 h-3 bg-surface border-t border-l border-border-strong rotate-45 z-10"
      />

      {/* ── Header (full width) ── */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <span className="text-micro uppercase tracking-[0.08em] font-medium text-ink-soft">
          {isNew ? t("titleNew") : t("titleEdit")}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="w-6 h-6 rounded-full inline-flex items-center justify-center text-ink-faint hover:bg-surface-soft hover:text-ink transition-colors"
          aria-label={t("closeWithoutSaving")}
        >
          <IconX className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── ROW 1: image | title + status + enrichment panel ── */}
      <div className="grid gap-x-4 items-start" style={gridCols}>

        {/* LEFT: image */}
        {activityId && tripId ? (
          <ImagePicker
            currentImageUrl={displayImageUrl}
            currentLabel={heroImage ? "custom photo" : (enriched ? enriched.name : "activity image")}
            thumbnailWidth={IMG_COL_W}
            thumbnailHeight={IMG_COL_H}
            compress={{ maxWidth: 1200, maxHeight: 900, quality: 0.88 }}
            upload={{
              bucket: "trip-media",
              path: () => `trips/${tripId}/activities/${activityId}/hero.webp`,
            }}
            onApply={(result) => {
              const url = result.publicUrl
                ? `${result.publicUrl}?t=${Date.now()}`
                : result.previewUrl;
              setHeroImage(url);
            }}
            onReset={() => setHeroImage("")}
          />
        ) : (
          /* Static thumbnail for new activities */
          <div
            className="rounded-[10px] overflow-hidden bg-cover bg-center shrink-0"
            style={{
              width: IMG_COL_W,
              height: IMG_COL_H,
              backgroundImage: `url(${displayImageUrl})`,
            }}
          >
            {enrichLoading && !enriched && (
              <div className="w-full h-full bg-border/30 animate-pulse" />
            )}
          </div>
        )}

        {/* RIGHT: title + status + enrichment meta */}
        <div className="flex flex-col gap-2 min-w-0">

          {/* Title + status */}
          <div className="flex gap-2.5 items-start">
            <div className="flex-1 min-w-0">
              <SoftField
                value={title}
                onChange={setTitle}
                label={t("titleLabel")}
                placeholder={t("titlePlaceholder")}
                maxLength={80}
                hideCounter
                inputProps={{ autoFocus: true, onBlur: handleTitleBlur }}
              />
            </div>
            <CyclePill value={status} onChange={setStatus} options={STATUS_OPTIONS} className="shrink-0 self-start mt-px" />
          </div>

          {/* Enrichment meta — compact strip (no photo, shown in left col) */}
          {(enrichLoading || showEnrichment) && (
            <div className={cn(
              "rounded-lg border text-tiny transition-all duration-200",
              showEnrichment ? "border-border bg-surface-soft" : "border-border/50 bg-surface-soft/50",
            )}>
              {enrichLoading && !showEnrichment ? (
                /* Shimmer */
                <div className="flex flex-col gap-1.5 p-2.5">
                  <div className="h-2.5 w-3/4 rounded bg-border/60 animate-pulse" />
                  <div className="h-2 w-1/2 rounded bg-border/40 animate-pulse" />
                </div>
              ) : showEnrichment && enriched ? (
                <div className="p-2.5 flex gap-2.5">
                  {/* Google photo thumbnail */}
                  {enrichedPhotoUrl && (
                    <div className="shrink-0 w-[52px] h-[52px] rounded-sm overflow-hidden bg-surface-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={enrichedPhotoUrl}
                        alt={enriched.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Text info */}
                  <div className="flex-1 min-w-0">
                  {/* Name + dismiss */}
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-ink leading-snug truncate">
                      {enriched.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDismissedTitle(title.trim())}
                      className="shrink-0 w-4 h-4 inline-flex items-center justify-center text-ink-faint hover:text-ink transition-colors mt-px"
                      aria-label={t("dismiss")}
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Address */}
                  <p className="text-ink-soft leading-snug line-clamp-1 mt-0.5">
                    {enriched.address}
                  </p>

                  {/* Meta: rating + open status + hours toggle */}
                  <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                    {enriched.rating !== undefined && (
                      <span className="text-ink-soft">
                        ★{" "}
                        <b className="text-ink font-semibold">{enriched.rating.toFixed(1)}</b>
                        {enriched.userRatingsTotal !== undefined && (
                          <span className="text-ink-faint">
                            {" "}({enriched.userRatingsTotal.toLocaleString("en-US")})
                          </span>
                        )}
                      </span>
                    )}
                    {enriched.openNow !== undefined && (
                      <span className={cn("font-medium", enriched.openNow ? "text-[#4a9e5c]" : "text-danger-fg")}>
                        {enriched.openNow ? t("openNow") : t("closedNow")}
                      </span>
                    )}
                    {enriched.weekdayText && enriched.weekdayText.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowHours((v) => !v)}
                        className="text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors"
                      >
                        {showHours ? t("hideHours") : t("seeHours")}
                      </button>
                    )}
                  </div>

                  {/* Expandable hours */}
                  {showHours && enriched.weekdayText && (
                    <ul className="mt-1.5 flex flex-col gap-[2px]">
                      {enriched.weekdayText.map((line) => (
                        <li key={line} className="text-ink-soft leading-snug">{line}</li>
                      ))}
                    </ul>
                  )}

                  {/* Action row: use address + save photo */}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {!place && (
                      <button
                        type="button"
                        onClick={handleApplyPlace}
                        className="text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans"
                      >
                        {t("useThisAddress")}
                      </button>
                    )}
                    {activityId && tripId && enriched.photoRefs[0] && !heroImage && (
                      <button
                        type="button"
                        onClick={handleImportPhoto}
                        disabled={photoImportLoading}
                        className={cn(
                          "text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans",
                          photoImportLoading && "opacity-50 cursor-wait",
                        )}
                      >
                        {photoImportLoading ? "Saving photo…" : "Use as photo"}
                      </button>
                    )}
                  </div>
                  </div> {/* end text info */}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 2: spacer | description + "Go give me info" ── */}
      <div className="grid gap-x-4 items-start" style={gridCols}>
        <div /> {/* left spacer */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <SoftField
            multiline
            value={description}
            onChange={setDescription}
            label={t("descriptionLabel")}
            placeholder={t("descriptionPlaceholder")}
            maxLength={240}
            rows={2}
          />
          {title.trim().length >= 2 && (
            <div className={cn("flex items-center", onAskGo ? "justify-between" : "justify-end")}>
              {onAskGo && (
                <button
                  type="button"
                  onClick={() => onAskGo(title.trim(), effectiveEditId)}
                  className="inline-flex items-center gap-1.5 text-tiny font-medium text-ink-soft hover:text-ink transition-colors"
                >
                  <IconMessage className="w-3.5 h-3.5 text-orange" />
                  {t("askGo")}
                </button>
              )}
              <button
                type="button"
                onClick={handleGoGetInfo}
                disabled={descLoading}
                className={cn(
                  "inline-flex items-center gap-1.5 text-tiny font-medium text-ink-soft hover:text-ink transition-colors",
                  descLoading && "opacity-60 cursor-wait",
                )}
              >
                <IconSparkles className={cn("w-3.5 h-3.5 text-orange", descLoading && "animate-spin")} />
                {descLoading ? t("gettingInfo") : t("goGetInfo")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 3: spacer | period + time picker ── */}
      <div className="grid gap-x-4 items-start" style={gridCols}>
        <div /> {/* left spacer */}
        <div className="min-w-0">
          <PeriodBar
            value={period}
            onChange={setPeriod}
            periods={periods}
            time={{ hour, minute }}
            onTimeChange={({ hour: h, minute: m }) => { setHour(h); setMinute(m); }}
            ariaLabel={t("selectPeriodAndTime")}
            pickerLabels={{ hour: t("hour"), minutes: t("minutes"), clearTime: t("clearTime") }}
          />
        </div>
      </div>

      {/* ── ROW 4 (conditional): spacer | address ── */}
      {showAddress && (
        <div className="grid gap-x-4 items-start" style={gridCols}>
          <div />
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex-1 min-w-0">
              <AddressField value={place} onChange={setPlace} label={t("addressLabel")} placeholder={t("addressPlaceholder")} showMapButton />
            </div>
            <button type="button" onClick={() => { setPlace(null); setShowAddress(false); }} aria-label={t("removeAddress")}
              className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-danger-bg hover:text-danger-fg transition-colors">
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── ROW 5 (conditional): spacer | budget ── */}
      {showBudget && (
        <div className="grid gap-x-4 items-start" style={gridCols}>
          <div />
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex-1 min-w-0">
              <BudgetInput amount={budgetAmount} onAmountChange={setBudgetAmount} currency={budgetCurrency} onCurrencyChange={setBudgetCurrency} currencies={currencies} label={t("budgetLabel")} />
            </div>
            <button type="button" onClick={() => { setBudgetAmount(undefined); setShowBudget(false); }} aria-label={t("removeBudget")}
              className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-danger-bg hover:text-danger-fg transition-colors">
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── ROW 6 (conditional): spacer | "+ Add" links ── */}
      {(!showAddress || !showBudget) && (
        <div className="grid gap-x-4 items-start" style={gridCols}>
          <div />
          <div className="flex flex-wrap gap-3.5 items-center py-1 border-t border-dashed border-border">
            {!showAddress && (
              <button type="button" onClick={() => setShowAddress(true)}
                className="text-mini text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
                {t("addAddress")}
              </button>
            )}
            {!showBudget && (
              <button type="button" onClick={() => setShowBudget(true)}
                className="text-mini text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
                {t("addBudget")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Footer (full width) ── */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-0.5">
        {!isNew && onDelete ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-mini text-danger-fg">{t("areYouSure")}</span>
              <Button variant="ghost" tone="danger" iconOnly={false} onClick={onDelete}>
                <IconTrash />
                {t("delete")}
              </Button>
              <Button variant="text-only" iconOnly={false} onClick={() => setConfirmDelete(false)}>
                {t("cancel")}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" tone="danger" iconOnly={false} onClick={() => setConfirmDelete(true)}>
              <IconTrash />
              {t("deleteActivity")}
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <span className="text-micro text-ink-faint">{t("pressEnterToSave")}</span>
          <Button variant="text-only" iconOnly={false} onClick={onCancel}>{t("cancel")}</Button>
          <Button type="submit" variant="solid" tone="neutral" iconOnly={false}>
            {isNew ? t("createActivity") : t("saveActivity")}
          </Button>
        </div>
      </div>
    </form>
  );
}
