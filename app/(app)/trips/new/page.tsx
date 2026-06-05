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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppHeader } from "@/features/app/AppHeader";
import { useUser } from "@/features/app/UserContext";
import { GoAgentChat } from "@/features/go/GoAgentChat";
import { TripInfo } from "@/features/trip/TripInfo";
import { TripPanel } from "@/features/trip/TripPanel";
import { DayRail } from "@/features/day/DayRail";
import { Itinerary } from "@/features/activity/Itinerary";
import { IconList, IconMap } from "@/components/ui/icons";
import type { ActivityData } from "@/features/activity/ActivityEditForm";
import { ExploreMap } from "@/features/explore/ExploreMap";
import { selectNightRoute } from "@/lib/explore/nightRoute";
import type { LatLng, MapMarker } from "@/components/ui/Map";
import { api } from "@/lib/client";
import type { GoPendingAction } from "@/lib/client/go";
import { cn } from "@/lib/cn";
import type { TripSnapshot } from "@/lib/dal";

const PLACEHOLDER_TITLE = "Nuovo viaggio";

/** Rome — fallback map center when the trip has no geocoded stops yet. */
const FALLBACK_CENTER: LatLng = { lat: 41.9028, lng: 12.4964 };

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
  const { user, isLoggedIn, isDev, isTester } = useUser();
  const getDow = (iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(localDate(iso)).toUpperCase();
  const fmtDate = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(localDate(iso));

  const tripIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<string> | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [initialTurns, setInitialTurns] = useState<{ role: "user" | "assistant"; content: string; pending?: GoPendingAction[] }[]>();
  const [selectedDayId, setSelectedDayId] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mapMode, setMapMode] = useState(false);

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

  // Persist the selected day in the URL so a reload restores day-active mode.
  const selectDay = useCallback((dayId: string) => {
    setSelectedDayId(dayId);
    const params = new URLSearchParams(window.location.search);
    if (dayId) params.set("day", dayId);
    else params.delete("day");
    window.history.replaceState(null, "", `/trips/new?${params.toString()}`);
  }, []);

  // Reload recovery: rebind to ?draft=<id> and hydrate snapshot + conversation.
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const draft = search.get("draft");
    if (!draft || tripIdRef.current) return;
    tripIdRef.current = draft;
    setTripId(draft);
    const day = search.get("day");
    if (day) setSelectedDayId(day);
    void refetch();
    api.go.agentHistory(draft).then((h) => setInitialTurns(h.turns)).catch(() => {});
  }, [refetch]);

  const started = tripId !== null;
  const trip = snapshot?.trip;
  const title = trip && trip.title !== PLACEHOLDER_TITLE ? trip.title : null;
  const dateRange = fmtRange(trip?.start_date ?? null, trip?.end_date ?? null);
  const days = snapshot?.days ?? [];
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  // Signatures of activities already on the trip, so Go's proposal cards show
  // "Aggiunta" (and survive a reload) instead of re-offering the add button.
  const existingActivityKeys = new Set(
    days.flatMap((d) => d.activities.map((a) => `${d.day_number}:${a.title.trim().toLowerCase()}`)),
  );

  const who = trip
    ? [trip.adults_count ? `${trip.adults_count} adult${trip.adults_count !== 1 ? "i" : "o"}` : null,
       trip.children_count ? `${trip.children_count} bambin${trip.children_count !== 1 ? "i" : "o"}` : null]
        .filter(Boolean).join(" · ") || null
    : null;
  const vibe = trip?.theme_tags?.length ? trip.theme_tags.join(" · ") : (trip?.theme_description ?? null);

  // Selected day → day-active mode (full-width 3-column).
  // DayRail emits the day UUID (same contract as the trip day page).
  const selectedDayData = selectedDayId ? sortedDays.find((d) => d.id === selectedDayId) ?? null : null;
  const selectedDayNumber = selectedDayData?.day_number ?? null;
  // Map mode wins over the day detail: when on, the centre column is the map.
  const dayActive = started && selectedDayData != null && !mapMode;

  // Map center: averaged trip stops → geocoded destination → fallback. The
  // geocode runs eagerly below so the value is usually ready before map mode is
  // opened — ExploreMap seeds its center once at mount and never re-centers.
  const stopPoints = useMemo<LatLng[]>(
    () =>
      (snapshot?.days ?? [])
        .map((d) => (d.accommodation_lat != null && d.accommodation_lng != null
          ? { lat: d.accommodation_lat, lng: d.accommodation_lng } : null))
        .filter((p): p is LatLng => p != null),
    [snapshot],
  );
  const nightRoute = useMemo(() => selectNightRoute(snapshot?.days ?? []), [snapshot]);

  // Every located activity of the trip → a pin on the map.
  const activityMarkers = useMemo<MapMarker[]>(
    () =>
      (snapshot?.days ?? []).flatMap((d) =>
        d.activities
          .filter((a) => a.location_lat != null && a.location_lng != null)
          .map((a) => ({ id: a.id, lat: a.location_lat as number, lng: a.location_lng as number, title: a.title })),
      ),
    [snapshot],
  );

  const [destGeo, setDestGeo] = useState<LatLng | null>(null);
  const destination = trip?.destination ?? null;
  useEffect(() => {
    if (!destination || stopPoints.length > 0) return;
    let cancelled = false;
    api.places
      .photoSearch<{ lat?: number; lng?: number }>(destination)
      .then((p) => { if (!cancelled && p && (p.lat || p.lng)) setDestGeo({ lat: p.lat as number, lng: p.lng as number }); })
      .catch(() => { /* keep the fallback center */ });
    return () => { cancelled = true; };
  }, [destination, stopPoints.length]);

  const mapCenter = useMemo<LatLng>(() => {
    // Prefer the activity pins, then the accommodation stops, then the geocoded
    // destination. ExploreMap also fit-bounds the markers, so this seeds the
    // view right on the pins from the first paint.
    const pts: LatLng[] = activityMarkers.length > 0
      ? activityMarkers.map((m) => ({ lat: m.lat, lng: m.lng }))
      : stopPoints;
    if (pts.length > 0) {
      return {
        lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
        lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
      };
    }
    return destGeo ?? FALLBACK_CENTER;
  }, [activityMarkers, stopPoints, destGeo]);
  const mapZoom = activityMarkers.length > 0 || stopPoints.length > 0 ? 12 : destGeo ? 9 : 6;

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
        isLoggedIn={isLoggedIn}
        initials={user?.initials ?? ""}
        avatarUrl={user?.avatarUrl ?? ""}
        fullName={user?.fullName ?? ""}
        isDev={isDev}
        isTester={isTester}
      />

      <main
        className={cn(
          "flex-1 min-h-0 mx-auto w-full px-6 py-6 grid gap-6 grid-rows-[minmax(0,1fr)]",
          mapMode
            ? sidebarCollapsed
              ? "max-w-none grid-cols-[76px_minmax(0,1fr)_minmax(340px,420px)]"
              : "max-w-none grid-cols-[320px_minmax(0,1fr)_minmax(340px,420px)]"
            : dayActive
              ? sidebarCollapsed
                ? "max-w-none grid-cols-[76px_minmax(0,1fr)_minmax(0,1fr)]"
                : "max-w-none grid-cols-[2fr_5fr_5fr]"
              : started
                ? sidebarCollapsed
                  ? "max-w-[1240px] grid-cols-[76px_minmax(0,1fr)]"
                  : "max-w-[1240px] grid-cols-[320px_minmax(0,1fr)]"
                : "max-w-[1240px] grid-cols-1",
        )}
      >
        {/* LEFT — sidebar (hidden in Blank, collapsible to a thin rail). */}
        <aside className={cn("flex-col gap-3.5 min-h-0", started ? "flex" : "hidden", mapMode && "order-1")}>
          {sidebarCollapsed ? (
            <>
              <TripInfo
                className="shrink-0"
                collapsed
                collapsedOrientation="vertical"
                tripName={title}
                dateRange={dateRange}
                fields={{ where: trip?.destination ?? null, when: dateRange, who, vibe }}
                onToggleCollapse={() => setSidebarCollapsed(false)}
              />
              <button
                type="button"
                onClick={() => setMapMode((v) => !v)}
                aria-pressed={mapMode}
                title={mapMode ? "Itinerario" : "Mappa"}
                className={cn(
                  "shrink-0 flex items-center justify-center rounded-lg border py-2.5 transition-colors",
                  mapMode ? "border-ink bg-ink text-white" : "border-border bg-surface text-ink-soft hover:text-ink",
                )}
              >
                {mapMode ? <IconList size={18} /> : <IconMap size={18} />}
              </button>
              {sortedDays.length > 0 && (
                <DayRail
                  className="flex-1 min-h-0"
                  days={sortedDays}
                  selectedDayId={selectedDayId}
                  onSelect={selectDay}
                  startDate={trip?.start_date ?? null}
                  endDate={trip?.end_date ?? null}
                  collapsed
                  onToggleCollapse={() => setSidebarCollapsed(false)}
                  header="label"
                />
              )}
            </>
          ) : (
            <>
              <div className="shrink-0 flex rounded-md border border-border bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setMapMode(false)}
                  aria-pressed={!mapMode}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-mini font-medium transition-colors",
                    !mapMode ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
                  )}
                >
                  <IconList size={15} /> Itinerario
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode(true)}
                  aria-pressed={mapMode}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-mini font-medium transition-colors",
                    mapMode ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
                  )}
                >
                  <IconMap size={15} /> Mappa
                </button>
              </div>
              <TripPanel
                className="flex-1"
                tripName={title}
                dateRange={dateRange}
                fields={{ where: trip?.destination ?? null, when: dateRange, who, vibe }}
                days={sortedDays}
                onSelect={selectDay}
                onToggleSidebar={() => setSidebarCollapsed(true)}
              />
            </>
          )}
        </aside>

        {/* CENTER — day detail (only in day-active; kept in DOM for stable Go mount). */}
        <div className={cn("min-w-0 min-h-0 overflow-y-auto scrollbar-thin", dayActive ? "block" : "hidden")}>
          {selectedDayData && (
            <>
              <header className="flex flex-col gap-1.5">
                <div className="text-micro font-semibold uppercase tracking-eyebrow-wide text-primary">{heroEyebrow}</div>
                <h2 className="font-serif text-2xl leading-tight text-ink">{heroTitle || "—"}</h2>
                {selectedDayData.label && selectedDayData.city && (
                  <div className="text-meta text-ink-soft">{selectedDayData.city}</div>
                )}
                {heroMeta && <div className="text-tiny text-ink-faint">{heroMeta}</div>}
                {selectedDayData.summary && (
                  <p className="mt-2 text-meta leading-relaxed text-ink-soft">{selectedDayData.summary}</p>
                )}
                {selectedDayData.notes && (
                  <p className="mt-1 text-mini italic leading-relaxed text-ink-faint">{selectedDayData.notes}</p>
                )}
              </header>
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

        {/* GO — kept the 3rd grid child in every mode so it never remounts and
            the conversation survives. In map mode it slides into the middle
            column (next to the days); otherwise it's right/centre. */}
        <section
          className={cn(
            "min-w-0 min-h-0",
            mapMode && "order-3",
            dayActive || mapMode ? "" : started ? "w-full mx-auto max-w-[720px]" : "w-full mx-auto max-w-[640px]",
          )}
        >
          <GoAgentChat
            ensureTripId={ensureTripId}
            onTurnComplete={refetch}
            initialTurns={initialTurns}
            selectedDay={selectedDayNumber}
            existingKeys={existingActivityKeys}
            className="h-full"
          />
        </section>

        {/* MAP — last grid child, shown only in map mode (auto-places in the
            last column). Always rendered so Go keeps its stable DOM slot. */}
        <div className={cn("min-w-0 min-h-0 overflow-hidden rounded-lg border border-border", mapMode ? "block order-2" : "hidden")}>
          {mapMode && started && tripId && (
            <ExploreMap
              tripId={tripId}
              center={mapCenter}
              zoom={mapZoom}
              nightRoute={nightRoute}
              extraMarkers={activityMarkers}
            />
          )}
        </div>
      </main>
    </div>
  );
}
