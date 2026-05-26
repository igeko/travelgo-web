"use client";

/**
 * /trips/new — AI-guided trip creation (Brief 04 · design trips-new-v5).
 *
 * Step 1 (Blank): Go alone, centered, NO sidebar — just the hero chat.
 * The draft trip is created on the first message; from then the left column
 * appears (TripInfo + DayRail) with Go in the centre.
 *
 * Day-active (a day is selected in the DayRail): the page goes full-width
 * and splits into three — sidebar · day detail (HeroBanner + Itinerary, same
 * components as the trip day page) · Go on the right. Go stays mounted across
 * all states so the conversation is never lost.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppHeader } from "@/features/app/AppHeader";
import { GoAgentChat } from "@/features/go/GoAgentChat";
import { TripInfo } from "@/features/trip/TripInfo";
import { DayRail } from "@/features/day/DayRail";
import { HeroBanner, type HeroBannerType } from "@/features/day/HeroBanner";
import { Itinerary } from "@/features/activity/Itinerary";
import type { ActivityData } from "@/features/activity/ActivityEditForm";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import type { TripSnapshot } from "@/lib/dal";

const PLACEHOLDER_TITLE = "Nuovo viaggio";

function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const f = (iso: string) =>
    new Intl.DateTimeFormat("it", { day: "numeric", month: "short" }).format(localDate(iso));
  return `${f(start)} → ${f(end)}`;
}

function hhmm(data: ActivityData): string | null {
  return data.hour !== undefined && data.minute !== undefined
    ? `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`
    : null;
}

/** Build the entity/instance payload an activity form produces (mirrors TripDayView). */
function activityPayload(data: ActivityData) {
  const time = hhmm(data);
  const budget_paid = data.status === "paid";
  const booking = data.status === "booked" ? "booked" : data.status === "todo" ? "todo" : null;
  const hero_image = data.heroImage ? data.heroImage.split("?")[0] || null : null;
  return {
    entity: {
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
    },
    instance: { slot: data.period, time },
  };
}

