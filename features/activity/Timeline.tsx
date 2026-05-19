"use client";

/**
 * Timeline — Day Editor (embedded, v2)
 *
 * Replaces ActivityTimeline. Matches the ActivitiesEditor.html design faithfully:
 *   - SPINE_LEFT = 74px, spine line at x = 61px
 *   - Block rows: transparent bg, white + orange ring on hover
 *   - Fuzzy blocks: 20×20 grey icon, uppercase name, no halo
 *   - Normal blocks: 28×28 icon with bg-halo masking the spine
 *   - Time column: absolutely positioned to the LEFT of the spine icon
 *   - Add zones: hover-reveal orange dot + two affordances (block / activity)
 *   - Bridge strips: closed (compact) → click to expand edit card
 *   - Block composer: type chips + time/title/zone fields
 *
 * Props match ActivityTimeline for a drop-in replacement.
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useTimeline } from "./useTimeline";
import { ActivityAutocomplete } from "./ActivityAutocomplete";
import { Button } from "@/components/ui/Button";
import { PeriodBar, type PeriodTime } from "@/components/ui/PeriodBar";
import {
  IconCalendarTime, IconPlus, IconX, IconCircleMinus,
  IconWalk, IconPencil, IconMapPin,
} from "@/components/ui/icons";
import type {
  TimelineBlock as Block,
  SlotKey,
  SearchResult,
  NewBlockPayload,
} from "./types";
import type { BridgeData, BlockType } from "@/lib/dal/trips";
import { SLOT_ORDER } from "./types";
import { BridgeEditor } from "./Timeline/BridgeEditor";
import { TYPE_ICON, TRANSPORT_ICON } from "./Timeline/icons";

/* ─── geometry ──────────────────────────────────────────────────── */
const SPINE_LEFT = 110; // padding-left of spine container (allargata per ospitare le label periodo a sinistra)
const SPINE_X    = 97;  // x position of the vertical spine line

/* ─── add state ──────────────────────────────────────────────────── */
type AddState =
  | { kind: "composer";     afterBlockId?: string; slot: SlotKey }
  | { kind: "autocomplete"; afterBlockId?: string; slot: SlotKey }
  | null;

function isSameAdd(a: AddState, afterBlockId: string | undefined, slot: SlotKey): boolean {
  if (!a) return false;
  return a.afterBlockId === afterBlockId && a.slot === slot;
}

/* ══════════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════════ */

/* ─── SectionDivider ─────────────────────────────────────────────── */
/**
 * Etichetta del periodo posizionata a SINISTRA della linea verticale,
 * nello spazio tra l'ultimo orario del periodo precedente e il primo del
 * successivo. La spine non viene mai interrotta: nelle sezioni successive
 * la linea continua a scorrere dietro il divider.
 */
