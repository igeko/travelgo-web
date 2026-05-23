"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { ActivityRow } from "./ActivityRow";
import type { ActivityData } from "./ActivityEditForm";
import { SlotStation } from "./SlotStation";
import { SLOT_ORDER, type SlotKey } from "./types";
import { isYumeDrag, readYumeDrag } from "@/features/yumeji/yumeDrag";
import type { Activity } from "@/lib/dal/domain";

/* ── Time helpers for positional yume drops ── */
const SLOT_DEFAULT_TIME: Record<SlotKey, string> = {
  morning: "09:00",
  afternoon: "14:00",
  evening: "19:00",
  night: "22:00",
};
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmtMin = (min: number) => {
  const c = Math.max(0, Math.min(23 * 60 + 59, min));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};
/** Time for a slot at a drop position between neighbors. */
function timeBetween(prev: string | null, next: string | null, slot: SlotKey): string {
  if (prev && next) return fmtMin(Math.floor((toMin(prev) + toMin(next)) / 2));
  if (prev) return fmtMin(toMin(prev) + 90);
  if (next) return fmtMin(toMin(next) - 30);
  return SLOT_DEFAULT_TIME[slot];
}

type Props = {
  activities: Activity[];
  editMode?: boolean;
  tripId?: string;
  /** When true, fuzzy activities (timeline-only stops without a fixed time) are hidden. */
  hideFuzzy?: boolean;
  /** Show the time-of-day reference colour line next to each slot heading. */
  showSlotColors?: boolean;
  onActivitySave?: (id: string, data: ActivityData) => void;
  onActivityDelete?: (id: string) => void;
  onAskGo?: (title: string, activityId?: string) => void;
  /** Click on a row's "Map" badge. Return true if handled in-app (zoomed). */
  onActivityMapClick?: (activityId: string) => boolean | void;
  /** Schedule a yume dropped onto the list at a chosen slot/time. When set,
   *  rows become drop targets (top/bottom half = insert before/after). */
  onScheduleYume?: (yumeId: string, opts: { title: string; slot: SlotKey; time: string | null }) => void;
};

/* ── Row wrapper that accepts a yume drop (top/bottom half) ── */
function YumeRowDrop({
  active,
  onOver,
  onLeave,
  onDropEdge,
  children,
}: {
  active: "top" | "bottom" | null;
  onOver: (edge: "top" | "bottom") => void;
  onLeave: () => void;
  onDropEdge: (edge: "top" | "bottom", e: React.DragEvent) => void;
  children: ReactNode;
}) {
  const edgeFor = (e: React.DragEvent): "top" | "bottom" => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientY < r.top + r.height / 2 ? "top" : "bottom";
  };
  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (!isYumeDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        onOver(edgeFor(e));
      }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) onLeave(); }}
      onDrop={(e) => {
        if (!isYumeDrag(e.dataTransfer)) return;
        e.preventDefault();
        onDropEdge(edgeFor(e), e);
      }}
    >
      {active === "top" && <span aria-hidden className="absolute left-0 right-0 -top-px h-0.5 bg-orange rounded-full z-10" />}
      {active === "bottom" && <span aria-hidden className="absolute left-0 right-0 -bottom-px h-0.5 bg-orange rounded-full z-10" />}
      {children}
    </div>
  );
}