export default function NewTripPage() {
  const t = useTranslations("TripDayView");
  const locale = useLocale();
  const getDow = (iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(localDate(iso)).toUpperCase();
  const fmtDate = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(localDate(iso));

  const tripIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<string> | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [initialTurns, setInitialTurns] = useState<{ role: "user" | "assistant"; content: string }[]>();
  const [selectedDayId, setSelectedDayId] = useState("");

  const refetch = useCallback(async () => {
    const id = tripIdRef.current;
    if (!id) return;
    try {
      setSnapshot(await api.trips.get(id));
    } catch {
      /* keep last snapshot on transient error */
    }
  }, []);

  const ensureTripId = useCallback(async (): Promise<string> => {
    if (tripIdRef.current) return tripIdRef.current;
    if (creatingRef.current) return creatingRef.current;
    creatingRef.current = (async () => {
      const { id } = await api.trips.create({ title: PLACEHOLDER_TITLE });
      tripIdRef.current = id;
      setTripId(id);
      window.history.replaceState(null, "", `/trips/new?draft=${id}`);
      return id;
    })();
    return creatingRef.current;
  }, []);

  // Reload recovery: rebind to ?draft=<id> and hydrate snapshot + conversation.
  useEffect(() => {
    const draft = new URLSearchParams(window.location.search).get("draft");
    if (!draft || tripIdRef.current) return;
    tripIdRef.current = draft;
    setTripId(draft);
    void refetch();
    api.go.agentHistory(draft).then((h) => setInitialTurns(h.turns)).catch(() => {});
  }, [refetch]);

  const started = tripId !== null;
  const trip = snapshot?.trip;
  const title = trip && trip.title !== PLACEHOLDER_TITLE ? trip.title : null;
  const dateRange = fmtRange(trip?.start_date ?? null, trip?.end_date ?? null);
  const days = snapshot?.days ?? [];
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  const who = trip
    ? [trip.adults_count ? `${trip.adults_count} adult${trip.adults_count !== 1 ? "i" : "o"}` : null,
       trip.children_count ? `${trip.children_count} bambin${trip.children_count !== 1 ? "i" : "o"}` : null]
        .filter(Boolean).join(" · ") || null
    : null;
  const vibe = trip?.theme_tags?.length ? trip.theme_tags.join(" · ") : (trip?.theme_description ?? null);

  // Selected day → day-active mode (full-width 3-column).
  const selectedDayNumber = selectedDayId.startsWith("day-") ? Number(selectedDayId.slice(4)) + 1 : null;
  const selectedDayData = selectedDayNumber != null ? sortedDays.find((d) => d.day_number === selectedDayNumber) ?? null : null;
  const dayActive = started && selectedDayData != null;

  // ── Activity CRUD for the day detail (same api as the trip day page) ──
  const saveActivity = async (id: string, data: ActivityData) => {
    const activity = selectedDayData?.activities.find((a) => a.id === id);
    if (!activity) return;
    const { entity, instance } = activityPayload(data);
    try {
      await api.activities.updateEntity(activity.activity_id, entity);
      await api.activities.updateInstance(id, instance);
      await refetch();
    } catch { /* a later refetch reconciles */ }
  };
  const deleteActivity = async (id: string) => {
    try { await api.activities.removeFromDay(id); await refetch(); } catch { /* ignore */ }
  };
  const createActivity = async (data: ActivityData) => {
    if (!selectedDayData) return;
    const { entity, instance } = activityPayload(data);
    try { await api.activities.addToDay(selectedDayData.id, { ...entity, ...instance }); await refetch(); } catch { /* ignore */ }
  };

  const heroEyebrow = selectedDayData ? t("day.eyebrow", { number: selectedDayData.day_number }) : "";
  const heroDow = selectedDayData?.date ? getDow(selectedDayData.date) : "";
  const heroDate = selectedDayData?.date ? fmtDate(selectedDayData.date) : "";
  const heroTitle = selectedDayData?.label ?? selectedDayData?.city ?? "";
  const heroMeta = selectedDayData ? `${heroDow} ${heroDate} · ${t("day.activityCount", { count: selectedDayData.activities.length })}` : "";

  return (
    <div className="h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        tripName={title ?? undefined}
        tripProgress={started ? (days.length ? `${days.length} giorni` : "in costruzione") : undefined}
      />

      <main
        className={cn(
          "flex-1 min-h-0 mx-auto w-full px-6 py-6 grid gap-6 grid-rows-[minmax(0,1fr)]",
          dayActive
            ? "max-w-none grid-cols-[300px_minmax(0,1fr)_minmax(360px,400px)]"
            : started
              ? "max-w-[1240px] grid-cols-[320px_minmax(0,1fr)]"
              : "max-w-[1240px] grid-cols-1",
        )}
      >
        {/* LEFT — sidebar (hidden in Blank). */}
        <aside className={cn("flex-col gap-3.5 min-h-0", started ? "flex" : "hidden")}>
          <TripInfo
            className="shrink-0"
            tripName={title}
            dateRange={dateRange}
            fields={{ where: trip?.destination ?? null, when: dateRange, who, vibe }}
          />
          {sortedDays.length > 0 && (
            <DayRail
              className="flex-1 min-h-0"
              days={sortedDays}
              selectedDayId={selectedDayId}
              onSelect={setSelectedDayId}
              startDate={trip?.start_date ?? null}
              endDate={trip?.end_date ?? null}
              header="label"
            />
          )}
        </aside>

        {/* CENTER — day detail (only in day-active; kept in DOM for stable Go mount). */}
        <div className={cn("min-w-0 min-h-0 overflow-y-auto scrollbar-thin", dayActive ? "block" : "hidden")}>
          {selectedDayData && (
            <>
              <HeroBanner
                resetKey={selectedDayId}
                eyebrow={heroEyebrow}
                title={heroTitle}
                subtitle={selectedDayData.city ?? undefined}
                summary={selectedDayData.summary ?? undefined}
                practicalNote={selectedDayData.notes ?? undefined}
                type={selectedDayData.day_type ? (selectedDayData.day_type.charAt(0).toUpperCase() + selectedDayData.day_type.slice(1)) as HeroBannerType : undefined}
                imageUrl={selectedDayData.image_url ?? undefined}
                imageUpload={{ bucket: "trip-media", path: () => `trips/${selectedDayData.trip_id}/days/${selectedDayData.id}/banner/hero.webp` }}
                meta={heroMeta}
                editMode
                onSave={async (data) => {
                  const day_type = data.type ? data.type.toLowerCase() : null;
                  const image_url = data.imageUrl ? data.imageUrl.split("?")[0] || null : null;
                  await api.days.update(selectedDayData.id, {
                    city: data.subtitle || null,
                    label: data.title || null,
                    day_type,
                    image_url,
                    summary: data.summary || null,
                    notes: data.practicalNote || null,
                  }).catch(() => {});
                  await refetch();
                }}
              />
              <div className="mt-4">
                <Itinerary
                  key={selectedDayData.id}
                  activities={selectedDayData.activities}
                  day={selectedDayData}
                  dayId={selectedDayData.id}
                  tripId={selectedDayData.trip_id}
                  editMode
                  initialShowMap={selectedDayData.show_map}
                  onToggleMap={async (show) => { await api.days.update(selectedDayData.id, { show_map: show }).catch(() => {}); }}
                  onActivitySave={saveActivity}
                  onActivityDelete={deleteActivity}
                  onCreateActivity={createActivity}
                  onActivitiesChange={refetch}
                />
              </div>
            </>
          )}
        </div>

        {/* RIGHT/CENTER — Go (always the last grid child = stable mount). */}
        <section
          className={cn(
            "min-w-0 min-h-0",
            dayActive ? "" : started ? "w-full mx-auto max-w-[720px]" : "w-full mx-auto max-w-[640px]",
          )}
        >
          <GoAgentChat
            ensureTripId={ensureTripId}
            onTurnComplete={refetch}
            initialTurns={initialTurns}
            selectedDay={selectedDayNumber}
            className="h-full"
          />
        </section>
      </main>
    </div>
  );
}
