"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocalStorageState, type LocalStorageCodec } from "@/lib/hooks/useLocalStorageState";
import { IconMap, IconPlus } from "@/components/ui/icons";
import { PlaceHoverCard } from "@/features/explore/PlaceHoverCard";
import { Button } from "@/components/ui/Button";
import { type RouteStop, type RouteMapHandle } from "@/components/ui/RouteMap";
import { ActivityList } from "./ActivityList";
import { ActivityRouteMap } from "./ActivityRouteMap";
import { ActivityEditForm, type ActivityData } from "./ActivityEditForm";
import { Timeline } from "./Timeline";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { DayMagazine } from "@/features/day/DayMagazine";
import { useTripGo, type GoPlace } from "@/features/go/TripGoContext";

type DayViewMode = "lista" | "timeline" | "racconto";
import type { Activity, Day } from "@/lib/dal/domain";

const LS_VIEW_MODE_KEY = "day-view-mode";

// Stored as a plain string (not JSON) for backward compatibility; falls back to
// "lista" for missing or unrecognised values.
const VIEW_MODE_CODEC: LocalStorageCodec<DayViewMode> = {
  parse: (raw) =>
    raw === "lista" || raw === "timeline" || raw === "racconto" ? raw : "lista",
  serialize: (value) => value,
};

type Props = {
  activities: Activity[];
  /** The current day — required to enable the Racconto (magazine) view */
  day?: Day | null;
  /** The day ID — required to enable the Timeline view */
  dayId?: string;
  editMode?: boolean;
  tripId?: string;
  initialShowMap?: boolean;
  onToggleMap?: (show: boolean) => void;
  onActivitySave?: (id: string, data: ActivityData) => void;
  onActivityDelete?: (id: string) => void;
  onCreateActivity?: (data: ActivityData) => void;
  /** Called after the Timeline persists an edit, so the owner can reload activities. */
  onActivitiesChange?: () => void;
  onAddActivity?: () => void;
  externalShowAddForm?: boolean;
  onAddFormClose?: () => void;
  onAskGo?: (title: string, activityId?: string) => void;
  /** Schedule a yume dropped onto the activity list at a chosen slot/time. */
  onScheduleYume?: (yumeId: string, opts: { title: string; slot: "morning" | "afternoon" | "evening" | "night"; time: string | null }) => void;
};

