"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { IconCheck, IconGripVertical, IconPencil, IconPlus, IconTrash, IconX } from "@/components/ui/icons";
import { TimeField } from "@/components/ui/TimeField";
import { ActivitySearchField } from "@/features/activity/ActivitySearchField";
import { ActivityRouteMap } from "@/features/activity/ActivityRouteMap";
import type { RouteStop, RouteMapHandle } from "@/components/ui/RouteMap";
import type { TripActivityOption } from "@/features/activity/types";

/* ─────────────────────────────────────────────────────────────────
   DayActivitiesEditForm · the activity-list section of DayEditForm.
   Dense list (time + title). Adding is a lightweight inline row (title
   via ActivitySearchField + TimeField). Editing opens the full editor
   (provided by the host via `editorFor`) inline below the row; without
   `editorFor` it falls back to the lightweight inline edit.

   Controlled: parent owns `activities` + `onChange` (add / delete).
───────────────────────────────────────────────────────────────── */

export type DayActivity = {
  id: string;
  /** "HH:MM" or null when no specific time. */
  time: string | null;
  title: string;
  /** Linked trip activity (yume) id when picked from the list; null = free text. */
  activityId?: string | null;
  /** Coordinates + label — drive the route map (rows without them are off-map). */
  lat?: number | null;
  lng?: number | null;
  location?: string | null;
};

export type DayActivitiesEditFormProps = {
  activities: DayActivity[];
  onChange: (next: DayActivity[]) => void;
  /** Trip id for the title autocomplete (fetches the trip's activities). */
  tripId?: string;
  /** Pre-supplied activities for the autocomplete (tests / sandbox). */
  items?: TripActivityOption[];
  /**
   * Render the detailed editor for a row, inline below it. When provided,
   * the pencil opens this (e.g. the full ActivityEditForm) instead of the
   * lightweight inline edit.
   */
  editorFor?: (id: string, close: () => void) => ReactNode;
  /** Day's "show map on the day page" flag. When the change handler is given,
   *  a checkbox under the map persists it. */
  showMapOnDay?: boolean;
  onShowMapOnDayChange?: (value: boolean) => void;
  /** "list" (default) shows the editable rows; "timeline" renders `timelineSlot`
   *  on the right instead — same map/checkbox/layout. */
  mode?: "list" | "timeline";
  /** Right-column content for `mode="timeline"` (e.g. the Timeline component). */
  timelineSlot?: ReactNode;
  /** Tailwind `top-*` class for the sticky map (clear a fixed header). Default `md:top-4`. */
  mapStickyTop?: string;
  className?: string;
};

type Insertion =
  | { kind: "none" }
  | { kind: "after"; index: number }
  | { kind: "edit"; index: number };

type Draft = { time: string | null; title: string; activityId: string | null };