export function ActivityList({
  activities,
  editMode = false,
  tripId,
  hideFuzzy = false,
  showSlotColors = true,
  onActivitySave,
  onActivityDelete,
  onAskGo,
  onActivityMapClick,
  onScheduleYume,
}: Props) {
  const t = useTranslations("ActivityList");
  const [dropTarget, setDropTarget] = useState<{ id: string; edge: "top" | "bottom" } | null>(null);
  const [emptyOver, setEmptyOver] = useState(false);

  const canDropYume = editMode && !!onScheduleYume;

  const visibleActivities = hideFuzzy
    ? activities.filter((a) => !a.fuzzy)
    : activities;

  function scheduleYume(row: Activity, edge: "top" | "bottom", slotActs: Activity[], slot: SlotKey, e: React.DragEvent) {
    const payload = readYumeDrag(e.dataTransfer);
    setDropTarget(null);
    if (!payload || !onScheduleYume) return;
    const idx = slotActs.findIndex((x) => x.id === row.id);
    const prev = edge === "top" ? slotActs[idx - 1] : slotActs[idx];
    const next = edge === "top" ? slotActs[idx] : slotActs[idx + 1];
    const time = timeBetween(prev?.time ?? null, next?.time ?? null, slot);
    onScheduleYume(payload.id, { title: payload.title, slot, time });
  }

  function renderRow(a: Activity) {
    // Determine status based on activity state
    // Priority: budget_paid > booking (explicit status) > budget_amount
    let status: "paid" | "booked" | "todo" | undefined;
    if (a.budget_paid) {
      status = "paid";
    } else if (a.booking === "booked" || a.booking === true) {
      status = "booked";
    } else if (a.booking === "todo") {
      status = "todo";
    } else if (a.budget_amount) {
      status = "todo";
    }

    return (
      <ActivityRow
        key={a.id}
        time={a.time ?? ""}
        title={a.title}
        description={a.short_desc ?? undefined}
        location={a.location ?? undefined}
        placeId={a.location_place_id ?? undefined}
        lat={a.location_lat}
        lng={a.location_lng}
        icon={a.icon}
        thumb={a.hero_image ?? undefined}
        cost={a.budget_amount ? `¥${a.budget_amount.toLocaleString("en-US")}` : undefined}
        status={status}
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
          status: status ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          enrichedPlace: (a.place_enriched as any) ?? null,
          heroImage: a.hero_image ?? null,
        }}
        onSave={(data) => onActivitySave?.(a.id, data)}
        onDelete={() => onActivityDelete?.(a.id)}
        onAskGo={onAskGo}
        onMapClick={onActivityMapClick ? () => onActivityMapClick(a.id) : undefined}
        editLabel={t("edit")}
        unscheduleLabel={t("unschedule")}
        unscheduleConfirmLabel={t("unscheduleConfirm")}
        cancelLabel={t("cancel")}
      />
    );
  }

  /** Wrap a row as a yume drop target when scheduling is enabled. */
  function rowWithDrop(a: Activity, slotActs: Activity[], slot: SlotKey) {
    if (!canDropYume) return renderRow(a);
    return (
      <YumeRowDrop
        key={a.id}
        active={dropTarget?.id === a.id ? dropTarget.edge : null}
        onOver={(edge) => setDropTarget({ id: a.id, edge })}
        onLeave={() => setDropTarget((d) => (d?.id === a.id ? null : d))}
        onDropEdge={(edge, e) => scheduleYume(a, edge, slotActs, slot, e)}
      >
        {renderRow(a)}
      </YumeRowDrop>
    );
  }

  if (visibleActivities.length === 0) {
    return (
      <div
        onDragOver={(e) => { if (isYumeDrag(e.dataTransfer)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setEmptyOver(true); } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setEmptyOver(false); }}
        onDrop={(e) => {
          const payload = readYumeDrag(e.dataTransfer);
          setEmptyOver(false);
          if (!payload || !onScheduleYume) return;
          e.preventDefault();
          onScheduleYume(payload.id, { title: payload.title, slot: "morning", time: SLOT_DEFAULT_TIME.morning });
        }}
        className={cn(
          "text-ink-soft text-[14px] text-center py-12 rounded-md transition-colors",
          emptyOver && "outline-2 outline-dashed outline-orange/50 -outline-offset-2 bg-orange/[0.04]",
        )}
      >
        {t("empty")}
      </div>
    );
  }

  return (
    <div>
      {SLOT_ORDER.map((slot) => {
        const acts = visibleActivities.filter((a) => a.slot === slot);
        if (!acts.length) return null;
        return (
          <div key={slot}>
            <SlotStation
              label={t(`slots.${slot}`)}
              count={acts.length}
              slot={slot}
              showSlotColor={showSlotColors}
            />
            {acts.map((a) => rowWithDrop(a, acts, slot))}
          </div>
        );
      })}
      {visibleActivities.filter((a) => !a.slot).map((a) => (
        <div key={`unslotted-${a.id}`}>
          <SlotStation label={t("slots.unslotted")} count={1} />
          {renderRow(a)}
        </div>
      ))}
    </div>
  );
}
