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
  /** Called when the user clicks "Ask Go" — opens the chat panel with the activity title */
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

const ALL_HOURS = [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4];
const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

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
  const [pickerOpen, setPickerOpen] = useState(false);
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

  /* ── Photo-search triggered on title blur ── */
  async function handleTitleBlur() {
    const trimmed = title.trim();
    // Too short, or same title we already searched, or user dismissed this result
    if (trimmed.length < 3 || trimmed === lastSearchedTitle.current || trimmed === dismissedTitle) return;

    lastSearchedTitle.current = trimmed;
    setEnrichLoading(true);
    try {
      const res = await fetch(`/api/places/photo-search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setEnriched(data.place ?? null);
    } catch {
      setEnriched(null);
    } finally {
      setEnrichLoading(false);
    }
  }

  /* ── Apply enriched place to the address field ── */
  function handleApplyPlace() {
    if (!enriched) return;
    const resolved: PlaceResult = {
      formatted: enriched.address,
      name: enriched.name,
      placeId: enriched.placeId,
      lat: enriched.lat,
      lng: enriched.lng,
    };
    setPlace(resolved);
    setShowAddress(true);
  }

  /* ── "Go give me info" — AI description ── */
  async function handleGoGetInfo() {
    if (!title.trim() || descLoading) return;
    setDescLoading(true);
    try {
      const res = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title.trim(),
          address: enriched?.address ?? place?.formatted,
          types: enriched?.types,
          editorialSummary: enriched?.editorialSummary,
        }),
      });
      const data = await res.json();
      if (data.description) setDescription(data.description);
    } catch {
      // silent fail — user can type manually
    } finally {
      setDescLoading(false);
    }
  }

  /* ── Show enrichment panel? ── */
  const showEnrichment =
    enriched !== null && title.trim() !== dismissedTitle;

  const hasTime = hour !== undefined && minute !== undefined;
  const activeTime = hasTime
    ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : undefined;
  const currentPeriodHours =
    periods.find((p) => p.id === period)?.hours ?? ALL_HOURS;

  function handlePeriodCellClick(id: string) {
    if (id === period) {
      setPickerOpen((v) => !v);
    } else {
      setPeriod(id);
      setPickerOpen(true);
      const newPeriodHours = periods.find((p) => p.id === id)?.hours;
      if (newPeriodHours && hour !== undefined && !newPeriodHours.includes(hour)) {
        setHour(undefined);
        setMinute(undefined);
      }
    }
  }

  function handleClearTime() {
    setHour(undefined);
    setMinute(undefined);
    setPickerOpen(false);
  }

  function handleSave() {
    onSave({
      title, description, status, period, hour, minute, place, budgetAmount, budgetCurrency,
      // Persist enriched data only if the panel is currently visible (not dismissed)
      enrichedPlace: showEnrichment ? enriched : null,
      // Strip cache-buster (?t=…) before persisting — added by ImagePicker onApply
      heroImage: heroImage ? heroImage.split("?")[0] || null : null,
    });
  }

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
      <div
        aria-hidden
        className="absolute -top-[7px] left-[60px] w-3 h-3 bg-surface border-t border-l border-border-strong rotate-45 z-10"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-ink-soft">
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

      {/* ── Place enrichment panel ── */}
      {(enrichLoading || showEnrichment) && (
        <div
          className={cn(
            "rounded-[10px] border overflow-hidden transition-all duration-200",
            showEnrichment
              ? "border-border bg-surface-soft"
              : "border-border/50 bg-surface-soft/50",
          )}
        >
          {enrichLoading && !showEnrichment ? (
            /* Loading shimmer */
            <div className="flex gap-3 p-3 items-center">
              <div className="w-12 h-12 rounded-lg bg-border/60 shrink-0 animate-pulse" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-2.5 w-2/3 rounded bg-border/60 animate-pulse" />
                <div className="h-2 w-1/2 rounded bg-border/40 animate-pulse" />
              </div>
            </div>
          ) : showEnrichment && enriched ? (
            <div className="flex gap-3 p-3">
              {/* Thumbnail */}
              {enriched.photoRefs[0] && (
                <div className="shrink-0 w-[52px] h-[52px] rounded-lg overflow-hidden bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/places/photo?ref=${enriched.photoRefs[0]}&maxwidth=120`}
                    alt={enriched.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name + dismiss */}
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[12px] font-semibold text-ink leading-snug truncate">
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
                <p className="text-[11px] text-ink-soft leading-snug line-clamp-1 mt-0.5">
                  {enriched.address}
                </p>

                {/* Meta row: rating + open status */}
                <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                  {enriched.rating !== undefined && (
                    <span className="text-[10px] text-ink-soft">
                      ★ <b className="text-ink font-semibold">{enriched.rating.toFixed(1)}</b>
                      {enriched.userRatingsTotal !== undefined && (
                        <span className="text-ink-faint"> ({enriched.userRatingsTotal.toLocaleString()})</span>
                      )}
                    </span>
                  )}
                  {enriched.openNow !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        enriched.openNow ? "text-[#4a9e5c]" : "text-[#9a3015]",
                      )}
                    >
                      {enriched.openNow ? t("openNow") : t("closedNow")}
                    </span>
                  )}
                  {enriched.weekdayText && enriched.weekdayText.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowHours((v) => !v)}
                      className="text-[10px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors"
                    >
                      {showHours ? t("hideHours") : t("seeHours")}
                    </button>
                  )}
                </div>

                {/* Expandable hours */}
                {showHours && enriched.weekdayText && (
                  <ul className="mt-2 flex flex-col gap-[2px]">
                    {enriched.weekdayText.map((line) => (
                      <li key={line} className="text-[10px] text-ink-soft leading-snug">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Apply address action */}
                {!place && (
                  <button
                    type="button"
                    onClick={handleApplyPlace}
                    className="mt-1.5 text-[11px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans"
                  >
                    {t("useThisAddress")}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Description + "Go give me info" */}
      <div className="flex flex-col gap-1.5">
        <SoftField
          multiline
          value={description}
          onChange={setDescription}
          label={t("descriptionLabel")}
          placeholder={t("descriptionPlaceholder")}
          maxLength={240}
          rows={2}
        />
        {/* Go actions — visible when title is long enough */}
        {title.trim().length >= 2 && (
          <div className={cn("flex items-center", onAskGo ? "justify-between" : "justify-end")}>
            {onAskGo && (
              <button
                type="button"
                onClick={() => onAskGo(title.trim(), effectiveEditId)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium transition-all text-ink-soft hover:text-ink"
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
                "inline-flex items-center gap-1.5 text-[11px] font-medium transition-all",
                "text-ink-soft hover:text-ink",
                descLoading && "opacity-60 cursor-wait",
              )}
            >
              <IconSparkles
                className={cn(
                  "w-3.5 h-3.5 text-orange transition-transform",
                  descLoading && "animate-spin",
                )}
              />
              {descLoading ? t("gettingInfo") : t("goGetInfo")}
            </button>
          </div>
        )}
      </div>

      {/* Period + time picker */}
      <div className="flex flex-col gap-2">
        <div
          role="group"
          aria-label={t("selectPeriodAndTime")}
          className="grid rounded-pill bg-surface border border-border p-0.5 gap-0.5"
          style={{ gridTemplateColumns: `repeat(${periods.length}, 1fr)` }}
        >
          {periods.map((p) => {
            const isActive = p.id === period;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePeriodCellClick(p.id)}
                className={cn(
                  "text-center rounded-pill cursor-pointer select-none transition-colors font-sans px-1 py-[5px]",
                  isActive ? "bg-ink text-white" : "text-ink hover:bg-surface-soft",
                )}
              >
                <div className="text-[10px] font-medium uppercase tracking-[0.08em]">{p.name}</div>
                {isActive && activeTime ? (
                  <div className="text-[13px] font-medium tabular-nums tracking-[-0.01em] leading-none mt-px">{activeTime}</div>
                ) : (
                  <div className={cn("text-[9px] tabular-nums tracking-[0.04em] mt-px", isActive ? "text-white/55" : "text-ink-faint")}>{p.range}</div>
                )}
              </button>
            );
          })}
        </div>

        {pickerOpen && (
          <div className="bg-surface border border-border rounded-[18px] p-3.5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.05em] text-ink-faint text-center mb-2 font-medium">{t("hour")}</div>
                <div className="grid grid-cols-4 gap-1">
                  {currentPeriodHours.map((h) => (
                    <button key={h} type="button" onClick={() => setHour(h)}
                      className={cn("text-center py-2 text-[14px] tabular-nums rounded-pill cursor-pointer select-none transition-colors font-sans",
                        h === hour ? "bg-orange text-white font-medium" : "text-ink hover:bg-surface-soft")}>
                      {String(h).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.05em] text-ink-faint text-center mb-2 font-medium">{t("minutes")}</div>
                <div className="grid grid-cols-4 gap-1">
                  {MINUTES.map((m) => (
                    <button key={m} type="button"
                      onClick={() => { setMinute(m); if (hour !== undefined) setPickerOpen(false); }}
                      className={cn("text-center py-2 text-[14px] tabular-nums rounded-pill cursor-pointer select-none transition-colors font-sans",
                        m === minute ? "bg-orange text-white font-medium" : "text-ink hover:bg-surface-soft")}>
                      {String(m).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {hasTime && (
              <div className="flex justify-end">
                <button type="button" onClick={handleClearTime}
                  className="text-[11px] text-ink-soft underline underline-offset-2 decoration-ink/20 hover:text-[#9a3015] hover:decoration-[#9a3015] transition-colors">
                  {t("clearTime")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optional: address */}
      {showAddress && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <AddressField value={place} onChange={setPlace} label={t("addressLabel")} placeholder={t("addressPlaceholder")} showMapButton />
          </div>
          <button type="button" onClick={() => { setPlace(null); setShowAddress(false); }} aria-label={t("removeAddress")}
            className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-[#fcebeb] hover:text-[#9a3015] transition-colors">
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Optional: budget */}
      {showBudget && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <BudgetInput amount={budgetAmount} onAmountChange={setBudgetAmount} currency={budgetCurrency} onCurrencyChange={setBudgetCurrency} currencies={currencies} label={t("budgetLabel")} />
          </div>
          <button type="button" onClick={() => { setBudgetAmount(undefined); setShowBudget(false); }} aria-label={t("removeBudget")}
            className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-[#fcebeb] hover:text-[#9a3015] transition-colors">
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Image picker — only in edit mode (activityId known) */}
      {activityId && tripId && (
        <div className="flex items-center gap-3 py-1 border-t border-dashed border-border mt-0.5">
          <ImagePicker
            currentImageUrl={heroImage || undefined}
            currentLabel={heroImage ? "custom photo" : "activity image"}
            thumbnailWidth={88}
            thumbnailHeight={68}
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
          <span className="text-[11px] text-ink-soft leading-snug">
            Photo shown<br />on the activity card
          </span>
        </div>
      )}

      {/* "+ Add …" links */}
      {(!showAddress || !showBudget) && (
        <div className="flex flex-wrap gap-3.5 items-center py-1 border-t border-dashed border-border mt-0.5">
          {!showAddress && (
            <button type="button" onClick={() => setShowAddress(true)}
              className="text-[12px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
              {t("addAddress")}
            </button>
          )}
          {!showBudget && (
            <button type="button" onClick={() => setShowBudget(true)}
              className="text-[12px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
              {t("addBudget")}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-0.5">
        {!isNew && onDelete ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#9a3015]">{t("areYouSure")}</span>
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
          <span className="text-[10px] text-ink-faint">{t("pressEnterToSave")}</span>
          <Button variant="text-only" iconOnly={false} onClick={onCancel}>{t("cancel")}</Button>
          <Button type="submit" variant="solid" tone="neutral" iconOnly={false}>
            {isNew ? t("createActivity") : t("saveActivity")}
          </Button>
        </div>
      </div>
    </form>
  );
}
