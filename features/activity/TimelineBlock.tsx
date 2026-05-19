"use client";

import { useState } from "react";
import { IconGripVertical, IconPencil, IconTrash, IconMapPin, IconCheck, IconCircleDashed, IconBookmark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { InstancePopover } from "./InstancePopover";
import { BridgeCard } from "./BridgeCard";
import type { TimelineBlock as Block, InstancePatch, BridgeData, BookingStatus } from "./types";

/* ─── constants ─── */
export const SPINE_LEFT = 56; // px — deve combaciare con AddAffordance e SectionDivider

const TYPE_EMOJI: Record<string, string> = {
  place: "📍", meal: "🍽️", pause: "☕", action: "✅", move: "↔️",
};
const TYPE_LABEL: Record<string, string> = {
  place: "Luogo", meal: "Pasto", pause: "Pausa", action: "Azione", move: "Spostamento",
};
const TYPE_BG: Record<string, string> = {
  place:  "bg-sky-50 text-sky-700 border-sky-200",
  meal:   "bg-amber-50 text-amber-700 border-amber-200",
  pause:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  action: "bg-violet-50 text-violet-700 border-violet-200",
  move:   "bg-orange-50 text-orange-700 border-orange-200",
};
const STATUS_STYLE: Record<BookingStatus, string> = {
  todo:   "bg-zinc-100 text-zinc-500",
  booked: "bg-sky-50 text-sky-600",
  paid:   "bg-emerald-50 text-emerald-600",
};
const STATUS_LABEL: Record<BookingStatus, string> = {
  todo: "Da fare", booked: "Prenotato", paid: "Pagato",
};

/* ─── props ─── */
type Props = {
  block: Block;
  editMode?: boolean;
  onPatchInstance: (patch: InstancePatch) => void;
  onDelete: () => void;
  onPatchBridge: (direction: "in" | "out", bridge: Partial<BridgeData> | null) => void;
  /** Drag callbacks — opzionale, usato solo quando dnd è attivo */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
};

export function TimelineBlock({
  block, editMode = false,
  onPatchInstance, onDelete, onPatchBridge,
  dragHandleProps,
}: Props) {
  const [hovered, setHovered]       = useState(false);
  const [popoverOpen, setPopover]   = useState(false);
  const isFuzzy = block.fuzzy;
  const showActions = editMode && (hovered || popoverOpen);

  const status = block.booking_status;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Bridge IN (sopra il blocco) ── */}
      {block.bridge_in_json && (
        <BridgeCard
          bridge={block.bridge_in_json}
          onSave={(b) => onPatchBridge("in", b)}
        />
      )}

      {/* ── Main row ── */}
      <div
        className="relative flex items-start py-2 pr-1"
        style={{ paddingLeft: SPINE_LEFT + 12 }}
      >
        {/* Time */}
        <div
          className="absolute top-[13px] text-right select-none"
          style={{ left: 0, width: SPINE_LEFT - 10 }}
        >
          {block.time ? (
            <span className="text-[11px] font-mono text-ink-soft tabular-nums">{block.time}</span>
          ) : (
            <span className="text-[11px] text-ink-faint opacity-30">—</span>
          )}
        </div>

        {/* Spine dot */}
        <div
          className={cn(
            "absolute top-[15px] w-[12px] h-[12px] rounded-full border-2 border-white z-10 shadow-sm",
            isFuzzy ? "bg-zinc-300" : "bg-orange"
          )}
          style={{ left: SPINE_LEFT - 6 }}
        />

        {/* Card */}
        <div
          className={cn(
            "flex-1 min-w-0 rounded-[var(--radius-md)] px-3 py-2.5 border transition-all duration-150",
            isFuzzy
              ? "border-dashed border-zinc-300 bg-zinc-50/70"
              : "border-border bg-white",
            (hovered || popoverOpen) && "border-orange/35 shadow-sm",
          )}
        >
          {/* Type badge + name + status */}
          <div className="flex items-start gap-2 flex-wrap">
            <span
              className={cn(
                "shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-[3px] rounded-[5px] border mt-[1px]",
                TYPE_BG[block.type] ?? TYPE_BG.place
              )}
            >
              <span>{TYPE_EMOJI[block.type] ?? "📍"}</span>
              <span className="uppercase tracking-[0.05em]">{TYPE_LABEL[block.type] ?? block.type}</span>
            </span>

            {/* Nome → click naviga ad Activity Detail */}
            <button
              className={cn(
                "flex-1 min-w-0 text-left leading-snug transition-colors",
                isFuzzy
                  ? "text-[11px] font-semibold italic uppercase tracking-[0.06em] text-ink-soft"
                  : "text-[14px] font-semibold text-ink hover:text-orange"
              )}
              onClick={() => {
                if (!isFuzzy && block.entity_id) {
                  // TODO: navigate to /activities/[entity_id]
                }
              }}
            >
              {block.title}
            </button>

            {/* Booking status */}
            {status && (
              <span
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-[3px] rounded-full mt-[1px]",
                  STATUS_STYLE[status]
                )}
              >
                {status === "todo"   && <IconCircleDashed size={9} />}
                {status === "booked" && <IconBookmark size={9} />}
                {status === "paid"   && <IconCheck size={9} />}
                {STATUS_LABEL[status]}
              </span>
            )}
          </div>

          {/* Location */}
          {block.location && (
            <div className="flex items-center gap-1 mt-1.5">
              <IconMapPin size={11} className="text-ink-faint shrink-0" />
              <span className="text-[11px] text-ink-soft truncate">{block.location}</span>
            </div>
          )}

          {/* Instance note */}
          {block.instance_note && (
            <p className="mt-1.5 text-[11px] text-ink-faint italic">{block.instance_note}</p>
          )}
        </div>

        {/* Hover actions */}
        {editMode && (
          <div
            className={cn(
              "flex items-center gap-0.5 pl-1.5 self-center shrink-0 transition-opacity duration-100",
              showActions ? "opacity-100" : "opacity-0"
            )}
          >
            <button
              onClick={() => setPopover((v) => !v)}
              title="Modifica istanza"
              className={cn(
                "p-1.5 rounded-[6px] text-ink-faint hover:text-ink transition-colors",
                popoverOpen ? "bg-orange/10 text-orange" : "hover:bg-surface-soft"
              )}
            >
              <IconPencil size={14} />
            </button>
            <button
              onClick={onDelete}
              title="Rimuovi dal giorno"
              className="p-1.5 rounded-[6px] text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <IconTrash size={14} />
            </button>
            <div
              title="Riordina"
              className="p-1.5 rounded-[6px] text-ink-faint hover:bg-surface-soft cursor-grab transition-colors"
              {...dragHandleProps}
            >
              <IconGripVertical size={14} />
            </div>
          </div>
        )}
      </div>

      {/* ── Instance popover ── */}
      {popoverOpen && editMode && (
        <div style={{ paddingLeft: SPINE_LEFT }}>
          <InstancePopover
            block={block}
            onSave={onPatchInstance}
            onClose={() => setPopover(false)}
          />
        </div>
      )}

      {/* ── Bridge OUT (sotto il blocco) ── */}
      {block.bridge_out_json && (
        <div style={{ paddingLeft: SPINE_LEFT }}>
          <BridgeCard
            bridge={block.bridge_out_json}
            onSave={(b) => onPatchBridge("out", b)}
          />
        </div>
      )}
    </div>
  );
}