function SectionDivider({ slot, isFirst }: { slot: SlotKey; isFirst: boolean }) {
  const tSlots = useTranslations("ActivityList.slots");
  return (
    <div
      className="relative"
      style={{
        height: isFirst ? 22 : 32,
        paddingLeft: SPINE_LEFT,
      }}
    >
      {!isFirst && (
        <div
          className="absolute w-[1.5px] bg-[rgba(13,44,61,0.14)] pointer-events-none"
          style={{ left: SPINE_X, top: 0, bottom: 0 }}
          aria-hidden
        />
      )}
      <span
        className="absolute text-[10.5px] font-medium tracking-[0.14em] uppercase text-orange select-none whitespace-nowrap"
        style={{
          left: 0,
          width: SPINE_X - 8,
          textAlign: "right",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {tSlots(slot)}
      </span>
    </div>
  );
}

/* ─── BridgeStrip (closed) ───────────────────────────────────────── */
function BridgeStrip({
  bridge,
  editMode,
  onClick,
}: {
  bridge:   BridgeData;
  editMode: boolean;
  onClick:  () => void;
}) {
  const tTransport = useTranslations("Timeline.transport");
  const [hovered, setHovered] = useState(false);
  const durText = bridge.duration_min ? `${bridge.duration_min} min` : null;
  let transportLabel: string;
  try {
    transportLabel = tTransport(bridge.transport);
  } catch {
    transportLabel = bridge.transport;
  }
  const label = [transportLabel, durText, bridge.stops].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "relative flex items-center gap-1.5 text-ink-soft text-tiny transition-colors rounded-[15px_15px_0_0]",
        editMode ? "cursor-pointer hover:bg-[rgba(13,44,61,0.03)]" : "cursor-default",
      )}
      style={{ padding: "2px 8px", minHeight: 22, margin: "0 10px 0 5px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={editMode ? onClick : undefined}
    >
      <span className="text-ink-faint">{TRANSPORT_ICON[bridge.transport] ?? <IconWalk size={12} />}</span>
      <span>{label}</span>
      {bridge.line && <span className="text-ink-faint">· {bridge.line}</span>}
      {editMode && hovered && (
        <span className="ml-auto text-[#c7c0b0]"><IconPencil size={11} /></span>
      )}
    </div>
  );
}

// BridgeEditor moved to ./Timeline/BridgeEditor.tsx

/** Parse a "HH:mm" clock string into the PeriodBar time shape. */
function parseClock(clock?: string | null): PeriodTime {
  if (!clock) return { hour: undefined, minute: undefined };
  const [h, m] = clock.split(":").map((n) => Number(n));
  return {
    hour: Number.isFinite(h) ? h : undefined,
    minute: Number.isFinite(m) ? m : undefined,
  };
}

/* ─── ScheduleStrip ──────────────────────────────────────────────── */
/**
 * Strip per programmare l'istanza di un'attività nella giornata.
 * SCOPE: la Timeline è un organizer, non un editor — qui si tocca solo
 * lo scheduling (periodo + fuzzy). I dati dell'attività (titolo, descrizione,
 * luogo, budget…) si modificano sulla scheda /activities/[id].
 */
function ScheduleStrip({
  block,
  onSave,
  onClose,
}: {
  block:   Block;
  onSave:  (patch: import("./types").InstancePatch) => void;
  onClose: () => void;
}) {
  const tT = useTranslations("Timeline");
  const tCommon = useTranslations("Common");
  const [slot,  setSlot]  = useState<SlotKey>((block.slot as SlotKey) ?? "morning");
  const [fuzzy, setFuzzy] = useState<boolean>(!!block.fuzzy);
  const [time,  setTime]  = useState<PeriodTime>(parseClock(block.time));

  const hasTime = time.hour !== undefined && time.minute !== undefined;

  function handleSave() {
    const timeStr = hasTime
      ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`
      : null;
    onSave({
      slot,
      fuzzy,
      time: fuzzy ? null : timeStr,
    });
    onClose();
  }

  return (
    <div className="rounded-md border-[1.5px] border-orange bg-white p-[11px_13px] shadow-[0_4px_14px_rgba(244,123,58,0.10)]">
      {/* Head */}
      <div className="flex items-center gap-1.5 text-micro uppercase tracking-[0.08em] text-orange-deep font-medium mb-2">
        <IconCalendarTime size={11} />
        <span>{tT("schedule")}</span>
        <button
          className="ml-auto text-ink-faint hover:text-ink transition-colors"
          onClick={onClose}
          aria-label={tCommon("close")}
        >
          <IconX size={13} />
        </button>
      </div>

      {/* PeriodBar — periodo + picker dell'ora (il picker si chiude/apre al click sul periodo attivo) */}
      <PeriodBar
        value={slot}
        onChange={(id) => setSlot(id as SlotKey)}
        time={fuzzy ? { hour: undefined, minute: undefined } : time}
        onTimeChange={(t) => {
          setTime(t);
          if (t.hour !== undefined || t.minute !== undefined) setFuzzy(false);
        }}
        size="slim"
        pickerLabels={{ hour: tT("hour"), minutes: tT("minutes"), clearTime: tT("clearTime") }}
      />

      {/* Footer */}
      <div className="flex justify-between items-center mt-2.5 text-tiny text-ink-soft">
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={fuzzy}
            onChange={(e) => setFuzzy(e.target.checked)}
            className="accent-[var(--color-orange)] cursor-pointer"
          />
          <span>{tT("noPreciseTime")}</span>
        </label>
        <Button size="sm" variant="solid" tone="neutral" onClick={handleSave}>
          OK
        </Button>
      </div>
    </div>
  );
}

/* ─── AddZone ────────────────────────────────────────────────────── */
function AddZone({
  onAddBlock,
  onAddActivity,
}: {
  onAddBlock:    () => void;
  onAddActivity: () => void;
}) {
  return (
    <div className="group relative flex items-center min-h-[14px] cursor-pointer pl-1 my-0">
      {/* Orange dot on spine */}
      <div
        className="absolute flex items-center justify-center rounded-full bg-orange text-white opacity-30 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none"
        style={{ left: -21, top: "50%", transform: "translateY(-50%)", width: 18, height: 18 }}
        aria-hidden
      >
        <IconPlus size={11} />
      </div>

      {/* Affordances */}
      <div className="flex items-center gap-3.5 opacity-30 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          className="inline-flex items-center gap-2 text-orange-deep group/item"
          onClick={(e) => { e.stopPropagation(); onAddBlock(); }}
        >
          <span className="w-7 h-px bg-current opacity-85" />
          <span className="text-tiny font-medium group-hover/item:underline underline-offset-[3px]">
            aggiungi blocco
          </span>
        </button>
        <button
          className="inline-flex items-center gap-2 text-ink-soft hover:text-ink group/item transition-colors"
          onClick={(e) => { e.stopPropagation(); onAddActivity(); }}
        >
          <span className="w-7 h-px bg-current opacity-85" />
          <span className="text-tiny font-medium group-hover/item:underline underline-offset-[3px]">
            aggiungi attività
          </span>
        </button>
      </div>
    </div>
  );
}

/* ─── BlockComposer (add-expanded card) ──────────────────────────── */
const BLOCK_TYPES: { key: BlockType; label: string }[] = [
  { key: "place",  label: "Luogo"       },
  { key: "move",   label: "Spostamento" },
  { key: "meal",   label: "Pasto"       },
  { key: "pause",  label: "Pausa"       },
  { key: "action", label: "Azione"      },
];

function BlockComposer({
  defaultSlot,
  onAdd,
  onClose,
}: {
  defaultSlot: SlotKey;
  onAdd:   (payload: NewBlockPayload) => void;
  onClose: () => void;
}) {
  const [type,  setType]  = useState<BlockType>("place");
  const [time,  setTime]  = useState("");
  const [title, setTitle] = useState("");
  const [zone,  setZone]  = useState("");

  function handleAdd() {
    const t = title.trim();
    if (!t) return;
    onAdd({
      title: t,
      type,
      slot:  defaultSlot,
      fuzzy: !zone.trim(),
      time:  time || undefined,
    });
    onClose();
  }

  return (
    <div className="relative py-1">
      {/* Solid orange spine segment */}
      <div
        className="absolute top-0 bottom-0 w-[1.5px] bg-orange pointer-events-none"
        style={{ left: -19 }}
        aria-hidden
      />
      <div className="rounded-md border-[1.5px] border-orange bg-white p-[11px_13px] shadow-[0_4px_14px_rgba(244,123,58,0.10)]">
        {/* Head */}
        <div className="flex items-center gap-1.5 text-micro uppercase tracking-[0.08em] text-orange-deep font-medium mb-2.5">
          <IconPlus size={11} />
          <span>Nuovo blocco</span>
          <button className="ml-auto text-ink-faint hover:text-ink transition-colors" onClick={onClose}>
            <IconX size={13} />
          </button>
        </div>

        {/* Type chips */}
        <div className="flex gap-1 flex-wrap mb-2.5">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.key}
              onClick={() => setType(bt.key)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-pill border text-[10.5px] font-medium cursor-pointer transition-colors",
                type === bt.key
                  ? "bg-[#ddedde] text-[#3d6e0e] border-[#9bbf9a]"
                  : "bg-surface-soft border-border text-ink-soft hover:border-orange/40",
              )}
            >
              <span className="[&>svg]:w-[11px] [&>svg]:h-[11px]">
                {TYPE_ICON[bt.key] ?? <IconMapPin size={11} />}
              </span>
              {bt.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="flex gap-1.5 mb-2">
          <div className="w-[78px] shrink-0 bg-surface-soft rounded-[7px] px-2.5 py-1.5 text-[11.5px]">
            <span className="block text-[9px] uppercase tracking-meta text-ink-faint mb-0.5">Ora</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent outline-none w-full text-ink font-medium"
            />
          </div>
          <div className="flex-1 bg-surface-soft rounded-[7px] px-2.5 py-1.5 text-[11.5px]">
            <span className="block text-[9px] uppercase tracking-meta text-ink-faint mb-0.5">Titolo</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="bg-transparent outline-none w-full text-ink font-medium placeholder:text-ink-faint"
              placeholder="es. pausa caffè"
            />
          </div>
          <div className="w-[124px] shrink-0 bg-surface-soft rounded-[7px] px-2.5 py-1.5 text-[11.5px]">
            <span className="block text-[9px] uppercase tracking-meta text-ink-faint mb-0.5">Zona (opz.)</span>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="bg-transparent outline-none w-full text-ink placeholder:text-ink-faint italic"
              placeholder="(decidi sul posto)"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[10.5px] text-ink-faint">
          <span className="italic">Niente zona = fuzzy</span>
          <button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="bg-ink text-white rounded-pill px-3 py-1 text-[10.5px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Aggiungi
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SingleBlock (row + inline popover) ────────────────────────── */
function SingleBlock({
  block,
  editMode,
  popoverOpen,
  onOpenPopover,
  onClosePopover,
  onPatchInstance,
  onDelete,
}: {
  block:            Block;
  editMode:         boolean;
  popoverOpen:      boolean;
  onOpenPopover:    () => void;
  onClosePopover:   () => void;
  onPatchInstance:  (patch: import("./types").InstancePatch) => void;
  onDelete:         () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isFuzzy  = block.fuzzy;
  const showActs = editMode && (hovered || popoverOpen);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* ── Main row ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-sm py-1.5 pr-2 pl-3 mb-[4px] transition-all duration-150",
          isFuzzy
            ? [
                "bg-transparent",
                popoverOpen
                  ? "bg-white shadow-[0_0_0_1.5px_var(--color-orange),0_4px_14px_rgba(244,123,58,0.10)]"
                  : hovered &&
                    "bg-white shadow-[0_0_0_1.5px_var(--color-ink),0_4px_14px_rgba(13,44,61,0.10)]",
              ]
            : [
                "bg-white",
                popoverOpen
                  ? "shadow-[0_0_0_1.5px_var(--color-orange),0_4px_14px_rgba(244,123,58,0.10)]"
                  : hovered &&
                    "shadow-[0_0_0_1.5px_var(--color-ink),0_4px_14px_rgba(13,44,61,0.10)]",
              ],
        )}
      >
        {/* Time — absolute, left of spine */}
        <span
          className="absolute text-[10.5px] font-medium tabular-nums text-right select-none transition-colors"
          style={{
            right:     "calc(100% + 34px)",
            width:      38,
            top:       "50%",
            transform: "translateY(-50%)",
            color:     hovered || popoverOpen ? "var(--color-ink-soft)" : "var(--color-ink-faint)",
          }}
        >
          {block.time ?? <span className="opacity-30">—</span>}
        </span>

        {/* Spine icon — absolute, on the spine line */}
        <div
          className={cn(
            "absolute flex items-center justify-center rounded-full transition-all duration-150 shadow-sm z-10",
            isFuzzy
              ? [
                  "bg-[#d5d5ce] text-ink-soft border-2 border-[#e8e8e0]",
                  popoverOpen
                    ? "bg-white border-orange text-orange-deep"
                    : hovered && "bg-white border-ink text-ink",
                ]
              : [
                  "bg-[#e8e8e0] text-ink-soft border-2 border-[#f5f5f0]",
                  popoverOpen
                    ? "bg-white border-orange text-orange-deep"
                    : hovered && "bg-white border-ink text-ink",
                ],
          )}
          style={
            isFuzzy
              ? {
                  left:      -22,
                  top:       "50%",
                  transform: "translateY(-50%)",
                  width:      20,
                  height:     20,
                }
              : {
                  left:      -26,
                  top:       "50%",
                  transform: "translateY(-50%)",
                  width:      28,
                  height:     28,
                  boxShadow: "0 0 0 4px var(--color-bg)",
                }
          }
          aria-hidden
        >
          {TYPE_ICON[block.type ?? "place"] ?? TYPE_ICON.place}
        </div>

        {/* Name */}
        <button
          className={cn(
            "flex-1 min-w-0 text-left leading-snug transition-colors",
            isFuzzy
              ? "text-[10.5px] uppercase tracking-[0.08em] font-medium text-ink-soft hover:text-ink"
              : "text-meta text-ink-soft hover:text-ink",
          )}
          onClick={() => {
            if (!isFuzzy && block.entity_id) {
              // TODO: navigate to /activities/[entity_id]
            }
          }}
        >
          {block.title}
        </button>

        {/* Row actions */}
        {editMode && (
          <div
            className={cn(
              "flex items-center gap-0.5 shrink-0 transition-opacity duration-100",
              showActs ? "opacity-100" : "opacity-0",
            )}
          >
            <Button
              size="sm"
              variant="ghost"
              tone="neutral"
              iconOnly
              onClick={onOpenPopover}
              title="Programma nel giorno"
              aria-label="Programma nel giorno"
              className={cn(
                popoverOpen && "bg-orange/10 text-orange hover:bg-orange/10",
              )}
            >
              <IconCalendarTime />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              tone="neutral"
              iconOnly
              onClick={onDelete}
              title="Scollega dal giorno"
              aria-label="Scollega dal giorno"
            >
              <IconCircleMinus />
            </Button>
          </div>
        )}
      </div>

      {/* ── Schedule strip (period + fuzzy) ─────────────────────────── */}
      {popoverOpen && editMode && (
        <div className="relative" style={{ paddingLeft: 0, marginBottom: 4 }}>
          {/* Dashed orange spine segment — a sinistra della spine principale,
              alta quanto lo schedule */}
          <div
            className="absolute top-0 bottom-0 w-[1.5px] pointer-events-none"
            style={{
              left: -19,
              background:
                "repeating-linear-gradient(180deg, var(--color-orange) 0 3px, transparent 3px 7px)",
            }}
            aria-hidden
          />
          <ScheduleStrip
            block={block}
            onSave={(patch) => onPatchInstance(patch)}
            onClose={onClosePopover}
          />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Timeline — main export
═══════════════════════════════════════════════════════════════════ */

type Props = {
  dayId:         string;
  tripId:        string;
  initialBlocks: Block[];
  editMode?:     boolean;
};

export function Timeline({ dayId, tripId, initialBlocks, editMode = false }: Props) {
  const tT = useTranslations("Timeline");
  const {
    blocks,
    addBlock,
    addFromEntity,
    patchInstance,
    deleteBlock,
    patchBridge,
  } = useTimeline({ dayId, initialBlocks });

  /* ── local expansion state ───────────────────────────────────── */
  const [addState,       setAddState]       = useState<AddState>(null);
  const [popoverBlockId, setPopoverBlockId] = useState<string | null>(null);

  // bridge key = "blockId-in" | "blockId-out"
  const [expandedBridgeKey, setExpandedBridgeKey] = useState<string | null>(null);

  /* ── group blocks by slot ────────────────────────────────────── */
  const slotGroups = useMemo(() => {
    const groups: Record<SlotKey, Block[]> = { morning: [], afternoon: [], evening: [], night: [] };
    for (const b of blocks) {
      const slot = (b.slot as SlotKey) ?? "morning";
      groups[slot].push(b);
    }
    // Within each slot: sort by time ascending; fuzzy/no-time blocks go last,
    // preserving their relative order via `position`.
    for (const s of SLOT_ORDER) {
      groups[s].sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return (a.position ?? 0) - (b.position ?? 0);
      });
    }
    return groups;
  }, [blocks]);

  const activeSlots = SLOT_ORDER.filter((s) => slotGroups[s].length > 0);

  /* ── handlers ────────────────────────────────────────────────── */
  function handleAddBlock(afterBlockId: string | undefined, slot: SlotKey) {
    setAddState({ kind: "composer", afterBlockId, slot });
    setExpandedBridgeKey(null);
  }

  function handleAddActivity(afterBlockId: string | undefined, slot: SlotKey) {
    setAddState({ kind: "autocomplete", afterBlockId, slot });
    setExpandedBridgeKey(null);
  }

  function handleSelectEntity(entity: SearchResult, afterBlockId?: string) {
    addFromEntity(
      { id: entity.id, title: entity.title, type: entity.type, location: entity.location },
      afterBlockId,
    );
    setAddState(null);
  }

  function handleCreateNew(title: string, afterBlockId: string | undefined, slot: SlotKey) {
    addBlock({ title, type: "place", slot, fuzzy: true }, afterBlockId);
    setAddState(null);
  }

  function handleComposerAdd(payload: NewBlockPayload, afterBlockId?: string) {
    addBlock(payload, afterBlockId);
    setAddState(null);
  }

  function toggleBridge(blockId: string, direction: "in" | "out") {
    const key = `${blockId}-${direction}`;
    setExpandedBridgeKey((prev) => (prev === key ? null : key));
    setAddState(null);
  }

  /* ── render helpers ──────────────────────────────────────────── */
  function renderAddZone(afterBlockId: string | undefined, slot: SlotKey) {
    if (!editMode) return null;

    const composerHere = isSameAdd(addState, afterBlockId, slot) && addState?.kind === "composer";
    const autoHere     = isSameAdd(addState, afterBlockId, slot) && addState?.kind === "autocomplete";

    return (
      <div key={`az-${afterBlockId ?? "start"}-${slot}`}>
        {!composerHere && !autoHere && (
          <AddZone
            onAddBlock={()    => handleAddBlock(afterBlockId, slot)}
            onAddActivity={()  => handleAddActivity(afterBlockId, slot)}
          />
        )}
        {composerHere && (
          <BlockComposer
            defaultSlot={slot}
            onAdd={(payload) => handleComposerAdd(payload, afterBlockId)}
            onClose={() => setAddState(null)}
          />
        )}
        {autoHere && (
          <ActivityAutocomplete
            tripId={tripId}
            dayId={dayId}
            onSelect={(e) => handleSelectEntity(e, afterBlockId)}
            onCreateNew={(t) => handleCreateNew(t, afterBlockId, slot)}
            onClose={() => setAddState(null)}
          />
        )}
      </div>
    );
  }

  /* ── empty state ─────────────────────────────────────────────── */
  if (blocks.length === 0) {
    return (
      <div>
        <div
          className="py-10 text-center text-meta text-ink-faint"
          style={{ paddingLeft: SPINE_LEFT + 16 }}
        >
          {tT("noActivities")}.
        </div>
        {editMode && renderAddZone(undefined, "morning")}
      </div>
    );
  }

  /* ── main render ─────────────────────────────────────────────── */
  return (
    <div>
      {activeSlots.map((slot, slotIdx) => {
        const slotBlocks = slotGroups[slot];
        const isFirstSection = slotIdx === 0;
        const isLastSection  = slotIdx === activeSlots.length - 1;

        // Determine if the first block of this section starts with bridge_in (no add-zone before it when not in editMode)
        const firstBlockHasBridgeIn = !!slotBlocks[0]?.bridge_in_json;

        return (
          <div key={slot}>
            <SectionDivider slot={slot} isFirst={isFirstSection} />

            {/* Spine section */}
            <div
              className="relative"
              style={{ paddingLeft: SPINE_LEFT }}
            >
              {/* Vertical spine line */}
              <div
                className="absolute w-[1.5px] bg-[rgba(13,44,61,0.14)] pointer-events-none"
                style={{
                  left:   SPINE_X,
                  top:    isFirstSection ? 32 : (firstBlockHasBridgeIn && !editMode ? 12 : 0),
                  bottom: isLastSection  ? 32 : 0,
                }}
                aria-hidden
              />

              {/* Add zone at section start */}
              {editMode && renderAddZone(undefined, slot)}

              {slotBlocks.map((block, blockIdx) => {
                const isLastBlock = blockIdx === slotBlocks.length - 1;
                const bridgeInKey  = `${block.id}-in`;
                const bridgeOutKey = `${block.id}-out`;

                return (
                  <div key={block.id}>
                    {/* Bridge IN (before the block) */}
                    {block.bridge_in_json && (
                      expandedBridgeKey === bridgeInKey ? (
                        <BridgeEditor
                          bridge={block.bridge_in_json}
                          onSave={(b) => { patchBridge(block.id, "in", b); setExpandedBridgeKey(null); }}
                          onClose={() => setExpandedBridgeKey(null)}
                          onMarkFree={() => { patchBridge(block.id, "in", null); setExpandedBridgeKey(null); }}
                        />
                      ) : (
                        <BridgeStrip
                          bridge={block.bridge_in_json}
                          editMode={editMode}
                          onClick={() => toggleBridge(block.id, "in")}
                        />
                      )
                    )}

                    {/* Block row + popover */}
                    <SingleBlock
                      block={block}
                      editMode={editMode}
                      popoverOpen={popoverBlockId === block.id}
                      onOpenPopover={() => setPopoverBlockId(block.id)}
                      onClosePopover={() => setPopoverBlockId(null)}
                      onPatchInstance={(patch) => patchInstance(block.id, patch)}
                      onDelete={() => deleteBlock(block.id)}
                    />

                    {/* Add zone after block (between this and next, or at end of section) */}
                    {!isLastBlock && renderAddZone(block.id, slot)}

                    {/* Bridge OUT (after the block / add-zone) */}
                    {block.bridge_out_json && (
                      expandedBridgeKey === bridgeOutKey ? (
                        <BridgeEditor
                          bridge={block.bridge_out_json}
                          onSave={(b) => { patchBridge(block.id, "out", b); setExpandedBridgeKey(null); }}
                          onClose={() => setExpandedBridgeKey(null)}
                          onMarkFree={() => { patchBridge(block.id, "out", null); setExpandedBridgeKey(null); }}
                        />
                      ) : (
                        <BridgeStrip
                          bridge={block.bridge_out_json}
                          editMode={editMode}
                          onClick={() => toggleBridge(block.id, "out")}
                        />
                      )
                    )}
                  </div>
                );
              })}

              {/* Add zone at end of section */}
              {editMode && renderAddZone(slotBlocks[slotBlocks.length - 1]?.id, slot)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
