"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  tripId?: string;
  initialShowMap?: boolean;
  onToggleMap?: (show: boolean) => void;
  onActivitySave?: (id: string, data: ActivityData) => void;
  onActivityDelete?: (id: string) => void;
  onCreateActivity?: (data: ActivityData) => void;
  onAddActivity?: () => void;
  externalShowAddForm?: boolean;
  onAddFormClose?: () => void;
  onAskGo?: (title: string, activityId?: string) => void;
};

export function Itinerary({
  activities,
  editMode = false,
  tripId,
  initialShowMap = true,
  onToggleMap,
  onActivitySave,
  onActivityDelete,
  onCreateActivity,
  onAddActivity,
  externalShowAddForm,
  onAddFormClose,
  onAskGo,
}: Props) {
  const t = useTranslations("Itinerary");
  const [showMap, setShowMap] = useState(initialShowMap);
  const [showAddForm, setShowAddForm] = useState(false);

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

  const sorted = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }, [activities]);

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
          {t("title")}
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
              {showMap ? t("hideMap") : t("showMap")}
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
              {t("addActivity")}
            </Button>
          )}
        </div>
      </div>

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
          points={mapPoints}
          travelMode="WALKING"
          className="w-full h-[280px] mb-4"
        />
      )}

      <ActivityList
        activities={sorted}
        editMode={editMode}
        tripId={tripId}
        onActivitySave={onActivitySave}
        onActivityDelete={onActivityDelete}
        onAskGo={onAskGo}
      />
    </div>
  );
}