export function Itinerary({
  activities,
  day,
  dayId,
  editMode = false,
  tripId,
  initialShowMap = true,
  onToggleMap,
  onActivitySave,
  onActivityDelete,
  onCreateActivity,
  onActivitiesChange,
  onAddActivity,
  externalShowAddForm,
  onAddFormClose,
  onAskGo,
  onScheduleYume,
}: Props) {
  const t = useTranslations("Itinerary");
  const tMode = useTranslations("DayViewModeToggle");
  const { subscribe } = useTripGo();
  const [showMap, setShowMap] = useState(initialShowMap);
  const mapRef = useRef<RouteMapHandle>(null);
  // Index queued while the map mounts (when it was hidden at click time).
  const pendingFocusRef = useRef<number | null>(null);
  // Go-suggested place queued while the map (re)mounts: showing it may require
  // switching back to "lista" view and revealing the map first.
  const pendingCoordFocusRef = useRef<GoPlace | null>(null);
  const [internalShowAddForm, setShowAddForm] = useState(false);
  // The parent can force the form open (e.g. via the "add" keyboard shortcut);
  // OR with local state so we don't need a setState-in-effect to sync the prop.
  const showAddForm = internalShowAddForm || !!externalShowAddForm;

  // View mode: "lista" (default) | "racconto" — persisted in localStorage
  const [viewMode, setViewMode] = useLocalStorageState<DayViewMode>(
    LS_VIEW_MODE_KEY,
    "lista",
    VIEW_MODE_CODEC,
  );

  function handleToggleMap() {
    const next = !showMap;
    setShowMap(next);
    onToggleMap?.(next);
  }

  function handleAddClick() {
    setShowAddForm(true);
    onAddActivity?.();
  }

  function handleCreateSave(data: ActivityData) {
    onCreateActivity?.(data);
    setShowAddForm(false);
    onAddFormClose?.();
  }

  function handleCreateCancel() {
    setShowAddForm(false);
    onAddFormClose?.();
  }

  const sorted = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }, [activities]);

  // Map points + a lookup from activity id → its index in the points array
  // (points skip activities without coordinates, so indexes can differ).
  // mapActivities[i] is the full Activity for mapPoints[i] — used by renderPinCard.
  const { mapPoints, mapIndexById, mapActivities } = useMemo(() => {
    const points: RouteStop[] = [];
    const acts: Activity[] = [];
    const indexById = new Map<string, number>();
    for (const a of sorted) {
      if (a.location_lat == null || a.location_lng == null) continue;
      indexById.set(a.id, points.length);
      points.push({
        lat: a.location_lat,
        lng: a.location_lng,
        name: a.title,
        formatted: a.location ?? a.title,
        placeId: a.location_place_id ?? "",
        iconKey: a.icon,
        type: a.type ?? null,
        transportOut: a.bridge_out_json?.transport ?? null,
        slot: a.slot,
      });
      acts.push(a);
    }
    return { mapPoints: points, mapIndexById: indexById, mapActivities: acts };
  }, [sorted]);

  // When the map was hidden at click time, focus once it has mounted.
  useEffect(() => {
    if (!showMap || pendingFocusRef.current == null) return;
    const index = pendingFocusRef.current;
    pendingFocusRef.current = null;
    mapRef.current?.focusPoint(index);
  }, [showMap]);

  function handleActivityMapClick(activityId: string): boolean {
    const index = mapIndexById.get(activityId);
    if (index == null) return false; // no coordinates → fall back to external maps
    if (showMap) {
      mapRef.current?.focusPoint(index);
    } else {
      pendingFocusRef.current = index;
      setShowMap(true);
      onToggleMap?.(true);
    }
    return true;
  }

  // Go's "Mostra in mappa" trigger: the map only lives in "lista" view when
  // visible, so switch back and reveal it if needed, then drop the ad-hoc pin.
  const handleShowOnMap = useCallback((target: GoPlace) => {
    const mapVisibleNow = showMap && viewMode === "lista";
    if (viewMode !== "lista") setViewMode("lista");
    if (!showMap) {
      setShowMap(true);
      onToggleMap?.(true);
    }
    if (mapVisibleNow) {
      mapRef.current?.focusCoord(target.lat, target.lng, { label: target.title });
    } else {
      pendingCoordFocusRef.current = target;
    }
  }, [showMap, viewMode, setViewMode, onToggleMap]);

  useEffect(() => {
    return subscribe("place.focus", ({ place }) => handleShowOnMap(place));
  }, [subscribe, handleShowOnMap]);

  // Apply a queued Go pin once the map is back in view.
  useEffect(() => {
    if (!showMap || viewMode !== "lista" || !pendingCoordFocusRef.current) return;
    const target = pendingCoordFocusRef.current;
    pendingCoordFocusRef.current = null;
    mapRef.current?.focusCoord(target.lat, target.lng, { label: target.title });
  }, [showMap, viewMode]);

  const isRacconto = viewMode === "racconto";
  const isTimeline = viewMode === "timeline";

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-micro font-medium uppercase tracking-eyebrow-wide text-ink-faint">
          {t("title")}
        </div>
        <div className="flex items-center gap-2">
          {editMode && !isRacconto && !isTimeline && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly={false}
              onClick={handleToggleMap}
              className="gap-1.5 text-ink-soft"
            >
              <IconMap />
              {showMap ? t("hideMap") : t("showMap")}
            </Button>
          )}
          {editMode && !isRacconto && !isTimeline && (
            <Button
              variant="solid"
              tone="neutral"
              iconOnly={false}
              onClick={handleAddClick}
              disabled={showAddForm}
            >
              <IconPlus />
              {t("addActivity")}
            </Button>
          )}

          {/* View mode toggle — always rightmost, shown when day context is available */}
          {day && (
            <TabSwitcher
              value={viewMode}
              onChange={setViewMode}
              tabs={[
                { key: "lista", label: tMode("lista") },
                { key: "timeline", label: tMode("timeline") },
                { key: "racconto", label: tMode("racconto") },
              ]}
            />
          )}
        </div>
      </div>

      {/* Racconto / magazine view */}
      {isRacconto && day ? (
        <div className="-mx-4 sm:mx-0">
          <DayMagazine
            day={day}
            activities={activities}
            enabled={isRacconto}
          />
        </div>
      ) : isTimeline ? (
        <div
          className="bg-white rounded-lg p-4 flex justify-center bg-no-repeat bg-cover bg-center"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.35), rgba(255,255,255,0.35)), url(/media/timeline/timeline-city.png)" }}
        >
          <Timeline
            dayId={dayId ?? ""}
            tripId={tripId ?? ""}
            initialBlocks={activities}
            editMode={editMode}
            onMutated={onActivitiesChange}
          />
        </div>
      ) : (
        <>
          {showAddForm && (
            <ActivityEditForm
              isNew
              onSave={handleCreateSave}
              onCancel={handleCreateCancel}
              onAskGo={onAskGo}
              className="mb-4"
            />
          )}

          {showMap && (
            <ActivityRouteMap
              ref={mapRef}
              points={mapPoints}
              mapClassName="h-[308px]"
              className="mb-3"
              renderPinCard={(id, close) => {
                const idx = parseInt(id, 10);
                const activity = mapActivities[idx];
                if (!activity) return null;
                // Prefer Google enrichment when we have a real place id.
                if (activity.location_place_id) {
                  return (
                    <PlaceHoverCard
                      key={id}
                      placeId={activity.location_place_id}
                      fallbackName={activity.title}
                      onClose={close}
                    />
                  );
                }
                // Fallback: render saved activity data without a Google fetch.
                return (
                  <PlaceHoverCard
                    key={id}
                    saved={{
                      name: activity.title,
                      image: activity.hero_image ?? null,
                      description: activity.short_desc ?? null,
                      address: activity.location ?? null,
                      time: activity.time ? activity.time.slice(0, 5) : null,
                      dayLabel: null,
                      typeLabel: null,
                      url: null,
                    }}
                    fallbackName={activity.title}
                    onClose={close}
                  />
                );
              }}
            />
          )}

          <ActivityList
            activities={sorted}
            editMode={editMode}
            tripId={tripId}
            hideFuzzy
            onActivitySave={onActivitySave}
            onActivityDelete={onActivityDelete}
            onAskGo={onAskGo}
            onActivityMapClick={handleActivityMapClick}
            onScheduleYume={onScheduleYume}
          />
        </>
      )}
    </div>
  );
}
