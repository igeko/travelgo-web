"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAltLabel } from "@/lib/hooks/useOS";
import { useShortcuts } from "@/lib/hooks/useShortcut";
import { useRouter } from "next/navigation";
import { HeroBanner, type HeroBannerType, type LodgingType, type HeroBannerHandle } from "@/features/day/HeroBanner";
import { IconArrowRightCircle, IconChevronRight } from "@/components/ui/icons";
import { IconSparkles } from "@tabler/icons-react";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { Quote } from "@/components/ui/Quote";
import { Itinerary } from "@/features/activity/Itinerary";
import { DayItem } from "@/features/day/DayItem";
import { useTripContext } from "@/features/go/useTripContext";
import { useTripGo } from "@/features/go/TripGoContext";
import { cn } from "@/lib/cn";
import { buildDescribeDayPrompt, estimateTokens } from "@/lib/ai/describe-day-prompt";
import type { Trip, Day, Activity } from "@/lib/dal/trips";

/* ─── helpers ─── */
function localDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* ─── GoLaunchTrigger ─── */

type LaunchPhase = "idle" | "collapsing" | "launching" | "gone";

function GoLaunchTrigger({ onLaunch }: { onLaunch: () => void }) {
  const t = useTranslations("TripDayView");
  const [phase, setPhase] = useState<LaunchPhase>("idle");
  const rotatingWords = [t("go.rotating0"), t("go.rotating1"), t("go.rotating2"), t("go.rotating3")];

  function handleClick() {
    if (phase !== "idle") return;
    setPhase("collapsing");
    setTimeout(() => {
      setPhase("launching");
      setTimeout(() => {
        setPhase("gone");
        setTimeout(() => {
          onLaunch();
        }, 420);
      }, 1200);
    }, 320);
  }

  const isFlying = phase === "gone";
  const isLaunching = phase === "launching" || phase === "gone";
  const isCollapsing = phase !== "idle";

  return (
    <div
      className="relative rounded-xl w-full mt-6 overflow-hidden"
      style={{
        height: 60,
        cursor: phase === "idle" ? "pointer" : "default",
        /* Whole row flies right during "gone" */
        transition: isFlying ? "transform 420ms cubic-bezier(0.4,0,1,1), opacity 420ms ease" : "none",
        transform: isFlying ? "translateX(110%)" : "translateX(0)",
        opacity: isFlying ? 0 : 1,
      }}
      onClick={handleClick}
      role="button"
      aria-label={t("go.ariaLabel")}
    >
      {/* Sweep background */}
      <span
        aria-hidden="true"
        className="go-sweep absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: "linear-gradient(100deg, transparent 30%, rgba(244,123,58,0.18) 50%, transparent 70%)" }}
      />

      {/* Text block — fades out + slides up on collapsing */}
      <div
        className="absolute left-[58px] right-[110px] top-0 bottom-0 flex flex-col justify-center"
        style={{
          transition: "opacity 280ms ease, transform 280ms ease",
          opacity: isCollapsing ? 0 : 1,
          transform: isCollapsing ? "translateY(-8px)" : "translateY(0)",
          pointerEvents: "none",
        }}
      >
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-orange leading-none">{t("go.hiLabel")}</div>
        <div className="text-[14px] font-medium text-ink mt-0.5 overflow-hidden">
          {t("go.wantToFind")}{" "}
          <span className="inline-block h-[20px] overflow-hidden align-[-4px] min-w-[145px]">
            <ul className="go-words-rotate list-none m-0 p-0 flex flex-col">
              {rotatingWords.map((w) => (
                <li key={w} className="h-[20px] leading-[20px] font-serif italic text-ink whitespace-nowrap">{w}</li>
              ))}
              <li className="h-[20px] leading-[20px] font-serif italic text-ink whitespace-nowrap">{rotatingWords[0]}</li>
            </ul>
          </span>
        </div>
        <div className="text-[11px] font-serif italic text-ink-soft mt-0.5">
          {t("go.tagline")}
        </div>
      </div>

      {/* "Ask me" button — fades + slides right on collapsing */}
      <div
        className="absolute right-3.5 top-0 bottom-0 flex items-center"
        style={{
          transition: "opacity 280ms ease, transform 280ms ease",
          opacity: isCollapsing ? 0 : 1,
          transform: isCollapsing ? "translateX(12px)" : "translateX(0)",
          pointerEvents: "none",
        }}
      >
        <span className="inline-flex items-center gap-1.5 bg-ink text-white rounded-pill text-[12px] font-medium pl-3 pr-4 py-2">
          <IconSparkles size={13} className="text-orange" />
          {t("go.askMe")}
        </span>
      </div>

      {/* Avatar — si sposta al centro durante launching */}
      <div
        className="absolute top-0 bottom-0 flex items-center"
        style={{
          left: isLaunching ? "50%" : "14px",
          transform: isLaunching ? "translateX(-50%)" : "translateX(0)",
          transition: "left 420ms cubic-bezier(0.34,1.56,0.64,1), transform 420ms cubic-bezier(0.34,1.56,0.64,1)",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <GoAvatar size="lg" pulse />
        {/* "Let's go…" appare solo in launching */}
        <span
          style={{
            transition: "opacity 300ms ease, transform 300ms ease",
            opacity: isLaunching && !isFlying ? 1 : 0,
            transform: isLaunching && !isFlying ? "translateX(0)" : "translateX(-6px)",
            fontSize: 14,
            fontStyle: "italic",
            fontFamily: "var(--font-serif)",
            color: "var(--color-ink)",
            whiteSpace: "nowrap",
          }}
        >
          {t("go.letsGo")}
        </span>
      </div>
    </div>
  );
}

/* ─── ShortcutBar ─── */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-[4px] bg-white/15 border border-white/20 text-[10px] font-medium font-sans leading-none">
      {children}
    </kbd>
  );
}

