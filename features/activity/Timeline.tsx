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
import { AddActivityForm } from "./Timeline/AddActivityForm";
import { Button } from "@/components/ui/Button";
import { PeriodBar, type PeriodTime } from "@/components/ui/PeriodBar";
import {
  IconCalendarTime, IconPlus, IconX, IconCircleMinus,
  IconWalk, IconRoute,
} from "@/components/ui/icons";
import type {
  TimelineBlock as Block,
  SlotKey,
  TripActivityOption,
} from "./types";
import type { BridgeData } from "@/lib/dal/domain";
import { SLOT_ORDER } from "./types";
import { BridgeEditor } from "./Timeline/BridgeEditor";
import { formatMinutes } from "./Timeline/duration";
import { TYPE_ICON, TRANSPORT_ICON } from "./Timeline/icons";

/* ─── geometry ──────────────────────────────────────────────────── */
const SPINE_LEFT = 110; // padding-left of spine container (allargata per ospitare le label periodo a sinistra)
const SPINE_X    = 97;  // x position of the vertical spine line

/* ─── add state ──────────────────────────────────────────────────── */
type AddState =
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
      <div
        className="absolute w-[1.5px] bg-[rgba(13,44,61,0.14)] pointer-events-none"
        style={{ left: SPINE_X, top: 0, bottom: 0 }}
        aria-hidden
      />
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

