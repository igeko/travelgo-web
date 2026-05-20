"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocalStorageState, type LocalStorageCodec } from "@/lib/hooks/useLocalStorageState";
import { IconMap, IconPlus } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { RouteMap, type RouteStop, type RouteMapHandle } from "@/components/ui/RouteMap";
import { ActivityList } from "./ActivityList";
import { ActivityEditForm, type ActivityData } from "./ActivityEditForm";
import { Timeline } from "./Timeline";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { DayMagazine } from "@/features/day/DayMagazine";

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
}: Props) {
  const t = useTranslations("Itinerary");
  const tMode = useTranslations("DayViewModeToggle");
  const [showMap, setShowMap] = useState(initialShowMap);
  const mapRef = useRef<RouteMapHandle>(null);
  // Index queued while the map mounts (when it was hidden at click time).
  const pendingFocusRef = useRef<number | null>(null);
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
  const { mapPoints, mapIndexById } = useMemo(() => {
    const points: RouteStop[] = [];
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
      });
    }
    return { mapPoints: points, mapIndexById: indexById };
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
            <RouteMap
              ref={mapRef}
              points={mapPoints}
              travelMode="WALKING"
              className="w-full h-[280px] mb-4"
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
          />
        </>
      )}
    </div>
  );
}