function genId(): string {
  return `da-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmtMin = (min: number) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, min));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};

/** Midpoint between two times, or +90min after `prev`, or 09:00. (insert default) */
function nextTime(prev: string | null | undefined, next: string | null | undefined): string {
  if (prev && next) return fmtMin(Math.floor((toMin(prev) + toMin(next)) / 2));
  if (prev) return fmtMin(toMin(prev) + 90);
  return "09:00";
}

/** Time to give a dragged row so the time-sorted order matches its drop slot:
 *  midpoint between neighbors, or just outside the edge, or keep when alone. */
function timeForDrop(prev: string | null, next: string | null, fallback: string | null): string | null {
  if (prev && next) return fmtMin(Math.floor((toMin(prev) + toMin(next)) / 2));
  if (prev) return fmtMin(toMin(prev) + 60);
  if (next) return fmtMin(toMin(next) - 60);
  return fallback;
}

/* ── Editorial header — same pattern as trip-edit panes ── */
function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium m-0">{eyebrow}</p>
      <h2 className="font-serif italic text-[22px] text-ink font-medium leading-tight m-0 mt-1">{title}</h2>
      <p className="font-serif italic text-meta text-ink-faint mt-1">{sub}</p>
    </div>
  );
}

/* ── Read-only row ── */
function ActivityRow({
  activity,
  dim,
  selected,
  dragging,
  armed,
  dropEdge,
  pin,
  editLabel,
  deleteLabel,
  reorderLabel,
  onArm,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onFocusMap,
  onEdit,
  onDelete,
}: {
  activity: DayActivity;
  dim?: boolean;
  selected?: boolean;
  dragging?: boolean;
  armed?: boolean;
  dropEdge?: "top" | "bottom" | null;
  /** 1-based marker number when the row is on the map. */
  pin?: number | null;
  editLabel: string;
  deleteLabel: string;
  reorderLabel: string;
  onArm: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onFocusMap?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable={armed}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative grid grid-cols-[14px_52px_1fr_auto] gap-3 items-center py-2.5",
        "border-b border-border/70 last:border-b-0",
        "hover:bg-ink/[0.02] hover:rounded-md hover:border-transparent",
        "hover:-mx-2.5 hover:px-2.5 transition-[background-color,padding,margin] duration-100",
        selected && "bg-ink/[0.03] rounded-md -mx-2.5 px-2.5 border-transparent",
        dragging && "opacity-40",
        dim && "opacity-50",
      )}
    >
      {/* Drop indicator */}
      {dropEdge === "top" && <span aria-hidden className="absolute left-0 right-0 -top-px h-0.5 bg-orange rounded-full z-10" />}
      {dropEdge === "bottom" && <span aria-hidden className="absolute left-0 right-0 -bottom-px h-0.5 bg-orange rounded-full z-10" />}

      <span
        onMouseDown={onArm}
        title={reorderLabel}
        className="inline-flex items-center justify-center text-ink-faint/40 cursor-grab active:cursor-grabbing opacity-30 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
      >
        <IconGripVertical size={14} />
      </span>
      <span className="font-mono text-tiny text-ink-faint font-medium tabular-nums">{activity.time ?? "--:--"}</span>
      {pin != null ? (
        <button
          type="button"
          onClick={onFocusMap}
          className="flex items-center gap-2 min-w-0 text-left group/title"
        >
          <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-orange text-white text-[10px] font-semibold inline-flex items-center justify-center tabular-nums">{pin}</span>
          <span className="text-meta text-ink truncate group-hover/title:underline decoration-orange/40 underline-offset-2">{activity.title}</span>
        </button>
      ) : (
        <span className="text-meta text-ink truncate">{activity.title}</span>
      )}
      <div className="flex gap-0.5 opacity-30 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit} title={editLabel}
          className="w-6 h-6 rounded-full text-ink-faint hover:bg-ink/[0.06] hover:text-ink inline-flex items-center justify-center">
          <IconPencil size={12} />
        </button>
        <button type="button" onClick={onDelete} title={deleteLabel}
          className="w-6 h-6 rounded-full text-ink-faint hover:bg-danger-bg hover:text-danger-fg inline-flex items-center justify-center">
          <IconTrash size={12} />
        </button>
      </div>
    </div>
  );
}

/* ── The "+" between rows ── */
function InsertGap({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="group relative h-1.5">
      <span aria-hidden className="absolute left-0 right-0 top-1/2 h-px bg-transparent group-hover:bg-orange/40 transition-colors" />
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10",
          "w-[22px] h-[22px] rounded-full bg-surface border border-border-strong text-ink-faint",
          "inline-flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-orange hover:text-white hover:border-orange transition-opacity",
        )}
      >
        <IconPlus size={12} />
      </button>
    </div>
  );
}

/* ── Inline add row — same color / spacing as a list row, small input ── */
function EditRow({
  initial,
  tripId,
  items,
  excludeIds,
  placeholder,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  initial: Draft;
  tripId?: string;
  items?: TripActivityOption[];
  excludeIds?: string[];
  placeholder: string;
  cancelLabel: string;
  onConfirm: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [time, setTime] = useState<string | null>(initial.time);
  const [selected, setSelected] = useState<TripActivityOption | null>(
    initial.title ? { id: initial.activityId ?? "draft", title: initial.title, location: null, scheduled: [] } : null,
  );

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/70">
      <IconGripVertical size={14} className="text-ink-faint/30 shrink-0" />
      <TimeField value={time} onChange={setTime} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <ActivitySearchField
          autoFocus
          size="sm"
          value={selected}
          tripId={items ? undefined : tripId}
          items={items}
          excludeIds={excludeIds}
          placeholder={placeholder}
          onChange={(opt) => {
            if (opt) onConfirm({ time, title: opt.title, activityId: opt.id === "draft" ? null : opt.id });
            else setSelected(null);
          }}
          onCreate={(title) => onConfirm({ time, title, activityId: null })}
        />
      </div>
      <button
        type="button"
        onClick={onCancel}
        title={cancelLabel}
        className="w-6 h-6 rounded-full text-ink-faint hover:bg-ink/[0.06] hover:text-ink inline-flex items-center justify-center shrink-0"
      >
        <IconX size={13} />
      </button>
    </div>
  );
}

export function DayActivitiesEditForm({
  activities,
  onChange,
  tripId,
  items,
  editorFor,
  showMapOnDay,
  onShowMapOnDayChange,
  mode = "list",
  timelineSlot,
  mapStickyTop = "md:top-4",
  className,
}: DayActivitiesEditFormProps) {
  const t = useTranslations("DayActivities");
  const isTimeline = mode === "timeline";
  const [insertion, setInsertion] = useState<Insertion>({ kind: "none" });
  const mapRef = useRef<RouteMapHandle>(null);

  /* ── Drag & drop reorder (native HTML5, handle-driven) ── */
  const [armed, setArmed] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function resetDrag() {
    setArmed(null);
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleDrop() {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const copy = [...activities];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(overIndex, 0, moved);
      // Activities are ordered by time, so moving a row reassigns its time to
      // fit between the new neighbors — the time-sorted order then matches.
      const newTime = timeForDrop(
        copy[overIndex - 1]?.time ?? null,
        copy[overIndex + 1]?.time ?? null,
        moved.time,
      );
      copy[overIndex] = { ...moved, time: newTime };
      onChange(copy);
    }
    resetDrag();
  }

  const cancel = () => setInsertion({ kind: "none" });

  function confirmInsert(afterIndex: number, draft: Draft) {
    const item: DayActivity = { id: genId(), ...draft };
    const copy = [...activities];
    copy.splice(afterIndex + 1, 0, item);
    onChange(copy);
    cancel();
  }

  function confirmEdit(index: number, draft: Draft) {
    onChange(activities.map((a, i) => (i === index ? { ...a, ...draft } : a)));
    cancel();
  }

  function removeAt(index: number) {
    onChange(activities.filter((_, i) => i !== index));
  }

  const editingActive = insertion.kind !== "none";
  const linkedIds = (skipIndex?: number) =>
    activities.filter((a, i) => i !== skipIndex && a.activityId).map((a) => a.activityId!);

  const first = activities[0]?.time;
  const last = activities[activities.length - 1]?.time;
  const meta =
    activities.length === 0
      ? t("metaEmpty")
      : first && last
        ? `${t("stops", { count: activities.length })} · ${t("firstLast", { first, last })}`
        : t("stops", { count: activities.length });

  // Route map points (only rows with coordinates, in the current/time order)
  // + a lookup row id → point index so a row can focus its marker.
  const points: RouteStop[] = [];
  const mapIndexById = new Map<string, number>();
  for (const a of activities) {
    if (a.lat == null || a.lng == null) continue;
    mapIndexById.set(a.id, points.length);
    points.push({ lat: a.lat, lng: a.lng, name: a.title, formatted: a.location ?? a.title, placeId: "" });
  }

  return (
    <div className={cn(className)}>
      <SectionHeader
        eyebrow={isTimeline ? t("timeline.eyebrow") : t("eyebrow")}
        title={isTimeline ? t("timeline.title") : t("title")}
        sub={isTimeline ? t("timeline.sub") : t("sub")}
      />

      <div className="md:grid md:gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Map (left) — always shown, sticky while the list scrolls */}
        <div className="mb-5 md:mb-0">
          <div className={cn("md:sticky flex flex-col gap-3", mapStickyTop)}>
            {onShowMapOnDayChange && (
              <button
                type="button"
                role="checkbox"
                aria-checked={!!showMapOnDay}
                onClick={() => onShowMapOnDayChange(!showMapOnDay)}
                className="inline-flex items-center gap-2 self-start text-mini text-ink-soft hover:text-ink transition-colors"
              >
                <span className={cn(
                  "w-4 h-4 rounded-[5px] border inline-flex items-center justify-center shrink-0 transition-colors",
                  showMapOnDay ? "bg-orange border-orange text-white" : "bg-surface border-border-strong",
                )}>
                  {showMapOnDay && <IconCheck size={11} />}
                </span>
                {t("showOnDay")}
              </button>
            )}
            <ActivityRouteMap
              ref={mapRef}
              points={points}
              mapClassName="h-[260px] md:h-[440px]"
            />
          </div>
        </div>

        {/* Right column — timeline slot or the editable list */}
        <div>
        {isTimeline ? timelineSlot : (
          <>

      <div className="flex items-baseline gap-2.5 mb-2">
        <span className="text-[9px] tracking-eyebrow uppercase text-orange-deep font-medium">{t("program")}</span>
        <span className="flex-1 h-px bg-border" />
        <span className="font-serif italic text-tiny text-ink-faint">{meta}</span>
      </div>

      <div className="flex flex-col">
        {activities.map((item, i) => {
          const isEditing = insertion.kind === "edit" && insertion.index === i;

          // Lightweight inline edit fallback (no editorFor provided).
          if (isEditing && !editorFor) {
            return (
              <EditRow
                key={item.id}
                initial={{ time: item.time, title: item.title, activityId: item.activityId ?? null }}
                tripId={tripId}
                items={items}
                excludeIds={linkedIds(i)}
                placeholder={t("placeholder")}
                cancelLabel={t("cancel")}
                onConfirm={(draft) => confirmEdit(i, draft)}
                onCancel={cancel}
              />
            );
          }

          return (
            <div key={item.id}>
              <ActivityRow
                activity={item}
                dim={editingActive && !isEditing}
                selected={isEditing}
                dragging={dragIndex === i}
                armed={armed === i && !editingActive}
                dropEdge={
                  dragIndex !== null && overIndex === i && dragIndex !== i
                    ? (overIndex > dragIndex ? "bottom" : "top")
                    : null
                }
                pin={mapIndexById.has(item.id) ? mapIndexById.get(item.id)! + 1 : null}
                editLabel={t("edit")}
                deleteLabel={t("delete")}
                reorderLabel={t("reorder")}
                onArm={() => { if (!editingActive) setArmed(i); }}
                onDragStart={() => setDragIndex(i)}
                onDragEnter={() => { if (dragIndex !== null) setOverIndex(i); }}
                onDragEnd={resetDrag}
                onDrop={handleDrop}
                onFocusMap={() => { const idx = mapIndexById.get(item.id); if (idx != null) mapRef.current?.focusPoint(idx); }}
                onEdit={() => setInsertion({ kind: "edit", index: i })}
                onDelete={() => removeAt(i)}
              />
              {/* Detailed editor, inline below the row */}
              {isEditing && editorFor && (
                <div className="py-3">{editorFor(item.id, cancel)}</div>
              )}
              {i < activities.length - 1 && !editingActive && (
                <InsertGap label={t("insertHere")} onClick={() => setInsertion({ kind: "after", index: i })} />
              )}
              {insertion.kind === "after" && insertion.index === i && (
                <EditRow
                  initial={{ time: nextTime(item.time, activities[i + 1]?.time), title: "", activityId: null }}
                  tripId={tripId}
                  items={items}
                  excludeIds={linkedIds()}
                  placeholder={t("placeholder")}
                  cancelLabel={t("cancel")}
                  onConfirm={(draft) => confirmInsert(i, draft)}
                  onCancel={cancel}
                />
              )}
            </div>
          );
        })}
      </div>

      {insertion.kind === "none" && (
        <button
          type="button"
          onClick={() => setInsertion({ kind: "after", index: activities.length - 1 })}
          className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1.5 text-mini text-orange-deep font-medium rounded-md hover:bg-orange/[0.10] transition-colors"
        >
          <IconPlus size={13} />
          {t("addActivity")}
        </button>
      )}

      {/* Append row when adding to an empty list (index -1) */}
      {insertion.kind === "after" && activities.length === 0 && (
        <EditRow
          initial={{ time: "09:00", title: "", activityId: null }}
          tripId={tripId}
          items={items}
          excludeIds={[]}
          placeholder={t("placeholder")}
          cancelLabel={t("cancel")}
          onConfirm={(draft) => confirmInsert(-1, draft)}
          onCancel={cancel}
        />
      )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
