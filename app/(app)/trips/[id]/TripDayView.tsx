"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAltLabel } from "@/lib/hooks/useOS";
import { useShortcuts } from "@/lib/hooks/useShortcut";
import { useRouter } from "next/navigation";
import { HeroBanner, type HeroBannerType, type LodgingType, type HeroBannerHandle } from "@/features/day/HeroBanner";
import { IconArrowRightCircle, IconChevronRight } from "@/components/ui/icons";
import { Quote } from "@/components/ui/Quote";
import { Itinerary } from "@/features/activity/Itinerary";
import { DayItem } from "@/features/day/DayItem";
import { cn } from "@/lib/cn";
import type { Trip, Day, Activity } from "@/lib/dal/trips";

/* ─── helpers ─── */
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_IT[m - 1]} ${y}`;
}

function localDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
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
  const alt = useAltLabel();
  return (
    <div className="flex items-center gap-4 px-3 py-2 mb-3 rounded-[var(--radius-md)] bg-ink text-white/70 text-[11px] flex-wrap">
      <span className="text-white/40 text-[10px] uppercase tracking-[0.08em] font-medium shrink-0">Shortcuts</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}E</Kbd> Edit day</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}L</Kbd> Edit lodging</span>
      <span className="flex items-center gap-1.5"><Kbd>{alt}A</Kbd> Add activity</span>
      <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> Close panel</span>
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
};

export function TripDayView({ trip, days: initialDays, initialActivities, initialDayId, editMode = false, debugMode = false }: Props) {
  const router = useRouter();
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

  useEffect(() => {
    if (selectedDayId === initialDayId) return;
    loadActivities(selectedDayId);
  }, [selectedDayId, initialDayId, loadActivities]);

  /* ─── Hero content ─── */
  const heroDow = selectedDay.date ? DOW_EN[localDate(selectedDay.date).getDay()] : "";
  const heroDate = selectedDay.date ? formatDate(selectedDay.date) : "";
  const heroEyebrow = `Day ${selectedDay.day_number}`;
  const heroTitle = selectedDay.label ?? selectedDay.city ?? "";
  const heroMeta = `${heroDow} ${heroDate} · ${activities.length} activities`;

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
  const nextDayDate = nextDay?.date ? localDate(nextDay.date) : null;
  const nextDayDow = nextDayDate ? DOW_EN[nextDayDate.getDay()] : "";

  return (
    /* ── Replica esatta di .daybyday dal design ── */
    <div
      className="grid gap-[18px] max-w-[1280px] mx-auto px-5 py-5 [grid-template-columns:1fr] md:[grid-template-columns:260px_1fr]"
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
          <div className="text-[10px] uppercase tracking-[0.10em] text-ink-soft">Itinerary</div>
          <div className="text-[16px] font-semibold text-ink mt-0.5">Day by day</div>
          <div className="text-[12px] text-ink-soft mt-0.5">
            {localDays.length} days · {trip.start_date ? formatDate(trip.start_date) : ""} → {trip.end_date ? formatDate(trip.end_date) : ""}
          </div>
        </div>

        {/* .day-items — lista scrollabile */}
        <ol className="m-0 p-0 py-1.5 pl-1 list-none flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {localDays.map((d) => {
            const date = d.date ? localDate(d.date) : null;
            return (
              <DayItem
                key={d.id}
                id={`day-${d.day_number - 1}`}
                dow={date ? DOW_EN[date.getDay()] : ""}
                dayNumber={date ? date.getDate() : d.day_number}
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
          meta={heroMeta}
          subBanner={lodging}
          editMode={editMode}
          onSave={async (data) => {
            const day_type = data.type ? data.type.toLowerCase() : null;
            patchDay(selectedDayId, {
              city: data.subtitle || null,
              label: data.title || null,
              day_type,
              notes: data.practicalNote || null,
              summary: data.summary || null,
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

        <div className="px-4">

        {/* Quote — summary + practical note */}
        {(selectedDay.summary || selectedDay.notes) && (
          <Quote
            lead={selectedDay.summary ?? selectedDay.notes!}
            note={selectedDay.summary ? (selectedDay.notes ?? undefined) : undefined}
            className="mt-7"
          />
        )}

        {/* Itinerary */}
        <div className={cn("mt-8 transition-opacity duration-200", loading && "opacity-40 pointer-events-none")}>
          <Itinerary
            key={selectedDayId}
            activities={activities}
            editMode={editMode}
            externalShowAddForm={showAddForm}
            onAddFormClose={() => setShowAddForm(false)}
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
                        budget_paid: data.status === "paid",
                      }
                    : a
                )
              );
              await fetch(`/api/trips/activities/${id}`, {
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
                  budget_paid: data.status === "paid",
                }),
              });
            }}
            onActivityDelete={async (id) => {
              setActivities((prev) => prev.filter((a) => a.id !== id));
              await fetch(`/api/trips/activities/${id}`, { method: "DELETE" });
            }}
            onCreateActivity={async (data) => {
              const time = (data.hour !== undefined && data.minute !== undefined)
                ? `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`
                : null;
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
                  budget_paid: data.status === "paid",
                }),
              });
              if (res.ok) {
                const created = await res.json();
                setActivities((prev) => [...prev, created]);
              }
            }}
          />
        </div>

        {/* Debug — day + activities JSON */}
        {debugMode && (
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
          </div>
        )}

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
                Tomorrow · Day {nextDay.day_number} · {nextDayDow}
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
