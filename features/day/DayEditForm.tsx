"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { IconBed, IconCalendarTime, IconMapPin, IconPlus, IconTrash, IconX } from "@/components/ui/icons";
import type { CompressOptions, UploadOptions } from "@/components/ui/ImagePicker";
import type { TripActivityOption } from "@/features/activity/types";
import {
  DayInfoEditForm,
  type DayInfoEditFormHandle,
  type HeroBannerData,
  type HeroBannerType,
} from "./DayInfoEditForm";
import {
  LodgingEditForm,
  type LodgingEditFormHandle,
  type HeroBannerSubBanner,
  type HeroBannerSubBannerData,
} from "./LodgingEditForm";
import { DayActivitiesEditForm, type DayActivity } from "./DayActivitiesEditForm";

/* ─────────────────────────────────────────────────────────────────
   DayEditForm · modifica giorno con switch in stile trip-edit.
   Layout two-pane: editor a sinistra, menu di sezione a destra
   (Info giorno · Alloggio) con marker arancione sul bordo destro.
   I due editor restano montati e si nascondono via `hidden` per non
   perdere lo stato durante lo switch; il footer unico raccoglie i
   draft via ref.getData().
───────────────────────────────────────────────────────────────── */

export type DayData = {
  hero: HeroBannerData;
  lodging: HeroBannerSubBannerData | null;
};

type SectionId = "day" | "lodging" | "activities";

export type DayEditFormProps = {
  dayNumber?: number;
  dateLabel?: string;
  /** Valori iniziali della parte hero (anagrafica). */
  hero?: {
    title?: string;
    subtitle?: string;
    summary?: string;
    practicalNote?: string;
    type?: HeroBannerType;
    imageUrl?: string;
  };
  /** Alloggio iniziale; null/undefined = nessun alloggio. */
  lodging?: HeroBannerSubBanner | null;
  /**
   * Activity list. Activities are separate entities persisted independently,
   * so the section commits via `onActivitiesChange` (not the unified Save).
   * The section is only shown when `onActivitiesChange` is provided.
   */
  activities?: DayActivity[];
  onActivitiesChange?: (next: DayActivity[]) => void;
  /** Trip id for the activity autocomplete. */
  tripId?: string;
  /** Pre-supplied activities for the autocomplete (tests / sandbox). */
  activityItems?: TripActivityOption[];
  /** Detailed editor for an activity row, rendered inline below it. */
  activityEditorFor?: (id: string, close: () => void) => React.ReactNode;
  imageCompress?: CompressOptions;
  imageUpload?: UploadOptions;
  onSave: (data: DayData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  className?: string;
};

/* ── Section header in stile trip-edit ── */
function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium m-0">{eyebrow}</p>
      <h2 className="font-serif italic text-[22px] text-ink font-medium leading-tight m-0 mt-1">{title}</h2>
      <p className="font-serif italic text-meta text-ink-faint mt-1">{sub}</p>
    </div>
  );
}

/* ── Voce del menu di destra ── */
function MenuItem({
  active,
  icon,
  label,
  preview,
  onSelect,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  preview: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors rounded-md",
        active ? "bg-surface my-0.5" : "hover:bg-surface/60 cursor-pointer",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-1.5 h-[30px] bg-orange rounded-[3px]"
        />
      )}
      <span className={cn("mt-0.5 [&>svg]:size-4 shrink-0", active ? "text-orange" : "text-ink-faint")}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-mini font-medium m-0 text-ink">{label}</p>
        <p className="font-serif italic text-[10.5px] leading-snug mt-0.5 text-ink-faint truncate">{preview}</p>
      </div>
    </button>
  );
}

