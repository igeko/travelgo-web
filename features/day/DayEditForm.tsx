"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { IconBed, IconCalendarTime, IconChevronLeft, IconChevronRight, IconMapPin, IconPlus, IconRoute, IconTrash, IconX } from "@/components/ui/icons";
import type { CompressOptions, UploadOptions } from "@/components/ui/ImagePicker";
import type { TripActivityOption } from "@/features/activity/types";
import {
  DayInfoEditForm,
  type HeroBannerData,
  type HeroBannerType,
} from "./DayInfoEditForm";
import {
  LodgingEditForm,
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

export type DayEditSection = "day" | "lodging" | "activities" | "timeline";

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
  /** Timeline view (e.g. the <Timeline/>). When given, a 4th "Timeline" section
   *  appears — same map/layout as Activities, with the timeline instead of the list. */
  timelineSlot?: React.ReactNode;
  /** Tailwind `top-*` class for the sticky map (clear a fixed header). */
  mapStickyTop?: string;
  /** Day's "show map on the day page" flag + persist handler (activities section). */
  showMapOnDay?: boolean;
  onShowMapOnDayChange?: (value: boolean) => void;
  imageCompress?: CompressOptions;
  imageUpload?: UploadOptions;
  /** Active section — controlled. Lets a host persist it across day changes. */
  section?: DayEditSection;
  onSectionChange?: (section: DayEditSection) => void;
  /** Collapsed section menu — controlled (persists across day changes). */
  navCollapsed?: boolean;
  onNavCollapsedChange?: (collapsed: boolean) => void;
  /** Save the day-info section (its own footer). */
  onSaveDayInfo?: (data: HeroBannerData) => void;
  /** Save the lodging section (its own footer). `null` = lodging removed. */
  onSaveLodging?: (data: HeroBannerSubBannerData | null) => void;
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
  collapsed,
  onSelect,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  preview: string;
  /** Collapsed rail (desktop): show only the icon. */
  collapsed?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors rounded-md",
        active ? "bg-surface my-0.5" : "hover:bg-surface/60 cursor-pointer",
        collapsed && "md:items-center md:justify-center md:gap-0 md:px-0",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-1.5 h-[30px] bg-orange rounded-[3px]"
        />
      )}
      <span className={cn("mt-0.5 [&>svg]:size-4 shrink-0", active ? "text-orange" : "text-ink-faint", collapsed && "md:mt-0")}>{icon}</span>
      <div className={cn("flex-1 min-w-0", collapsed && "md:hidden")}>
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
  timelineSlot,
  mapStickyTop,
  showMapOnDay,
  onShowMapOnDayChange,
  imageCompress,
  imageUpload,
  section: sectionProp,
  onSectionChange,
  navCollapsed: navCollapsedProp,
  onNavCollapsedChange,
  onSaveDayInfo,
  onSaveLodging,
  onCancel,
  onDelete,
  className,
}: DayEditFormProps) {
  const t = useTranslations("DayEditForm");

  // Section + collapsed state are controllable so a host can persist them
  // across day changes (the form remounts per day to re-seed its data).
  const [internalSection, setInternalSection] = useState<DayEditSection>("day");
  const section = sectionProp ?? internalSection;
  const changeSection = (s: DayEditSection) => (onSectionChange ?? setInternalSection)(s);

  const [internalNavCollapsed, setInternalNavCollapsed] = useState(false);
  const navCollapsed = navCollapsedProp ?? internalNavCollapsed;
  const setNavCollapsed = (v: boolean) => (onNavCollapsedChange ?? setInternalNavCollapsed)(v);

  const [hasLodging, setHasLodging] = useState(!!lodging);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showActivities = !!onActivitiesChange;
  const showTimeline = !!timelineSlot;

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
      <div className={cn(
        "grid grid-cols-1 min-h-[420px]",
        navCollapsed ? "md:grid-cols-[1fr_60px]" : "md:grid-cols-[1fr_215px]",
      )}>
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
              onSave={onSaveDayInfo}
              onCancel={onCancel}
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
              <LodgingEditForm
                hideTitle
                autoFocus={false}
                initial={lodging}
                onSave={(d) => onSaveLodging?.(d)}
                onCancel={onCancel}
                onRemove={() => { setHasLodging(false); onSaveLodging?.(null); }}
                className="border-0 rounded-none px-0 pt-0 pb-0"
              />
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

          {/* Attività / Timeline — stessa shell (mappa + checkbox), contenuto a destra cambia */}
          {(showActivities || showTimeline) && (
            <div className={cn(section !== "activities" && section !== "timeline" && "hidden")}>
              <DayActivitiesEditForm
                activities={activities ?? []}
                onChange={onActivitiesChange ?? (() => {})}
                tripId={tripId}
                items={activityItems}
                editorFor={activityEditorFor}
                showMapOnDay={showMapOnDay}
                onShowMapOnDayChange={onShowMapOnDayChange}
                mode={section === "timeline" ? "timeline" : "list"}
                timelineSlot={timelineSlot}
                mapStickyTop={mapStickyTop}
              />
            </div>
          )}
        </div>

        {/* Menu pane (destra) · collassabile su desktop → solo icone */}
        <aside className="bg-surface-soft border-b md:border-b-0 md:border-l border-border px-3 py-5 order-1 md:order-2">
          <div className={cn("flex items-center mb-3.5 px-3", navCollapsed ? "md:justify-center md:px-0" : "justify-between")}>
            <span className={cn("text-tiny tracking-eyebrow uppercase text-orange-deep font-medium", navCollapsed && "md:hidden")}>
              {t("sections")}
            </span>
            <button
              type="button"
              onClick={() => setNavCollapsed(!navCollapsed)}
              aria-label={navCollapsed ? t("expandSections") : t("collapseSections")}
              title={navCollapsed ? t("expandSections") : t("collapseSections")}
              className="hidden md:inline-flex w-6 h-6 rounded-md items-center justify-center text-ink-faint hover:bg-surface hover:text-ink transition-colors"
            >
              {navCollapsed ? <IconChevronLeft size={15} /> : <IconChevronRight size={15} />}
            </button>
          </div>
          <nav className="flex flex-col gap-0.5">
            <MenuItem
              active={section === "day"}
              icon={<IconMapPin />}
              label={t("dayMenu")}
              preview={dayPreview}
              collapsed={navCollapsed}
              onSelect={() => changeSection("day")}
            />
            <MenuItem
              active={section === "lodging"}
              icon={<IconBed />}
              label={t("lodgingMenu")}
              preview={lodgingPreview}
              collapsed={navCollapsed}
              onSelect={() => changeSection("lodging")}
            />
            {showActivities && (
              <MenuItem
                active={section === "activities"}
                icon={<IconCalendarTime />}
                label={t("activitiesMenu")}
                preview={activitiesPreview}
                collapsed={navCollapsed}
                onSelect={() => changeSection("activities")}
              />
            )}
            {showTimeline && (
              <MenuItem
                active={section === "timeline"}
                icon={<IconRoute />}
                label={t("timelineMenu")}
                preview={activitiesPreview}
                collapsed={navCollapsed}
                onSelect={() => changeSection("timeline")}
              />
            )}
          </nav>
        </aside>
      </div>

      {/* ── Footer · solo eliminazione giorno (Salva/Annulla vivono nelle sezioni) ── */}
      {onDelete && (
        <div className="flex items-center px-5 py-3 border-t border-border">
          {confirmDelete ? (
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
          )}
        </div>
      )}
    </div>
  );
}