function ShortcutBar() {
  const t = useTranslations("TripDayView");
  const alt = useAltLabel();
  return (
    <div className="flex items-center gap-4 px-3 py-2 mb-3 rounded-[var(--radius-md)] bg-ink text-white/70 text-[11px] flex-wrap">
      <span className="text-white/40 text-[10px] uppercase tracking-[0.08em] font-medium shrink-0">{t("shortcuts.title")}</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}E</Kbd> {t("shortcuts.editDay")}</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}L</Kbd> {t("shortcuts.editLodging")}</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}A</Kbd> {t("shortcuts.addActivity")}</span>
      <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> {t("shortcuts.closePanel")}</span>
    </div>
  );
}

type Props = {
  trip: Trip;
  days: Day[];
  initialActivities: Activity[];
  initialDayId: string;
  editMode?: boolean;
  debugMode?: boolean;
  reloadTick?: number;
};

export function TripDayView({ trip, days: initialDays, initialActivities, initialDayId, editMode = false, debugMode = false, reloadTick = 0 }: Props) {
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
    const day = localDays.find((d) => d.id === dayId);
    router.replace(`?day=${day?.day_number ?? 1}`, { scroll: false });
  }

  function patchDay(id: string, fields: Partial<Day>) {
    setLocalDays((prev) => prev.map((d) => d.id === id ? { ...d, ...fields } : d));
  }

  const selectedDay = localDays.find((d) => d.id === selectedDayId) ?? localDays[0];

  const { setTripContext, openGo, openGoWith, isOpen: isGoOpen, hasBeenOpened: goHasBeenOpened, registerAddToDay, unregisterAddToDay } = useTripGo();

  const goFocus = useMemo(
    () => selectedDay ? { type: "day" as const, dayNumber: selectedDay.day_number } : undefined,
    [selectedDay?.day_number],
  );

  const { context: tripContext } = useTripContext(trip.id, goFocus);

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
      const res = await fetch(`/api/trips/days/${dayId}/activities`);
      const data = await res.json();
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Ref che mantiene sempre l'ID del giorno corrente anche nelle closure Go
  const selectedDayIdRef = useRef(selectedDayId);
  useEffect(() => { selectedDayIdRef.current = selectedDayId; }, [selectedDayId]);

  // Registra il callback "Add to day" in Go
  useEffect(() => {
    registerAddToDay(async (payload) => {
      const dayId = selectedDayIdRef.current;
      const res = await fetch(`/api/trips/days/${dayId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          short_desc: payload.description,
          slot: payload.slot,
          location: payload.location ?? null,
          location_place_id: payload.locationPlaceId ?? null,
          location_lat: payload.locationLat ?? null,
          location_lng: payload.locationLng ?? null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setActivities((prev) => [...prev, created]);
      }
    });
    return () => unregisterAddToDay();
  }, [registerAddToDay, unregisterAddToDay]);

  // Reload activities when a remote change arrives (realtime)
  const prevReloadTick = useRef(reloadTick);
  useEffect(() => {
    if (reloadTick !== prevReloadTick.current && selectedDay?.id) {
      prevReloadTick.current = reloadTick;
      loadActivities(selectedDay.id);
    }
  }, [reloadTick, selectedDay?.id, loadActivities]);

  useEffect(() => {
    if (selectedDayId === initialDayId) return;
    loadActivities(selectedDayId);
  }, [selectedDayId, initialDayId, loadActivities]);

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

  return (
    /* ── Replica esatta di .daybyday dal design ── */
    <div
      className="grid gap-[18px] max-w-[1280px] mx-auto px-2 py-3 sm:px-5 sm:py-5 [grid-template-columns:1fr] md:[grid-template-columns:260px_1fr]"
    >

      {/* ══ SIDEBAR — .day-list ══════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col bg-surface rounded-[var(--radius-lg)] border border-border overflow-hidden self-start"
        style={{
          position: "sticky",
          top: 94, /* header 52px + sub-bar 42px */
          maxHeight: "calc(100vh - 94px - 24px)",
        }}
      >
        {/* .day-list-head */}
        <div className="px-[18px] pt-4 pb-3 border-b border-border shrink-0">
          <div className="text-[10px] uppercase tracking-[0.10em] text-ink-soft">{t("sidebar.itinerary")}</div>
          <div className="text-[16px] font-semibold text-ink mt-0.5">{t("sidebar.dayByDay")}</div>
          <div className="text-[12px] text-ink-soft mt-0.5">
            {t("sidebar.summary", {
              count: localDays.length,
              start: trip.start_date ? formatDate(trip.start_date) : "",
              end: trip.end_date ? formatDate(trip.end_date) : "",
            })}
          </div>
        </div>

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
                onClick={() => selectDay(d.id)}
              />
            );
          })}
        </ol>
      </aside>

      {/* ══ MAIN — .day-main ════════════════════════════════════ */}
      <section className="min-w-0">

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
            await fetch(`/api/trips/days/${selectedDayId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                city: data.subtitle,
                label: data.title,
                day_type,
                notes: data.practicalNote,
                summary: data.summary,
                image_url,
              }),
            });
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
            await fetch(`/api/trips/days/${selectedDayId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            });
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
            await fetch(`/api/trips/days/${selectedDayId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accommodation_type: null,
                accommodation_name: null,
                accommodation_address: null,
                accommodation_url: null,
                accommodation_place_id: null,
                accommodation_lat: null,
                accommodation_lng: null,
                accommodation_cost_amount: null,
                accommodation_cost_currency: null,
              }),
            });
          }}
          onPrev={prevDay ? () => selectDay(prevDay.id) : undefined}
          onNext={nextDay ? () => selectDay(nextDay.id) : undefined}
        />

        <div className="px-2 sm:px-4">

        {/* Quote — summary + practical note */}
        {(selectedDay.summary || selectedDay.notes) && (
          <Quote
            lead={selectedDay.summary ?? selectedDay.notes!}
            note={selectedDay.summary ? (selectedDay.notes ?? undefined) : undefined}
            className="mt-7"
          />
        )}

        {/* Go — trigger visibile solo se Go non è mai stato aperto */}
        {!goHasBeenOpened && <GoLaunchTrigger onLaunch={openGo} />}

        {/* Itinerary */}
        <div className={cn("mt-8 transition-opacity duration-200", loading && "opacity-40 pointer-events-none")}>
          <Itinerary
            key={selectedDayId}
            activities={activities}
            day={selectedDay}
            editMode={editMode}
            tripId={trip.id}
            externalShowAddForm={showAddForm}
            onAddFormClose={() => setShowAddForm(false)}
            onAskGo={(title, activityId) => openGoWith(`Cerca informazioni su: ${title}`, activityId)}
            initialShowMap={selectedDay.show_map}
            onToggleMap={async (show) => {
              await fetch(`/api/trips/days/${selectedDayId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ show_map: show }),
              });
            }}
            onActivitySave={async (id, data) => {
              const time = (data.hour !== undefined && data.minute !== undefined)
                ? `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`
                : null;
              // Strip cache-buster (?t=…) from hero_image before persisting
              const hero_image = data.heroImage
                ? data.heroImage.split("?")[0] || null
                : null;

              // Map ActivityStatus to database fields (booking stores all status info)
              const budget_paid = data.status === "paid";
              const booking = data.status === "booked" ? "booked" : data.status === "todo" ? "todo" : null;

              // Optimistic update
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
                    : a
                )
              );
              const res = await fetch(`/api/trips/activities/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
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
                  hero_image,
                }),
              });
              // If save was successful, reload activities to ensure status persists from DB
              if (res.ok && selectedDay?.id) {
                await loadActivities(selectedDay.id);
              }
            }}
            onActivityDelete={async (id) => {
              setActivities((prev) => prev.filter((a) => a.id !== id));
              await fetch(`/api/trips/activities/${id}`, { method: "DELETE" });
            }}
            onCreateActivity={async (data) => {
              const time = (data.hour !== undefined && data.minute !== undefined)
                ? `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`
                : null;
              // Map ActivityStatus to database fields (booking stores all status info)
              const budget_paid = data.status === "paid";
              const booking = data.status === "booked" ? "booked" : data.status === "todo" ? "todo" : null;

              const res = await fetch(`/api/trips/days/${selectedDayId}/activities`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
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
                }),
              });
              if (res.ok) {
                const created = await res.json();
                setActivities((prev) => [...prev, created]);
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
                <summary className="text-[11px] font-medium text-ink-faint cursor-pointer select-none">
                  🐛 Debug · selectedDay
                </summary>
                <pre className="mt-2 text-[11px] text-ink-soft overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedDay, null, 2)}
                </pre>
              </details>
              <details className="rounded-lg border border-dashed border-border p-3">
                <summary className="text-[11px] font-medium text-ink-faint cursor-pointer select-none">
                  🐛 Debug · activities ({activities.length})
                </summary>
                <pre className="mt-2 text-[11px] text-ink-soft overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(activities, null, 2)}
                </pre>
              </details>
              <details className="rounded-lg border border-dashed border-border p-3">
                <summary className="text-[11px] font-medium text-ink-faint cursor-pointer select-none">
                  🤖 Debug · OpenAI payload
                  <span className="ml-2 text-orange font-mono">
                    ~{promptTokens} prompt tokens · max {maxTokens} completion · ~{promptTokens + maxTokens} tot
                  </span>
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-ink-faint mb-1">Request body (DescribeDayRequest)</div>
                    <pre className="text-[11px] text-ink-soft overflow-x-auto whitespace-pre-wrap break-all bg-surface rounded p-2">
                      {JSON.stringify(aiRequest, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-ink-faint mb-1">Prompt inviato al modello</div>
                    <pre className="text-[11px] text-ink-soft overflow-x-auto whitespace-pre-wrap break-all bg-surface rounded p-2 leading-relaxed">
                      {prompt}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          );
        })()}

        </div>{/* end px-4 */}

        {/* Next day */}
        {nextDay && (
          <button
            onClick={() => selectDay(nextDay.id)}
            className="mt-8 w-full flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-md)] bg-ink text-white text-left cursor-pointer transition-opacity hover:opacity-90"
          >
            <IconArrowRightCircle className="w-7 h-7 text-orange shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] opacity-70 uppercase tracking-[0.08em]">
                {t("nextDay", { number: nextDay.day_number, dow: nextDayDow })}
              </div>
              <div className="text-[14px] font-medium mt-0.5 truncate">
                {nextDay.label ?? nextDay.city ?? ""}
              </div>
            </div>
            <IconChevronRight className="w-5 h-5 opacity-70 shrink-0" />
          </button>
        )}

      </section>
    </div>
  );
}
