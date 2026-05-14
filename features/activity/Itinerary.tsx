"use client";

import { useState, useMemo, useEffect } from "react";
import { IconMap, IconPlus } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { RouteMap } from "@/components/ui/RouteMap";
import { ActivityList } from "./ActivityList";
import { ActivityEditForm, type ActivityData } from "./ActivityEditForm";
import type { Activity } from "@/lib/dal/trips";
import type { PlaceResult } from "@/components/ui/AddressField";

type Props = {
  activities: Activity[];
  editMode?: boolean;
  /** Controlled: initial/persisted map visibility. Defaults to true. */
  initialShowMap?: boolean;
  /** Called when the user toggles the map — parent should persist this. */
  onToggleMap?: (show: boolean) => void;
  onActivitySave?: (id: string, data: ActivityData) => void;
  onActivityDelete?: (id: string) => void;
  /** Called after the user fills in and confirms the inline "New activity" form. */
  onCreateActivity?: (data: ActivityData) => void;
  /** @deprecated Pass onCreateActivity instead. Kept for back-compat — clicking Add will open the inline form regardless. */
  onAddActivity?: () => void;
  /** Controlled from outside — e.g. via keyboard shortcut from the parent page. */
  externalShowAddForm?: boolean;
  /** Called when the form is closed internally (Cancel or save) */
  onAddFormClose?: () => void;
};

export function Itinerary({
  activities,
  editMode = false,
  initialShowMap = true,
  onToggleMap,
  onActivitySave,
  onActivityDelete,
  onCreateActivity,
  onAddActivity,
  externalShowAddForm,
  onAddFormClose,
}: Props) {
  const [showMap, setShowMap] = useState(initialShowMap);
  const [showAddForm, setShowAddForm] = useState(false);

  // Sync external trigger
  useEffect(() => {
    if (externalShowAddForm) setShowAddForm(true);
  }, [externalShowAddForm]);

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


  /* Sort activities by time ascending */
  const sorted = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }, [activities]);

  /* Extract PlaceResult from activities that have lat/lng. */
  const mapPoints = sorted.reduce<PlaceResult[]>((acc, a) => {
    const lat = (a as any).location_lat;
    const lng = (a as any).location_lng;
    if (lat != null && lng != null) {
      acc.push({
        lat: lat as number,
        lng: lng as number,
        name: a.title,
        formatted: a.location ?? a.title,
        placeId: (a as any).location_place_id ?? "",
      });
    }
    return acc;
  }, []);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Day itinerary
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly={false}
              onClick={handleToggleMap}
              className="gap-1.5 text-ink-soft"
            >
              <IconMap />
              {showMap ? "Hide map" : "Show map"}
            </Button>
          )}
          {editMode && (
            <Button
              variant="solid"
              tone="neutral"
              iconOnly={false}
              onClick={handleAddClick}
              disabled={showAddForm}
            >
              <IconPlus />
              Add activity
            </Button>
          )}
        </div>
      </div>

      {/* Inline "New activity" form */}
      {showAddForm && (
        <ActivityEditForm
          isNew
          onSave={handleCreateSave}
          onCancel={handleCreateCancel}
          className="mb-4"
        />
      )}

      {/* Map */}
      {showMap && (
        <RouteMap
          points={mapPoints}
          travelMode="WALKING"
          className="w-full h-[280px] mb-4"
        />
      )}

      {/* Activity list */}
      <ActivityList
        activities={sorted}
        editMode={editMode}
        onActivitySave={onActivitySave}
        onActivityDelete={onActivityDelete}
      />
    </div>
  );
}