export function DayEditForm({
  dayNumber,
  dateLabel,
  hero,
  lodging,
  activities,
  onActivitiesChange,
  tripId,
  activityItems,
  activityEditorFor,
  imageCompress,
  imageUpload,
  onSave,
  onCancel,
  onDelete,
  className,
}: DayEditFormProps) {
  const t = useTranslations("DayEditForm");
  const heroRef = useRef<DayInfoEditFormHandle>(null);
  const lodgingRef = useRef<LodgingEditFormHandle>(null);

  const [section, setSection] = useState<SectionId>("day");
  const [hasLodging, setHasLodging] = useState(!!lodging);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showActivities = !!onActivitiesChange;

  function handleSave() {
    const heroData = heroRef.current?.getData();
    if (!heroData) return;
    onSave({
      hero: heroData,
      lodging: hasLodging ? (lodgingRef.current?.getData() ?? null) : null,
    });
  }

  const dayPreview = hero?.subtitle || hero?.title || t("dayPreview");
  const lodgingPreview = hasLodging ? (lodging?.name || t("lodgingPreview")) : t("noLodging");
  const activitiesPreview = t("activitiesPreview", { count: activities?.length ?? 0 });

  return (
    <div
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
      className={cn(
        "bg-surface border border-border-strong rounded-lg flex flex-col",
        className,
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-baseline gap-2">
          <span className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium">{t("title")}</span>
          {dayNumber !== undefined && (
            <span className="text-mini font-medium text-ink">{t("day", { number: dayNumber })}</span>
          )}
          {dateLabel && <span className="text-mini text-ink-faint">· {dateLabel}</span>}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-6 h-6 rounded-full inline-flex items-center justify-center text-ink-faint hover:bg-surface-soft hover:text-ink transition-colors"
          aria-label={t("close")}
        >
          <IconX className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Two-pane: editor (sx) + menu (dx) ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_215px] min-h-[420px]">
        {/* Editor pane */}
        <div className="p-6 md:p-7 order-2 md:order-1">
          {/* Info giorno */}
          <div className={cn(section !== "day" && "hidden")}>
            <SectionHeader
              eyebrow={t("daySection.eyebrow")}
              title={t("daySection.title")}
              sub={t("daySection.sub")}
            />
            <DayInfoEditForm
              ref={heroRef}
              hideFooter
              hideTitle
              autoFocus={false}
              title={hero?.title ?? ""}
              subtitle={hero?.subtitle}
              summary={hero?.summary}
              practicalNote={hero?.practicalNote}
              type={hero?.type}
              imageUrl={hero?.imageUrl}
              imageCompress={imageCompress}
              imageUpload={imageUpload}
              className="border-0 rounded-none px-0 pt-0 pb-0"
            />
          </div>

          {/* Alloggio */}
          <div className={cn(section !== "lodging" && "hidden")}>
            <SectionHeader
              eyebrow={t("lodgingSection.eyebrow")}
              title={t("lodgingSection.title")}
              sub={t("lodgingSection.sub")}
            />
            {hasLodging ? (
              <>
                <div className="flex justify-end -mt-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setHasLodging(false)}
                    className="inline-flex items-center gap-1 text-tiny font-medium text-ink-faint hover:text-danger-fg transition-colors"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                    {t("removeLodging")}
                  </button>
                </div>
                <LodgingEditForm
                  ref={lodgingRef}
                  hideFooter
                  hideTitle
                  autoFocus={false}
                  initial={lodging}
                  className="border-0 rounded-none px-0 pt-0 pb-0"
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setHasLodging(true)}
                className="inline-flex items-center justify-center gap-1.5 self-start text-mini font-medium rounded-pill px-4 py-2 border border-dashed border-border text-ink-soft hover:border-border-strong hover:text-ink transition-colors"
              >
                <IconPlus className="w-3.5 h-3.5 text-orange" />
                {t("addLodging")}
              </button>
            )}
          </div>

          {/* Attività */}
          {showActivities && (
            <div className={cn(section !== "activities" && "hidden")}>
              <DayActivitiesEditForm
                activities={activities ?? []}
                onChange={onActivitiesChange}
                tripId={tripId}
                items={activityItems}
                editorFor={activityEditorFor}
              />
            </div>
          )}
        </div>

        {/* Menu pane (destra) */}
        <aside className="bg-surface-soft border-b md:border-b-0 md:border-l border-border px-3 py-5 order-1 md:order-2">
          <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium px-3 mb-3.5">{t("sections")}</p>
          <nav className="flex flex-col gap-0.5">
            <MenuItem
              active={section === "day"}
              icon={<IconMapPin />}
              label={t("dayMenu")}
              preview={dayPreview}
              onSelect={() => setSection("day")}
            />
            <MenuItem
              active={section === "lodging"}
              icon={<IconBed />}
              label={t("lodgingMenu")}
              preview={lodgingPreview}
              onSelect={() => setSection("lodging")}
            />
            {showActivities && (
              <MenuItem
                active={section === "activities"}
                icon={<IconCalendarTime />}
                label={t("activitiesMenu")}
                preview={activitiesPreview}
                onSelect={() => setSection("activities")}
              />
            )}
          </nav>
        </aside>
      </div>

      {/* ── Footer unico ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
        {onDelete ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-mini text-danger-fg">{t("confirmDelete")}</span>
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
              {t("deleteDay")}
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button variant="text-only" iconOnly={false} onClick={onCancel}>{t("cancel")}</Button>
          <Button variant="solid" tone="neutral" iconOnly={false} onClick={handleSave}>
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
