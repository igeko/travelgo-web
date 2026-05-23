"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAltLabel } from "@/lib/hooks/useOS";
import { useShortcuts } from "@/lib/hooks/useShortcut";
import { useShortcutBar } from "@/lib/hooks/useShortcutBar";
import { useRouter } from "next/navigation";
import { HeroBanner, type HeroBannerType, type LodgingType, type HeroBannerHandle } from "@/features/day/HeroBanner";
import { DayEditForm } from "@/features/day/DayEditForm";
import type { DayActivity } from "@/features/day/DayActivitiesEditForm";
import { ActivityEditForm, type ActivityData } from "@/features/activity/ActivityEditForm";
import type { ActivityStatus } from "@/components/ui/StatusBadge";
import { IconArrowRightCircle, IconChevronLeft, IconChevronRight, IconX } from "@/components/ui/icons";
import { DayIncipit } from "@/features/day/DayIncipit";
import { Itinerary } from "@/features/activity/Itinerary";
import { DayItem } from "@/features/day/DayItem";
import { useTripContext } from "@/features/go/useTripContext";
import { useTripGo } from "@/features/go/TripGoContext";
import { useYumejiDrawer, YumejiPinnedColumn } from "@/features/yumeji/YumejiFrame";
import { cn } from "@/lib/cn";
import { PAGE_GAP, PAGE_MAX, PAGE_PX, PAGE_PY } from "@/lib/layout";
import { buildDescribeDayPrompt, estimateTokens } from "@/lib/ai/describe-day-prompt";
import { api } from "@/lib/client";
import type { Trip, Day, Activity } from "@/lib/dal/domain";

/* ─── helpers ─── */
function localDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Derive the scheduling slot from an "HH:MM" time (mirrors PeriodBar ranges). */
function slotFromTime(time: string | null): Activity["slot"] {
  if (!time) return null;
  const h = parseInt(time.slice(0, 2), 10);
  if (Number.isNaN(h)) return null;
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}

/* ─── ShortcutBar ─── */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-[4px] bg-white/15 border border-white/20 text-micro font-medium font-sans leading-none">
      {children}
    </kbd>
  );
}

function ShortcutBar() {
  const t = useTranslations("TripDayView");
  const alt = useAltLabel();
  const { dismissed, dismiss } = useShortcutBar();

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-4 px-3 py-2 mb-3 rounded-md bg-ink text-white/70 text-tiny flex-wrap">
      <span className="text-white/40 text-micro uppercase tracking-[0.08em] font-medium shrink-0">{t("shortcuts.title")}</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}E</Kbd> {t("shortcuts.editDay")}</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}L</Kbd> {t("shortcuts.editLodging")}</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}A</Kbd> {t("shortcuts.addActivity")}</span>
      <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> {t("shortcuts.closePanel")}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("shortcuts.dismiss")}
        title={t("shortcuts.dismiss")}
        className="ml-auto shrink-0 flex items-center justify-center w-5 h-5 rounded-[4px] text-white/40 hover:text-white hover:bg-white/15 transition-colors cursor-pointer border-0 bg-transparent"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}

type Props = {
  trip: Trip;
  days: Day[];
  initialActivities: Activity[];
  initialDayId: string;
  editMode?: boolean;
  fullEditMode?: boolean;
  onExitFullEdit?: () => void;
  debugMode?: boolean;
  reloadTick?: number;
};

