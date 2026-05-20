"use client";

/* ─────────────────────────────────────────────────────────────────
   TimelineAxis — PROTOTIPO (Fase 1)
   Asse temporale proporzionale 06:00–24:00 con drag&drop via pointer
   events nativi: trascinando un'attività la Y → nuovo orario (snap 5').
   I fuzzy/senza orario vivono in una corsia in fondo e, trascinati
   sull'asse, ottengono un orario (diventano non-fuzzy).
   Vista pensata per l'EDIT MODE; nessuna dipendenza esterna.
───────────────────────────────────────────────────────────────── */

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { TYPE_ICON } from "./icons";
import type { TimelineBlock as Block, SlotKey } from "../types";

/* ── scala tempo→pixel ─────────────────────────────────────────── */
const START_HOUR = 6;
const END_HOUR = 24;
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60; // 1080
const PX_PER_HOUR = 56;
const PX_PER_MIN = PX_PER_HOUR / 60;
const AXIS_HEIGHT = TOTAL_MIN * PX_PER_MIN;
const SNAP_MIN = 5;
const GUTTER = 56; // colonna orari a sinistra

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** "HH:mm" → minuti dall'inizio asse (06:00). Null se non parsabile. */
function clockToOffset(clock?: string | null): number | null {
  if (!clock) return null;
  const [h, m] = clock.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return clamp(h * 60 + m - START_HOUR * 60, 0, TOTAL_MIN);
}

/** minuti dall'inizio asse → "HH:mm". */
function offsetToClock(offset: number): string {
  const total = clamp(Math.round(offset), 0, TOTAL_MIN) + START_HOUR * 60;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Y (px nell'asse) → offset minuti, con snap. */
function yToOffset(y: number): number {
  const raw = clamp(y, 0, AXIS_HEIGHT) / PX_PER_MIN;
  return clamp(Math.round(raw / SNAP_MIN) * SNAP_MIN, 0, TOTAL_MIN);
}

function slotForClock(clock: string): SlotKey {
  const h = Number(clock.split(":")[0]);
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

type DragState = {
  id: string;
  /** offset minuti corrente sotto il cursore (snap già applicato) */
  offset: number;
  /** scarto tra il punto di presa e il top della card, in px */
  grabDy: number;
};

export function TimelineAxis({
  blocks,
  onChangeTime,
}: {
  blocks: Block[];
  /** Chiamato al drop: nuovo orario (+slot derivato) per l'attività. */
  onChangeTime: (id: string, time: string, slot: SlotKey) => void;
}) {
  const t = useTranslations("Timeline.axis");
  const axisRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const timed = blocks.filter((b) => !b.fuzzy && b.time);
  const fuzzy = blocks.filter((b) => b.fuzzy || !b.time);

  /* ── pointer handlers ──────────────────────────────────────────── */
  function pointerOffset(clientY: number, grabDy: number): number {
    const rect = axisRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return yToOffset(clientY - rect.top - grabDy);
  }

  function startDrag(e: React.PointerEvent, block: Block) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = axisRef.current?.getBoundingClientRect();
    const curOffset = clockToOffset(block.time);
    // grabDy: per le card timed prendo lo scarto dal loro top; per i fuzzy 0.
    const cardTop = rect && curOffset != null ? rect.top + curOffset * PX_PER_MIN : e.clientY;
    const grabDy = curOffset != null ? e.clientY - cardTop : 0;
    setDrag({ id: block.id, offset: pointerOffset(e.clientY, grabDy), grabDy });
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, offset: pointerOffset(e.clientY, drag.grabDy) });
  }

  function endDrag() {
    if (!drag) return;
    const clock = offsetToClock(drag.offset);
    onChangeTime(drag.id, clock, slotForClock(clock));
    setDrag(null);
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div
      className="relative select-none"
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Asse */}
      <div
        ref={axisRef}
        className="relative"
        style={{ height: AXIS_HEIGHT, paddingLeft: GUTTER }}
      >
        {/* Griglia oraria */}
        {hours.map((h) => {
          const y = (h - START_HOUR) * PX_PER_HOUR;
          return (
            <div key={h} className="absolute left-0 right-0 pointer-events-none" style={{ top: y }}>
              <div className="absolute h-px bg-border-strong/40 left-0 right-0" />
              <span
                className="absolute -translate-y-1/2 text-micro tabular-nums text-ink-faint"
                style={{ left: 0, width: GUTTER - 10, textAlign: "right" }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          );
        })}

        {/* Spine verticale */}
        <div
          className="absolute w-px bg-border-strong/40 pointer-events-none"
          style={{ left: GUTTER - 1, top: 0, bottom: 0 }}
          aria-hidden
        />

        {/* Attività con orario */}
        {timed.map((b) => {
          const isDragging = drag?.id === b.id;
          const offset = isDragging ? drag.offset : clockToOffset(b.time) ?? 0;
          const y = offset * PX_PER_MIN;
          return (
            <AxisCard
              key={b.id}
              block={b}
              y={y}
              clock={offsetToClock(offset)}
              dragging={!!isDragging}
              onPointerDown={(e) => startDrag(e, b)}
            />
          );
        })}
      </div>

      {/* Corsia fuzzy / senza orario */}
      <div className="mt-3 pt-3 border-t border-dashed border-border-strong" style={{ paddingLeft: GUTTER }}>
        <div className="text-micro uppercase tracking-eyebrow-wide text-ink-faint mb-2">
          {t("noTimeLane")}
        </div>
        <div className="flex flex-wrap gap-2">
          {fuzzy.length === 0 && (
            <span className="text-tiny text-ink-faint italic">{t("none")}</span>
          )}
          {fuzzy.map((b) => {
            const isDragging = drag?.id === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onPointerDown={(e) => startDrag(e, b)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-tiny font-medium cursor-grab active:cursor-grabbing",
                  "bg-surface-soft border-border text-ink-soft [&>svg]:size-3.5",
                  isDragging && "opacity-40",
                )}
              >
                {TYPE_ICON[b.type ?? "place"] ?? TYPE_ICON.place}
                <span className="truncate max-w-[160px]">{b.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Indicatore orario durante il drag di un fuzzy (preview) */}
      {drag && fuzzy.some((b) => b.id === drag.id) && (
        <div
          className="pointer-events-none absolute text-micro tabular-nums font-medium text-orange"
          style={{ left: GUTTER + 6, top: drag.offset * PX_PER_MIN }}
        >
          {offsetToClock(drag.offset)}
        </div>
      )}
    </div>
  );
}

/* ── card attività posizionata sull'asse ───────────────────────── */
function AxisCard({
  block,
  y,
  clock,
  dragging,
  onPointerDown,
}: {
  block: Block;
  y: number;
  clock: string;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        "absolute flex items-center gap-2 pr-3 pl-2 py-1 rounded-full bg-surface-warm",
        "border border-border-strong shadow-sm cursor-grab active:cursor-grabbing",
        "[&>svg]:size-3.5",
        dragging && "z-20 ring-2 ring-orange shadow-md",
      )}
      style={{ left: 6, right: 8, top: y, transform: "translateY(-50%)" }}
    >
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-border-strong text-ink-soft shrink-0 [&>svg]:size-3.5"
        aria-hidden
      >
        {TYPE_ICON[block.type ?? "place"] ?? TYPE_ICON.place}
      </span>
      <span className="text-tiny tabular-nums font-medium text-ink shrink-0">{clock}</span>
      <span className="text-meta text-ink truncate">{block.title}</span>
    </div>
  );
}
