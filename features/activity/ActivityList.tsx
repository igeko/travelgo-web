"use client";

import { useTranslations } from "next-intl";
import { ActivityRow } from "./ActivityRow";
import { ActivityEditForm, type ActivityData } from "./ActivityEditForm";
import { SlotStation } from "./SlotStation";
import type { Activity } from "@/lib/dal/trips";

const SLOT_ORDER = ["morning", "afternoon", "evening", "night"];

type Props = {
  activities: Activity[];
  editMode?: boolean;
  tripId?: string;
  onActivitySave?: (id: string, data: ActivityData) => void;
  onActivityDelete?: (id: string) => void;
  onAskGo?: (title: string, activityId?: string) => void;
};

export function ActivityList({
  activities,
  editMode = false,
  tripId,
  onActivitySave,
  onActivityDelete,
  onAskGo,
}: Props) {
  const t = useTranslations("ActivityList");

  function renderRow(a: Activity) {
    return (
      <ActivityRow
        key={a.id}
        time={a.time ?? ""}
        title={a.title}
        description={a.short_desc ?? undefined}
        location={a.location ?? undefined}
        thumb={a.hero_image ?? undefined}
        cost={a.budget_amount ? `¥${a.budget_amount.toLocaleString()}` : undefined}
        status={a.budget_paid ? "paid" : undefined}
        href={a.url ?? "#"}
        editMode={editMode}
        activityId={a.id}
        tripId={tripId}
        initialData={{
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
          status: a.budget_paid ? "paid" : null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          enrichedPlace: (a.place_enriched as any) ?? null,
          heroImage: a.hero_image ?? null,
        }}
        onSave={(data) => onActivitySave?.(a.id, data)}
        onDelete={() => onActivityDelete?.(a.id)}
        onAskGo={onAskGo}
      />
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-ink-soft text-[14px] text-center py-12">
        {t("empty")}
      </p>
    );
  }

  return (
    <div>
      {SLOT_ORDER.map((slot) => {
        const acts = activities.filter((a) => a.slot === slot);
        if (!acts.length) return null;
        return (
          <div key={slot}>
            <SlotStation label={t(`slots.${slot}`)} count={acts.length} />
            {acts.map(renderRow)}
          </div>
        );
      })}
      {activities.filter((a) => !a.slot).map((a) => (
        <div key={`unslotted-${a.id}`}>
          <SlotStation label={t("slots.unslotted")} count={1} />
          {renderRow(a)}
        </div>
      ))}
    </div>
  );
}