export function TripDayView({ trip, days: initialDays, initialActivities, initialDayId, editMode = false, fullEditMode = false, onExitFullEdit, debugMode = false, reloadTick = 0 }: Props) {
  const t = useTranslations("TripDayView");
  const locale = useLocale();
  const router = useRouter();

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(localDate(iso));
  }

  function getDow(iso: string) {
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(localDate(iso)).toUpperCase();
  }
  const [localDays, setLocalDays] = useState(initialDays);
  const [daysCollapsed, setDaysCollapsed] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(initialDayId);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const heroBannerRef = useRef<HeroBannerHandle>(null);

  /* ── Keyboard shortcuts ── */
  useShortcuts([
    { key: "e", onTrigger: () => heroBannerRef.current?.openEdit(), enabled: editMode },
    { key: "l", onTrigger: () => heroBannerRef.current?.openLodging(), enabled: editMode },
    { key: "a", onTrigger: () => setShowAddForm(true), enabled: editMode },
    { key: "Escape", alt: false, onTrigger: () => setShowAddForm(false) },
  ]);

  function selectDay(dayId: string) {
    setSelectedDayId(dayId);
    // Always reload the selected day's activities: the initial day's list
    // arrives via props, but once the user navigates away `activities` holds
    // another day's data, so returning to any day (initial included) must refetch.
    loadActivities(dayId);
    const day = localDays.find((d) => d.id === dayId);
    router.replace(`?day=${day?.day_number ?? 1}`, { scroll: false });
  }

  function patchDay(id: string, fields: Partial<Day>) {
    setLocalDays((prev) => prev.map((d) => d.id === id ? { ...d, ...fields } : d));
  }

  const selectedDay = localDays.find((d) => d.id === selectedDayId) ?? localDays[0];

  const { setTripContext, openGo, openGoWith, hasBeenOpened: goHasBeenOpened, subscribe } = useTripGo();

  const goFocus = useMemo(
    () => selectedDay ? { type: "day" as const, dayNumber: selectedDay.day_number } : undefined,
    [selectedDay?.day_number],
  );

  const { context: tripContext } = useTripContext(trip.id, goFocus, goHasBeenOpened);

  // Update Go context when the selected day changes or the context is ready
  useEffect(() => {
    if (tripContext) setTripContext(tripContext);
  }, [tripContext, setTripContext]);
  const selectedIndex = localDays.findIndex((d) => d.id === selectedDayId);
  const prevDay = selectedIndex > 0 ? localDays[selectedIndex - 1] : null;
  const nextDay = selectedIndex < localDays.length - 1 ? localDays[selectedIndex + 1] : null;

  const loadActivities = useCallback(async (dayId: string) => {
    setLoading(true);
    try {
      setActivities(await api.activities.listForDay(dayId));
    } catch {
      // keep current activities on failure
    } finally {
      setLoading(false);
    }
  }, []);

  // Ref che mantiene sempre l'ID del giorno corrente anche nelle closure Go
  const selectedDayIdRef = useRef(selectedDayId);
  useEffect(() => { selectedDayIdRef.current = selectedDayId; }, [selectedDayId]);

  // Go event "activity.add" → crea l'attività nel giorno corrente
  useEffect(() => {
    return subscribe("activity.add", async ({ payload }) => {
      const dayId = selectedDayIdRef.current;
      try {
        const created = await api.activities.addToDay(dayId, {
          title: payload.title,
          short_desc: payload.description,
          slot: payload.slot,
          location: payload.location ?? null,
          location_place_id: payload.locationPlaceId ?? null,
          location_lat: payload.locationLat ?? null,
          location_lng: payload.locationLng ?? null,
        });
        setActivities((prev) => [...prev, created]);
      } catch {
        // add failed — leave list unchanged
      }
    });
  }, [subscribe]);

  // Reload activities when a remote change arrives (realtime)
  const prevReloadTick = useRef(reloadTick);
  useEffect(() => {
    if (reloadTick !== prevReloadTick.current && selectedDay?.id) {
      prevReloadTick.current = reloadTick;
      loadActivities(selectedDay.id);
    }
  }, [reloadTick, selectedDay?.id, loadActivities]);

  /* ─── Hero content ─── */
  const heroDow = selectedDay.date ? getDow(selectedDay.date) : "";
  const heroDate = selectedDay.date ? formatDate(selectedDay.date) : "";
  const heroEyebrow = t("day.eyebrow", { number: selectedDay.day_number });
  const heroTitle = selectedDay.label ?? selectedDay.city ?? "";
  const heroMeta = `${heroDow} ${heroDate} · ${t("day.activityCount", { count: activities.length })}`;

  /* ─── Lodging sub-banner ─── */
  const DB_TO_LODGING_TYPE: Record<string, LodgingType> = {
    hotel:      "Hotel",
    bb:         "B&B",
    apartment:  "Apartment",
    hostel:     "Hostel",
    campground: "Campground",
    ryokan:     "Ryokan",
    other:      "Other",
  };
  const lodging = selectedDay.accommodation_name
    ? {
        type: selectedDay.accommodation_type
          ? DB_TO_LODGING_TYPE[selectedDay.accommodation_type] ?? undefined
          : undefined,
        name: selectedDay.accommodation_name,
        detail: selectedDay.accommodation_address ?? undefined,
        href: selectedDay.accommodation_url ?? undefined,
        label: "Staying at",
        place: (selectedDay.accommodation_lat != null && selectedDay.accommodation_lng != null)
          ? {
              name: selectedDay.accommodation_name,
              formatted: selectedDay.accommodation_address ?? selectedDay.accommodation_name,
              placeId: selectedDay.accommodation_place_id ?? "",
              lat: selectedDay.accommodation_lat,
              lng: selectedDay.accommodation_lng,
            }
          : null,
      }
    : undefined;

  /* ─── Next day ─── */
  const nextDayDow = nextDay?.date ? getDow(nextDay.date) : "";

  /* ─── Activity list section (full-edit) ───
     Map the day's Activity[] → the lightweight DayActivity model the section
     consumes. Time is normalized to "HH:MM" so the diff below never sees a
     spurious "HH:MM" vs "HH:MM:SS" change. */
  const dayActivities: DayActivity[] = useMemo(
    () =>
      [...activities]
        .sort((a, b) => {
          // Manual order (position) is authoritative; time only breaks ties
          // (e.g. before any reorder, when positions are still equal).
          if (a.position !== b.position) return a.position - b.position;
          if (!a.time && !b.time) return 0;
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        })
        .map((a) => ({
          id: a.id,
          time: a.time ? a.time.slice(0, 5) : null,
          title: a.title,
          activityId: a.activity_id,
        })),
    [activities],
  );

  /* The section emits the whole list after a single mutation; diff it against
     the current mapping to derive the one add / edit / delete and persist it
     through the canonical activity endpoints. */
  async function handleActivitiesChange(next: DayActivity[]) {
    const prev = dayActivities;
    const prevById = new Map(prev.map((x) => [x.id, x]));
    const nextById = new Map(next.map((x) => [x.id, x]));

    // ── reorder (same set, different order) → persist sequential positions ──
    const sameSet = prev.length === next.length && prev.every((x) => nextById.has(x.id));
    const orderChanged = sameSet && prev.some((x, i) => next[i]?.id !== x.id);
    if (orderChanged) {
      const newPos = new Map(next.map((x, i) => [x.id, i + 1]));
      setActivities((list) =>
        [...list]
          .map((a) => ({ ...a, position: newPos.get(a.id) ?? a.position }))
          .sort((a, b) => a.position - b.position),
      );
      await Promise.all(
        next.map((x, i) => {
          const cur = activities.find((a) => a.id === x.id);
          return cur && cur.position !== i + 1
            ? api.activities.updateInstance(x.id, { position: i + 1 }).catch(() => {})
            : null;
        }),
      );
      return;
    }

    // ── delete ──
    const removed = prev.find((x) => !nextById.has(x.id));
    if (removed) {
      setActivities((list) => list.filter((x) => x.id !== removed.id));
      await api.activities.removeFromDay(removed.id).catch(() => {});
      return;
    }

    // ── add (new row carries a synthetic id from the section) ──
    const added = next.find((x) => !prevById.has(x.id));
    if (added) {
      const slot = slotFromTime(added.time);
      const body = added.activityId
        ? { entity_id: added.activityId, slot, time: added.time }
        : { title: added.title, slot, time: added.time };
      try {
        await api.activities.addToDay(selectedDayId, body);
        await loadActivities(selectedDayId);
      } catch {
        // add failed — leave list unchanged
      }
      return;
    }

    // ── edit (time and/or title) ──
    const edited = next.find((x) => {
      const o = prevById.get(x.id);
      return o && (o.time !== x.time || o.title !== x.title);
    });
    if (edited) {
      const before = prevById.get(edited.id)!;
      const slot = slotFromTime(edited.time);
      const entity = activities.find((x) => x.id === edited.id);
      setActivities((list) =>
        list.map((x) => (x.id === edited.id ? { ...x, time: edited.time, title: edited.title, slot } : x)),
      );
      try {
        if (before.time !== edited.time) await api.activities.updateInstance(edited.id, { time: edited.time, slot });
        if (before.title !== edited.title && entity) await api.activities.updateEntity(entity.activity_id, { title: edited.title });
      } catch {
        // edit failed — a later reload will reconcile
      }
    }
  }

  /* ─── Activity entity save / delete (shared by Itinerary + the full-edit
     detailed editor) ─── */
  async function saveActivity(id: string, data: ActivityData) {
    const time = (data.hour !== undefined && data.minute !== undefined)
      ? `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`
      : null;
    const hero_image = data.heroImage ? data.heroImage.split("?")[0] || null : null;
    const budget_paid = data.status === "paid";
    const booking = data.status === "booked" ? "booked" : data.status === "todo" ? "todo" : null;

    const activity = activities.find((a) => a.id === id);
    if (!activity) return;

    setActivities((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              title: data.title,
              short_desc: data.description,
              slot: data.period as Activity["slot"],
              time,
              location: data.place?.formatted ?? null,
              location_place_id: data.place?.placeId ?? null,
              location_lat: data.place?.lat ?? null,
              location_lng: data.place?.lng ?? null,
              budget_amount: data.budgetAmount ?? null,
              budget_currency: data.budgetCurrency,
              budget_paid,
              booking,
              hero_image,
            }
          : a,
      ),
    );

    const entityPatch = {
      title: data.title,
      short_desc: data.description,
      location: data.place?.formatted ?? null,
      location_place_id: data.place?.placeId ?? null,
      location_lat: data.place?.lat ?? null,
      location_lng: data.place?.lng ?? null,
      place_enriched: data.enrichedPlace ?? null,
      hero_image,
      booking,
      budget_amount: data.budgetAmount ?? null,
      budget_currency: data.budgetCurrency,
      budget_paid,
    };
    const instancePatch = { slot: data.period, time };

    try {
      await api.activities.updateEntity(activity.activity_id, entityPatch);
      await api.activities.updateInstance(id, instancePatch);
      if (selectedDay?.id) await loadActivities(selectedDay.id);
    } catch (error) {
      console.error("Error saving activity:", error);
    }
  }

  async function deleteActivity(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    await api.activities.removeFromDay(id).catch(() => {});
  }

  /** Map a full Activity → ActivityData to seed the detailed editor. */
  function activityToData(a: Activity): Partial<ActivityData> {
    let status: ActivityStatus | undefined;
    if (a.budget_paid) status = "paid";
    else if (a.booking === "booked" || a.booking === true) status = "booked";
    else if (a.booking === "todo") status = "todo";
    else if (a.budget_amount) status = "todo";
    return {
      title: a.title,
      description: a.short_desc ?? "",
      period: a.slot ?? "morning",
      hour: a.time ? parseInt(a.time.split(":")[0], 10) : undefined,
      minute: a.time ? parseInt(a.time.split(":")[1], 10) : undefined,
      place: (a.location_lat != null && a.location_lng != null)
        ? {
            name: a.location ?? "",
            formatted: a.location ?? "",
            placeId: a.location_place_id ?? "",
            lat: a.location_lat,
            lng: a.location_lng,
          }
        : null,
      budgetAmount: a.budget_amount ?? undefined,
      budgetCurrency: a.budget_currency ?? "EUR",
      status: status ?? null,
      enrichedPlace: (a.place_enriched as ActivityData["enrichedPlace"]) ?? null,
      heroImage: a.hero_image ?? null,
    };
  }

  const yumeji = useYumejiDrawer();

  return (
    /* ── Replica esatta di .daybyday dal design · 3ª colonna quando Yume è pinned ── */
    <div
      className={cn(
        "grid mx-auto [grid-template-columns:1fr]",
        PAGE_MAX,
        PAGE_GAP,
        PAGE_PX,
        PAGE_PY,
        yumeji?.isPinned
          ? (daysCollapsed
              ? "md:[grid-template-columns:76px_1fr_340px]"
              : "md:[grid-template-columns:260px_1fr_340px]")
          : (daysCollapsed
              ? "md:[grid-template-columns:76px_1fr]"
              : "md:[grid-template-columns:260px_1fr]"),
      )}
    >

      {/* ══ SIDEBAR — .day-list ══════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col bg-surface rounded-lg border border-border overflow-hidden self-start"
        style={{
          position: "sticky",
          top: 94, /* header 52px + sub-bar 42px */
          maxHeight: "calc(100vh - 94px - 24px)",
        }}
      >
        {/* .day-list-head */}
        {daysCollapsed ? (
          <div className="px-2 py-3 border-b border-border shrink-0 flex justify-center">
            <button
              type="button"
              onClick={() => setDaysCollapsed(false)}
              aria-label={t("sidebar.expand")}
              title={t("sidebar.expand")}
              className="flex items-center justify-center w-7 h-7 rounded-md text-ink-soft hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="px-[18px] pt-4 pb-3 border-b border-border shrink-0 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-micro uppercase tracking-[0.10em] text-ink-soft">{t("sidebar.itinerary")}</div>
              <div className="text-[16px] font-semibold text-ink mt-0.5">{t("sidebar.dayByDay")}</div>
              <div className="text-mini text-ink-soft mt-0.5">
                {t("sidebar.summary", {
                  count: localDays.length,
                  start: trip.start_date ? formatDate(trip.start_date) : "",
                  end: trip.end_date ? formatDate(trip.end_date) : "",
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDaysCollapsed(true)}
              aria-label={t("sidebar.collapse")}
              title={t("sidebar.collapse")}
              className="shrink-0 flex items-center justify-center w-7 h-7 -mr-1 rounded-md text-ink-soft hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <IconChevronLeft size={18} />
            </button>
          </div>
        )}

        {/* .day-items — lista scrollabile */}
        <ol className="m-0 p-0 py-1.5 pl-1 list-none flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {localDays.map((d) => {
            return (
              <DayItem
                key={d.id}
                id={`day-${d.day_number - 1}`}
                dow={d.date ? getDow(d.date) : ""}
                dayNumber={d.date ? localDate(d.date).getDate() : d.day_number}
                zone={d.city ?? undefined}
                place={d.label ?? undefined}
                selected={d.id === selectedDayId}
                compact={daysCollapsed}
                onClick={() => selectDay(d.id)}
              />
            );
          })}
        </ol>
      </aside>

      {/* ══ MAIN — .day-main ════════════════════════════════════ */}
      <section className="min-w-0">

        {fullEditMode ? (
          /* ── Full editor — sostituisce il dettaglio del giorno ── */
          <DayEditForm
            key={selectedDayId}
            dayNumber={selectedDay.day_number}
            dateLabel={selectedDay.date ? `${heroDow} ${heroDate}` : undefined}
            hero={{
              title: selectedDay.label ?? undefined,
              subtitle: selectedDay.city ?? undefined,
              summary: selectedDay.summary ?? undefined,
              practicalNote: selectedDay.notes ?? undefined,
              type: selectedDay.day_type
                ? (selectedDay.day_type.charAt(0).toUpperCase() + selectedDay.day_type.slice(1)) as HeroBannerType
                : undefined,
              imageUrl: selectedDay.image_url ?? undefined,
            }}
            lodging={lodging ?? null}
            activities={dayActivities}
            onActivitiesChange={handleActivitiesChange}
            tripId={trip.id}
            activityEditorFor={(id, close) => {
              const a = activities.find((x) => x.id === id);
              if (!a) return null;
              return (
                <ActivityEditForm
                  isNew={false}
                  activityId={a.activity_id}
                  tripId={trip.id}
                  initialData={activityToData(a)}
                  onSave={async (data) => { await saveActivity(id, data); close(); }}
                  onCancel={close}
                  onDelete={async () => { await deleteActivity(id); close(); }}
                  onAskGo={(title, activityId) => openGoWith(`Cerca informazioni su: ${title}`, activityId)}
                />
              );
            }}
            imageUpload={{
              bucket: "trip-media",
              path: () => `trips/${trip.id}/days/${selectedDayId}/banner/hero.webp`,
            }}
            onCancel={() => onExitFullEdit?.()}
            onSave={async ({ hero, lodging: lodgingData }) => {
              const day_type = hero.type ? hero.type.toLowerCase() : null;
              const image_url = hero.imageUrl ? hero.imageUrl.split("?")[0] || null : null;
              const lodgingPatch = lodgingData
                ? {
                    accommodation_type: lodgingData.type?.toLowerCase() ?? null,
                    accommodation_name: lodgingData.name || null,
                    accommodation_address: lodgingData.detail ?? null,
                    accommodation_url: lodgingData.href ?? null,
                    accommodation_place_id: lodgingData.place?.placeId ?? null,
                    accommodation_lat: lodgingData.place?.lat ?? null,
                    accommodation_lng: lodgingData.place?.lng ?? null,
                    accommodation_cost_amount: lodgingData.budgetAmount ?? null,
                    accommodation_cost_currency: lodgingData.budgetCurrency ?? null,
                  }
                : {
                    accommodation_type: null, accommodation_name: null, accommodation_address: null,
                    accommodation_url: null, accommodation_place_id: null, accommodation_lat: null,
                    accommodation_lng: null, accommodation_cost_amount: null, accommodation_cost_currency: null,
                  };
              patchDay(selectedDayId, {
                city: hero.subtitle || null,
                label: hero.title || null,
                day_type,
                notes: hero.practicalNote || null,
                summary: hero.summary || null,
                image_url,
                accommodation_type: lodgingPatch.accommodation_type,
                accommodation_name: lodgingPatch.accommodation_name,
                accommodation_address: lodgingPatch.accommodation_address,
                accommodation_url: lodgingPatch.accommodation_url,
                accommodation_place_id: lodgingPatch.accommodation_place_id,
                accommodation_lat: lodgingPatch.accommodation_lat,
                accommodation_lng: lodgingPatch.accommodation_lng,
              });
              await api.days.update(selectedDayId, {
                city: hero.subtitle,
                label: hero.title,
                day_type,
                notes: hero.practicalNote,
                summary: hero.summary,
                image_url,
                ...lodgingPatch,
              }).catch(() => {});
            }}
            onDelete={undefined}
          />
        ) : (
        <>

        {/* Shortcut hint bar — visible in edit mode, desktop only */}
        {editMode && <div className="hidden md:block"><ShortcutBar /></div>}

        {/* Hero banner */}
        <HeroBanner
          ref={heroBannerRef}
          resetKey={selectedDayId}
          eyebrow={heroEyebrow}
          title={heroTitle}
          subtitle={selectedDay.city ?? undefined}
          summary={selectedDay.summary ?? undefined}
          practicalNote={selectedDay.notes ?? undefined}
          type={selectedDay.day_type ? (selectedDay.day_type.charAt(0).toUpperCase() + selectedDay.day_type.slice(1)) as HeroBannerType : undefined}
          imageUrl={selectedDay.image_url ?? undefined}
          imageUpload={{
            bucket: "trip-media",
            path: () => `trips/${trip.id}/days/${selectedDayId}/banner/hero.webp`,
          }}
          meta={heroMeta}
          subBanner={lodging}
          editMode={editMode}
          onSave={async (data) => {
            const day_type = data.type ? data.type.toLowerCase() : null;
            // Strip the cache-buster (?t=…) added by HeroBanner's onApply before persisting.
            const image_url = data.imageUrl
              ? data.imageUrl.split("?")[0] || null
              : null;
            patchDay(selectedDayId, {
              city: data.subtitle || null,
              label: data.title || null,
              day_type,
              notes: data.practicalNote || null,
              summary: data.summary || null,
              image_url,
            });
            await api.days.update(selectedDayId, {
              city: data.subtitle,
              label: data.title,
              day_type,
              notes: data.practicalNote,
              summary: data.summary,
              image_url,
            }).catch(() => {});
          }}
          onSaveLodging={async (data) => {
            const patch = {
              accommodation_type: data.type?.toLowerCase() ?? null,
              accommodation_name: data.name || null,
              accommodation_address: data.detail ?? null,
              accommodation_url: data.href ?? null,
              accommodation_place_id: data.place?.placeId ?? null,
              accommodation_lat: data.place?.lat ?? null,
              accommodation_lng: data.place?.lng ?? null,
              accommodation_cost_amount: data.budgetAmount ?? null,
              accommodation_cost_currency: data.budgetCurrency ?? null,
            };
            patchDay(selectedDayId, {
              accommodation_type: patch.accommodation_type,
              accommodation_name: patch.accommodation_name,
              accommodation_address: patch.accommodation_address,
              accommodation_url: patch.accommodation_url,
              accommodation_place_id: patch.accommodation_place_id,
              accommodation_lat: patch.accommodation_lat,
              accommodation_lng: patch.accommodation_lng,
            });
            await api.days.update(selectedDayId, patch).catch(() => {});
          }}
          onRemoveLodging={async () => {
            patchDay(selectedDayId, {
              accommodation_type: null,
              accommodation_name: null,
              accommodation_address: null,
              accommodation_url: null,
              accommodation_place_id: null,
              accommodation_lat: null,
              accommodation_lng: null,
            });
            await api.days.update(selectedDayId, {
              accommodation_type: null,
              accommodation_name: null,
              accommodation_address: null,
              accommodation_url: null,
              accommodation_place_id: null,
              accommodation_lat: null,
              accommodation_lng: null,
              accommodation_cost_amount: null,
              accommodation_cost_currency: null,
            }).catch(() => {});
          }}
          onPrev={prevDay ? () => selectDay(prevDay.id) : undefined}
          onNext={nextDay ? () => selectDay(nextDay.id) : undefined}
        />

        <div>

        {/* Day incipit — Go voice + day summary + "ask me" CTA.
            Unifies the former Quote + GoLaunchTrigger blocks. Go stays
            reachable via GoChatFloat on days without a summary. */}
        {(selectedDay.summary || selectedDay.notes) && (
          <DayIncipit
            lead={selectedDay.summary ?? selectedDay.notes!}
            note={selectedDay.summary ? (selectedDay.notes ?? undefined) : undefined}
            onAsk={openGo}
            className="mt-7"
          />
        )}

        {/* Itinerary */}
        <div className={cn("mt-8 transition-opacity duration-200", loading && "opacity-40 pointer-events-none")}>
          <Itinerary
            key={selectedDayId}
            activities={activities}
            day={selectedDay}
            dayId={selectedDayId}
            editMode={editMode}
            tripId={trip.id}
            externalShowAddForm={showAddForm}
            onAddFormClose={() => setShowAddForm(false)}
            onActivitiesChange={() => {
              if (selectedDay?.id) loadActivities(selectedDay.id);
            }}
            onAskGo={(title, activityId) => openGoWith(`Cerca informazioni su: ${title}`, activityId)}
            initialShowMap={selectedDay.show_map}
            onToggleMap={async (show) => {
              await api.days.update(selectedDayId, { show_map: show }).catch(() => {});
            }}
            onActivitySave={saveActivity}
            onActivityDelete={deleteActivity}
            onCreateActivity={async (data) => {
              const time = (data.hour !== undefined && data.minute !== undefined)
                ? `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`
                : null;
              const budget_paid = data.status === "paid";
              const booking = data.status === "booked" ? "booked" : data.status === "todo" ? "todo" : null;

              try {
                const created = await api.activities.addToDay(selectedDayId, {
                  title: data.title,
                  short_desc: data.description,
                  slot: data.period,
                  time,
                  location: data.place?.formatted ?? null,
                  location_place_id: data.place?.placeId ?? null,
                  location_lat: data.place?.lat ?? null,
                  location_lng: data.place?.lng ?? null,
                  budget_amount: data.budgetAmount ?? null,
                  budget_currency: data.budgetCurrency,
                  budget_paid,
                  booking,
                  place_enriched: data.enrichedPlace ?? null,
                });
                setActivities((prev) => [...prev, created]);
              } catch {
                // create failed — leave list unchanged
              }
            }}
          />
        </div>

        {/* Debug — day + activities + OpenAI payload */}
        {debugMode && (() => {
          const aiRequest = {
            dayId: selectedDay.id,
            label: selectedDay.label ?? selectedDay.city ?? "Giorno",
            zone: selectedDay.city ?? undefined,
            type: selectedDay.day_type ?? undefined,
            summary: selectedDay.summary ?? undefined,
            activities: activities.map((a) => ({
              id: a.id,
              slot: a.slot,
              time: a.time,
              name: a.title,
              description: a.short_desc,
            })),
          };
          const prompt = buildDescribeDayPrompt(aiRequest);
          const promptTokens = estimateTokens(prompt);
          const maxTokens = 700;

          return (
            <div className="mt-8 flex flex-col gap-2">
              <details className="rounded-lg border border-dashed border-border p-3">
                <summary className="text-tiny font-medium text-ink-faint cursor-pointer select-none">
                  🐛 Debug · selectedDay
                </summary>
                <pre className="mt-2 text-tiny text-ink-soft overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedDay, null, 2)}
                </pre>
              </details>
              <details className="rounded-lg border border-dashed border-border p-3">
                <summary className="text-tiny font-medium text-ink-faint cursor-pointer select-none">
                  🐛 Debug · activities ({activities.length})
                </summary>
                <pre className="mt-2 text-tiny text-ink-soft overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(activities, null, 2)}
                </pre>
              </details>
              <details className="rounded-lg border border-dashed border-border p-3">
                <summary className="text-tiny font-medium text-ink-faint cursor-pointer select-none">
                  🤖 Debug · OpenAI payload
                  <span className="ml-2 text-orange font-mono">
                    ~{promptTokens} prompt tokens · max {maxTokens} completion · ~{promptTokens + maxTokens} tot
                  </span>
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <div className="text-micro uppercase tracking-[0.1em] text-ink-faint mb-1">Request body (DescribeDayRequest)</div>
                    <pre className="text-tiny text-ink-soft overflow-x-auto whitespace-pre-wrap break-all bg-surface rounded p-2">
                      {JSON.stringify(aiRequest, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-micro uppercase tracking-[0.1em] text-ink-faint mb-1">Prompt inviato al modello</div>
                    <pre className="text-tiny text-ink-soft overflow-x-auto whitespace-pre-wrap break-all bg-surface rounded p-2 leading-relaxed">
                      {prompt}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          );
        })()}

        </div>

        {/* Next day */}
        {nextDay && (
          <button
            onClick={() => selectDay(nextDay.id)}
            className="mt-16 w-full flex items-center gap-3 px-4 py-3.5 rounded-md border border-border bg-surface-soft text-left cursor-pointer transition-colors hover:bg-surface hover:border-border-strong"
          >
            <IconArrowRightCircle className="w-6 h-6 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-micro text-ink-faint uppercase tracking-eyebrow">
                {t("nextDay", { number: nextDay.day_number, dow: nextDayDow })}
              </div>
              <div className="text-[14px] font-medium mt-0.5 truncate text-ink">
                {nextDay.label ?? nextDay.city ?? ""}
              </div>
            </div>
            <IconChevronRight className="w-5 h-5 text-ink-faint shrink-0" />
          </button>
        )}

        </>
        )}

      </section>

      {/* ══ YUME — terza colonna (solo quando pinned) ════════════ */}
      <YumejiPinnedColumn className="hidden md:flex self-start sticky top-[94px] max-h-[calc(100vh-118px)]" />
    </div>
  );
}