/* ─── BridgeStrip (sola visualizzazione) ─────────────────────────────
   I bridge non sono più editabili dallo strip: niente hover, niente
   matita, niente click. Si modificano solo dall'edit form TRANSIT
   dell'attività.
─────────────────────────────────────────────────────────────────── */
function BridgeStrip({ bridge }: { bridge: BridgeData }) {
  const tTransport = useTranslations("Timeline.transport");
  const durText = formatMinutes(bridge.duration_min) || null;
  let transportLabel: string;
  try {
    transportLabel = tTransport(bridge.transport);
  } catch {
    transportLabel = bridge.transport;
  }
  const label = [transportLabel, durText, bridge.stops].filter(Boolean).join(" · ");

  return (
    <div
      className="relative flex items-center gap-1.5 text-ink-soft text-tiny rounded-[15px_15px_0_0]"
      style={{ padding: "2px 8px", minHeight: 22, margin: "0 10px 0 5px" }}
    >
      <span className="text-ink-faint">{TRANSPORT_ICON[bridge.transport] ?? <IconWalk size={12} />}</span>
      <span>{label}</span>
      {bridge.line && <span className="text-ink-faint">· {bridge.line}</span>}
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

/** "HH:mm" + N minuti (wrap a 24h). Null se non parsabile. */
function addMinutesToClock(clock: string, minutes: number): string | null {
  const [h, m] = clock.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Periodo (slot) corrispondente a un orario "HH:mm". */
function slotForClock(clock: string): SlotKey {
  const h = Number(clock.split(":")[0]);
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  if (h < 22) return "evening";
  return "night";
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
  const [slot, setSlot] = useState<SlotKey>((block.slot as SlotKey) ?? "morning");
  const [time, setTime] = useState<PeriodTime>(parseClock(block.time));

  const hasTime = time.hour !== undefined && time.minute !== undefined;

  function handleSave() {
    const timeStr = hasTime
      ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`
      : null;
    // Nessun orario preciso ⇒ fuzzy (deriva dallo stato del picker).
    onSave({
      slot,
      fuzzy: !hasTime,
      time: timeStr,
    });
    onClose();
  }

  return (
    <div className="rounded-md rounded-tr-none border-[1.5px] border-orange bg-white p-[11px_13px] shadow-[0_4px_14px_rgba(244,123,58,0.10)]">
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
        time={time}
        onTimeChange={setTime}
        size="slim"
        pickerLabels={{ hour: tT("hour"), minutes: tT("minutes"), clearTime: tT("clearTime") }}
      />

      {/* Footer */}
      <div className="flex justify-end items-center gap-1.5 mt-2.5">
        <Button size="sm" variant="ghost" tone="neutral" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button size="sm" variant="solid" tone="neutral" onClick={handleSave}>
          {tCommon("apply")}
        </Button>
      </div>
    </div>
  );
}

/* ─── AddZone ────────────────────────────────────────────────────── */
/**
 * Affordance "aggiungi attività": invisibile a riposo, compare solo
 * all'hover come piccolo pallino con il "+" sulla spine + scritta piccola.
 */
function AddZone({
  onAddActivity,
}: {
  onAddActivity: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAddActivity}
      className="group relative flex items-center w-full text-left min-h-[20px] pl-5 my-0.5 cursor-pointer"
    >
      {/* Small "+" dot on the spine — hover only */}
      <div
        className="absolute flex items-center justify-center rounded-full bg-orange text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-10"
        style={{ left: -21, top: "50%", transform: "translateY(-50%)", width: 18, height: 18 }}
        aria-hidden
      >
        <IconPlus size={11} />
      </div>

      {/* Small label — hover only */}
      <span className="text-tiny font-medium text-ink-soft opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
        aggiungi attività
      </span>
    </button>
  );
}

/* ─── SingleBlock (row + inline popover) ────────────────────────── */
function SingleBlock({
  block,
  editMode,
  popoverOpen,
  transitOpen,
  onOpenPopover,
  onClosePopover,
  onEditTransit,
  onPatchInstance,
  onDelete,
}: {
  block:            Block;
  editMode:         boolean;
  popoverOpen:      boolean;
  transitOpen:      boolean;
  onOpenPopover:    () => void;
  onClosePopover:   () => void;
  onEditTransit:    () => void;
  onPatchInstance:  (patch: import("./types").InstancePatch) => void;
  onDelete:         () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isFuzzy  = block.fuzzy;
  const showActs = editMode && (hovered || popoverOpen || transitOpen);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* ── Main row ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative flex items-center gap-3 py-1.5 pr-2 pl-5 rounded-full transition-colors",
          popoverOpen
            ? "bg-ink text-white my-0.5 rounded-br-none"
            : ["rounded-tr-none", !isFuzzy && "border-t border-dashed border-border-strong", hovered && "bg-surface-soft"],
        )}
      >
        {/* Time — absolute, left of spine */}
        <span
          className="absolute text-[12.5px] font-medium tabular-nums text-right select-none transition-colors"
          style={{
            right:     "calc(100% + 42px)",
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
            "absolute flex items-center justify-center rounded-full transition-all duration-150 shadow-sm z-10 [&>svg]:w-3.5 [&>svg]:h-3.5",
            isFuzzy
              ? [
                  "bg-[#d5d5ce] text-ink-soft border-2 border-[#e8e8e0]",
                  popoverOpen
                    ? "bg-ink border-white text-white"
                    : hovered && "bg-white border-ink text-ink",
                ]
              : [
                  "bg-[#e8e8e0] text-ink-soft border-2 border-[#f5f5f0]",
                  popoverOpen
                    ? "bg-ink border-white text-white"
                    : hovered && "bg-white border-ink text-ink",
                ],
          )}
          style={
            isFuzzy
              ? {
                  left:      -23,
                  top:       "50%",
                  transform: "translateY(-50%)",
                  width:      22,
                  height:     22,
                  borderWidth: popoverOpen ? 1 : undefined,
                  boxShadow: popoverOpen ? "none" : undefined,
                }
              : {
                  left:      -27,
                  top:       "50%",
                  transform: "translateY(-50%)",
                  width:      30,
                  height:     30,
                  borderWidth: popoverOpen ? 1 : undefined,
                  boxShadow: popoverOpen
                    ? "none"
                    : "0 0 0 4px var(--color-bg)",
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
              ? "text-tiny uppercase tracking-[0.08em] font-medium -ml-2"
              : "text-[15px]",
            popoverOpen ? "text-white" : isFuzzy ? "text-ink-soft" : "text-ink",
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
              onClick={onEditTransit}
              title="Transit"
              aria-label="Transit"
              className={cn(
                popoverOpen && "text-white/70 hover:text-white",
                transitOpen && "bg-orange/10 text-orange hover:bg-orange/10",
              )}
            >
              <IconRoute />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              tone="neutral"
              iconOnly
              onClick={onDelete}
              title="Scollega dal giorno"
              aria-label="Scollega dal giorno"
              className={cn(
                popoverOpen && "text-white/70 hover:text-white",
              )}
            >
              <IconCircleMinus />
            </Button>
          </div>
        )}
      </div>

      {/* ── Schedule strip (period + fuzzy) — SOTTO l'attività ───────── */}
      {popoverOpen && editMode && (
        <div className="relative" style={{ paddingLeft: 0, marginBottom: 4 }}>
          {/* Dashed orange spine segment */}
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
    addFromEntity,
    patchInstance,
    deleteBlock,
    patchBridge,
  } = useTimeline({ dayId, initialBlocks });

  /* ── local expansion state ───────────────────────────────────── */
  const [addState,       setAddState]       = useState<AddState>(null);
  const [popoverBlockId, setPopoverBlockId] = useState<string | null>(null);
  // Transient error shown when trying to add an activity already on the day.
  const [dupError,       setDupError]       = useState<string | null>(null);

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
  function handleAddActivity(afterBlockId: string | undefined, slot: SlotKey) {
    setAddState({ kind: "autocomplete", afterBlockId, slot });
    setExpandedBridgeKey(null);
    setDupError(null);
  }

  // Seleziona un'attività esistente del viaggio: la programma nel giorno e
  // apre subito il pannello SCHEDULE sul nuovo blocco.
  async function handleSelectActivity(
    option: TripActivityOption,
    afterBlockId: string | undefined,
    slot: SlotKey,
  ): Promise<boolean> {
    // Già programmata in questo giorno? (vincolo UNIQUE activity_id+day_id)
    // Guard centrale: rifiuta il duplicato con un errore. Vale per la ricerca
    // (dove peraltro è già esclusa) e per il futuro drag&drop dalla Wishlist.
    const already = blocks.find(
      (b) => b.activity_id === option.id || b.entity_id === option.id,
    );
    if (already) {
      setDupError(tT("alreadyOnDay", { title: option.title }));
      return false;
    }
    setDupError(null);

    // Precompila periodo e orario a +5 min rispetto all'attività subito sopra
    // (il blocco dopo cui si inserisce), se esiste e ha un orario.
    const above = afterBlockId ? blocks.find((b) => b.id === afterBlockId) : undefined;
    const preTime = above?.time ? addMinutesToClock(above.time, 5) : null;
    const preSlot: SlotKey = preTime ? slotForClock(preTime) : slot;

    const created = await addFromEntity(
      { id: option.id, title: option.title, type: "place", location: option.location },
      afterBlockId,
      preSlot,
      preTime,
    );
    // Chiude la form e apre SCHEDULE solo se l'attività è stata aggiunta.
    if (created) {
      setAddState(null);
      setPopoverBlockId(created.id);
      return true;
    }
    return false;
  }

  function toggleBridge(blockId: string, direction: "in" | "out") {
    const key = `${blockId}-${direction}`;
    setExpandedBridgeKey((prev) => (prev === key ? null : key));
    setAddState(null);
  }

  /* ── render helpers ──────────────────────────────────────────── */
  function renderAddZone(afterBlockId: string | undefined, slot: SlotKey) {
    if (!editMode) return null;

    const autoHere = isSameAdd(addState, afterBlockId, slot) && addState?.kind === "autocomplete";

    return (
      <div key={`az-${afterBlockId ?? "start"}-${slot}`}>
        {!autoHere && (
          <AddZone
            onAddActivity={() => handleAddActivity(afterBlockId, slot)}
          />
        )}
        {autoHere && (
          <AddActivityForm
            tripId={tripId}
            onSelect={(opt) => handleSelectActivity(opt, afterBlockId, slot)}
            onClose={() => setAddState(null)}
            excludeIds={blocks.map((b) => b.activity_id)}
          />
        )}
      </div>
    );
  }

  /* ── duplicate-add error notice (reused by both render branches) ── */
  const dupNotice = dupError ? (
    <div
      role="alert"
      className="mb-2 rounded-md border border-danger-border bg-danger-bg px-3 py-1.5 text-mini text-danger-fg"
      style={{ marginLeft: SPINE_LEFT }}
    >
      {dupError}
    </div>
  ) : null;

  /* ── empty state ─────────────────────────────────────────────── */
  if (blocks.length === 0) {
    return (
      <div>
        {dupNotice}
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
    <div className="min-w-[498px] max-w-[498px]">
      {dupNotice}
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
                  top:    isFirstSection ? 0 : (firstBlockHasBridgeIn && !editMode ? 12 : 0),
                  bottom: isLastSection  ? 32 : 0,
                }}
                aria-hidden
              />

              {/* Add zone at section start */}
              {editMode && renderAddZone(undefined, slot)}

              {slotBlocks.map((block, blockIdx) => {
                const isLastBlock = blockIdx === slotBlocks.length - 1;
                const bridgeInKey  = `${block.id}-in`;

                // In read-mode diamo respiro tra un'attività e l'altra: uno
                // spacer (che mostra un tratto di spine) tra ogni coppia di
                // blocchi, anche quando c'è un bridge (lo spazio finisce sopra
                // la strip del transit del blocco successivo).
                const showSpacer = !editMode && !isLastBlock;

                return (
                  <div key={block.id}>
                    {/* Transit (bridge IN) — SOPRA l'attività; editor apribile
                        dall'azione TRANSIT anche senza bridge esistente */}
                    {expandedBridgeKey === bridgeInKey ? (
                      <BridgeEditor
                        bridge={block.bridge_in_json ?? null}
                        onSave={(b) => { patchBridge(block.id, "in", b); setExpandedBridgeKey(null); }}
                        onClose={() => setExpandedBridgeKey(null)}
                        onDelete={() => { patchBridge(block.id, "in", null); setExpandedBridgeKey(null); }}
                      />
                    ) : block.bridge_in_json ? (
                      <BridgeStrip bridge={block.bridge_in_json} />
                    ) : null}

                    {/* Block row + popover */}
                    <SingleBlock
                      block={block}
                      editMode={editMode}
                      popoverOpen={popoverBlockId === block.id}
                      transitOpen={expandedBridgeKey === bridgeInKey}
                      onOpenPopover={() => setPopoverBlockId(block.id)}
                      onClosePopover={() => setPopoverBlockId(null)}
                      onEditTransit={() => toggleBridge(block.id, "in")}
                      onPatchInstance={(patch) => patchInstance(block.id, patch)}
                      onDelete={() => deleteBlock(block.id)}
                    />

                    {/* Read-mode: spazio tra attività senza bridge → mostra la spine */}
                    {showSpacer && <div className="h-8" aria-hidden />}

                    {/* Add zone after block (between this and next, or at end of section) */}
                    {!isLastBlock && renderAddZone(block.id, slot)}
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
