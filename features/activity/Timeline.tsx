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
import { StopComposer } from "./Timeline/StopComposer";
import { STOP_ICONS, stopIconNode } from "./Timeline/stopIcons";
import { Button } from "@/components/ui/Button";
import { IconPicker } from "@/components/ui/IconPicker";
import { PeriodBar, type PeriodTime } from "@/components/ui/PeriodBar";
import {
  IconCalendarTime, IconPlus, IconX, IconUnlink,
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

/* ─── geometry ──────────────────────────────────────────────────────
   Two left gutters: the wide one reserves room for the period labels
   ("MATTINA", …) to the left of the times; the narrow one drops that
   reserved width when labels are hidden. The spine line sits 13px left of
   the row content edge; the time/icon are positioned relative to the row
   so they follow the gutter automatically. Total width shrinks by the same
   delta as the gutter, so the content column keeps its width.
─────────────────────────────────────────────────────────────────── */
const SPINE_LEFT      = 110; // padding-left with period labels
const SPINE_LEFT_BARE = 84;  // padding-left without labels — reclaims the gutter
const SPINE_GAP       = 13;  // spine line offset left of the row content edge
const SPINE_X         = SPINE_LEFT - SPINE_GAP; // 97
const WIDTH           = 498;

/* ─── add state ──────────────────────────────────────────────────── */
type AddState =
  | { kind: "autocomplete"; afterBlockId?: string; slot: SlotKey }
  | { kind: "stop";         afterBlockId?: string; slot: SlotKey }
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
function SectionDivider({ slot, isFirst, hideLabel }: { slot: SlotKey; isFirst: boolean; hideLabel?: boolean }) {
  const tSlots = useTranslations("ActivityList.slots");
  // No label → no divider at all: the per-section spine already keeps the line
  // continuous, so we drop the reserved vertical space entirely.
  if (hideLabel) return null;
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
      {!hideLabel && (
        <span
          className="absolute text-tiny font-semibold tracking-[0.03em] uppercase text-orange select-none whitespace-nowrap"
          style={{
            // Bordo destro allineato a quello degli orari (SPINE_LEFT - 42).
            left: 0,
            width: SPINE_LEFT - 42,
            textAlign: "right",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {tSlots(slot)}
        </span>
      )}
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
      {bridge.note && <span className="text-ink-faint italic truncate">· {bridge.note}</span>}
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

/**
 * Estrae un orario "HH:mm" visualizzabile dal campo `time`. Il campo dovrebbe
 * sempre essere "HH:mm" o null, ma import/AI possono averci scritto stringhe
 * libere ("14:30 - 17:00", "tramonto", "pomeriggio/tramonto"…): in quel caso
 * mostriamo solo l'orario di partenza se presente, altrimenti niente — così la
 * colonna orario resta una clock pulita e non deborda mai sulla spine.
 */
function displayClock(time?: string | null): string | null {
  if (!time) return null;
  const m = time.match(/([0-2]?\d:[0-5]\d)/);
  return m ? m[1] : null;
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
  // "Make it a stop": flag indipendente dall'orario — una tappa può avere o
  // meno un orario; l'unica discriminante attività/tappa è `fuzzy`.
  const [stop, setStop] = useState<boolean>(!!block.fuzzy);

  const hasTime = time.hour !== undefined && time.minute !== undefined;

  function handleSave() {
    const timeStr = hasTime
      ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`
      : null;
    onSave({ slot, fuzzy: stop, time: timeStr });
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
      <div className="flex justify-between items-center gap-2 mt-2.5">
        {/* Toggle "make it a stop" → forza il fuzzy */}
        <button
          type="button"
          role="switch"
          aria-checked={stop}
          onClick={() => setStop((s) => !s)}
          className="group inline-flex items-center gap-2 cursor-pointer select-none"
        >
          <span
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
              stop ? "bg-orange" : "bg-border-strong",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                stop ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </span>
          <span className="text-tiny text-ink-soft group-hover:text-ink transition-colors">
            {tT("makeStop")}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" tone="neutral" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button size="sm" variant="solid" tone="neutral" onClick={handleSave}>
            {tCommon("apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── AddZone ────────────────────────────────────────────────────── */
/**
 * Affordance invisibile a riposo, compare solo all'hover: pallino "+"
 * sulla spine + due azioni piccole — "aggiungi attività" e "add stop".
 */
function AddZone({
  onAddActivity,
  onAddStop,
  alwaysVisible = false,
}: {
  onAddActivity: () => void;
  onAddStop: () => void;
  /** Mostra le azioni sempre (non solo all'hover) — es. timeline vuota. */
  alwaysVisible?: boolean;
}) {
  const t = useTranslations("Timeline.actions");
  const reveal = alwaysVisible
    ? "opacity-100"
    : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";
  return (
    <div className="group relative flex items-center w-full min-h-[20px] pl-5 my-0.5">
      {/* Small "+" dot on the spine */}
      <div
        className={cn(
          "absolute flex items-center justify-center rounded-full bg-orange text-white transition-opacity z-10 pointer-events-none",
          reveal,
        )}
        style={{ left: -21, top: "50%", transform: "translateY(-50%)", width: 18, height: 18 }}
        aria-hidden
      >
        <IconPlus size={11} />
      </div>

      {/* Azioni */}
      <div className={cn("flex items-center gap-2.5 transition-opacity", reveal)}>
        <button
          type="button"
          onClick={onAddActivity}
          className="text-tiny font-medium text-ink-soft hover:text-ink hover:underline underline-offset-[3px] cursor-pointer"
        >
          {t("addActivity")}
        </button>
        <span aria-hidden className="text-tiny text-ink-faint/60">·</span>
        <button
          type="button"
          onClick={onAddStop}
          className="text-tiny font-medium text-ink-soft hover:text-ink hover:underline underline-offset-[3px] cursor-pointer"
        >
          {t("addStop")}
        </button>
      </div>
    </div>
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
  onSetIcon,
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
  onSetIcon:        (icon: string) => void;
  onPatchInstance:  (patch: import("./types").InstancePatch) => void;
  onDelete:         () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const isFuzzy  = block.fuzzy;
  const showActs = editMode && (hovered || popoverOpen || transitOpen);
  const stopIcon = stopIconNode(block.icon);
  const clock    = displayClock(block.time);
  const tA = useTranslations("Timeline.actions");
  const tIcons = useTranslations("Timeline.stopIcons");
  const iconOptions = useMemo(
    () => STOP_ICONS.map((o) => ({ key: o.key, Icon: o.Icon, label: tIcons(o.key) })),
    [tIcons],
  );

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
          className="absolute text-[12.5px] font-medium tabular-nums text-right select-none transition-colors whitespace-nowrap overflow-hidden"
          style={{
            right:     "calc(100% + 42px)",
            width:      38,
            top:       "50%",
            transform: "translateY(-50%)",
            color:     hovered || popoverOpen ? "var(--color-ink-soft)" : "var(--color-ink-faint)",
          }}
        >
          {clock ? clock : <span className="opacity-30">—</span>}
        </span>

        {/* Spine icon — absolute, on the spine line. In edit mode è cliccabile
            per cambiare l'icona (popover IconPicker). */}
        <button
          type="button"
          onClick={editMode ? () => setIconOpen((o) => !o) : undefined}
          aria-label={editMode ? tA("changeIcon") : undefined}
          aria-hidden={!editMode}
          tabIndex={editMode ? 0 : -1}
          className={cn(
            "absolute flex items-center justify-center rounded-full transition-all duration-150 shadow-sm z-10 [&>svg]:w-3.5 [&>svg]:h-3.5",
            editMode && "cursor-pointer",
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
        >
          {stopIcon ?? (TYPE_ICON[block.type ?? "place"] ?? TYPE_ICON.place)}
        </button>

        {/* Icon picker popover — cambia icona dopo la creazione */}
        {iconOpen && editMode && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIconOpen(false)} aria-hidden />
            <div className="absolute z-40 top-full mt-1 left-0 w-[280px] rounded-md border border-border bg-surface shadow-[0_4px_24px_rgba(13,44,61,0.12)] p-2">
              <IconPicker
                value={block.icon ?? null}
                onChange={(key) => { onSetIcon(key); setIconOpen(false); }}
                options={iconOptions}
              />
            </div>
          </>
        )}

        {/* Name */}
        <button
          className={cn(
            "flex-1 min-w-0 text-left leading-snug transition-colors",
            isFuzzy
              ? "text-tiny uppercase tracking-[0.08em] font-semibold -ml-4"
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
              title={tA("schedule")}
              aria-label={tA("schedule")}
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
              title={tA("transit")}
              aria-label={tA("transit")}
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
              title={tA("unschedule")}
              aria-label={tA("unschedule")}
              className={cn(
                popoverOpen && "text-white/70 hover:text-white",
              )}
            >
              <IconUnlink />
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
  /** Hide the period (morning/afternoon/…) labels — keeps the spine + spacing. */
  hideSlotLabels?: boolean;
  /** Fired after a persisted timeline edit, so the owner can resync the day's activities. */
  onMutated?:    () => void;
};

export function Timeline({ dayId, tripId, initialBlocks, editMode = false, hideSlotLabels = false, onMutated }: Props) {
  const tT = useTranslations("Timeline");
  const {
    blocks,
    addFromEntity,
    addStop,
    setIcon,
    patchInstance,
    deleteBlock,
    patchBridge,
  } = useTimeline({ dayId, initialBlocks, onMutated });

  /* ── local expansion state ───────────────────────────────────── */
  const [addState,       setAddState]       = useState<AddState>(null);
  const [popoverBlockId, setPopoverBlockId] = useState<string | null>(null);
  // Transient error shown when trying to add an activity already on the day.
  const [dupError,       setDupError]       = useState<string | null>(null);

  // bridge key = "blockId-in" | "blockId-out"
  const [expandedBridgeKey, setExpandedBridgeKey] = useState<string | null>(null);

  // Without period labels the left gutter is narrowed and the whole timeline
  // shrinks by the same delta — the content column keeps its width.
  const spineLeft = hideSlotLabels ? SPINE_LEFT_BARE : SPINE_LEFT;
  const spineX    = spineLeft - SPINE_GAP;
  const width     = WIDTH - (SPINE_LEFT - spineLeft);

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
        // Tiebreak su position: gli "stop" fuzzy ereditano l'ora del vicino
        // (Modello 1) e la position decide se stanno prima o dopo di esso.
        const at = displayClock(a.time);
        const bt = displayClock(b.time);
        if (at && bt)
          return at.localeCompare(bt) || ((a.position ?? 0) - (b.position ?? 0));
        if (at) return -1;
        if (bt) return 1;
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

  function handleAddStop(afterBlockId: string | undefined, slot: SlotKey) {
    setAddState({ kind: "stop", afterBlockId, slot });
    setExpandedBridgeKey(null);
    setDupError(null);
  }

  // Crea uno stop fuzzy (titolo + icona) e apre SCHEDULE (orario opzionale).
  async function handleCreateStop(
    title: string,
    icon: string,
    afterBlockId: string | undefined,
    slot: SlotKey,
  ): Promise<boolean> {
    const created = await addStop(title, icon, slot, afterBlockId);
    if (created) {
      setAddState(null);
      setPopoverBlockId(created.id);
      return true;
    }
    return false;
  }

  // Seleziona un'attività esistente del viaggio: la programma nel giorno e
  // apre subito il pannello SCHEDULE sul nuovo blocco.
  async function handleSelectActivity(
    option: TripActivityOption,
    afterBlockId: string | undefined,
    slot: SlotKey,
    icon: string | null,
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
      if (icon) setIcon(created.id, created.activity_id, icon);
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
  function renderAddZone(afterBlockId: string | undefined, slot: SlotKey, alwaysVisible = false) {
    if (!editMode) return null;

    const autoHere = isSameAdd(addState, afterBlockId, slot) && addState?.kind === "autocomplete";
    const stopHere = isSameAdd(addState, afterBlockId, slot) && addState?.kind === "stop";

    return (
      <div key={`az-${afterBlockId ?? "start"}-${slot}`}>
        {!autoHere && !stopHere && (
          <AddZone
            onAddActivity={() => handleAddActivity(afterBlockId, slot)}
            onAddStop={() => handleAddStop(afterBlockId, slot)}
            alwaysVisible={alwaysVisible}
          />
        )}
        {autoHere && (
          <AddActivityForm
            tripId={tripId}
            onSelect={(opt, icon) => handleSelectActivity(opt, afterBlockId, slot, icon)}
            onClose={() => setAddState(null)}
            excludeIds={blocks.map((b) => b.activity_id)}
          />
        )}
        {stopHere && (
          <StopComposer
            onCreate={(title, icon) => handleCreateStop(title, icon, afterBlockId, slot)}
            onClose={() => setAddState(null)}
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
      style={{ marginLeft: spineLeft }}
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
          className="py-8 text-center text-meta text-ink-faint"
          style={{ paddingLeft: spineLeft + 16 }}
        >
          {tT("noActivities")}.
        </div>
        {editMode && (
          <div className="relative pb-4" style={{ paddingLeft: spineLeft }}>
            {renderAddZone(undefined, "morning", true)}
          </div>
        )}
      </div>
    );
  }

  /* ── main render ─────────────────────────────────────────────── */
  return (
    <div style={{ minWidth: width, maxWidth: width }}>
      {dupNotice}
      {activeSlots.map((slot, slotIdx) => {
        const slotBlocks = slotGroups[slot];
        const isFirstSection = slotIdx === 0;
        const isLastSection  = slotIdx === activeSlots.length - 1;

        // Determine if the first block of this section starts with bridge_in (no add-zone before it when not in editMode)
        const firstBlockHasBridgeIn = !!slotBlocks[0]?.bridge_in_json;

        return (
          <div key={slot}>
            <SectionDivider slot={slot} isFirst={isFirstSection} hideLabel={hideSlotLabels} />

            {/* Spine section */}
            <div
              className="relative"
              style={{ paddingLeft: spineLeft }}
            >
              {/* Vertical spine line */}
              <div
                className="absolute w-[1.5px] bg-[rgba(13,44,61,0.14)] pointer-events-none"
                style={{
                  left:   spineX,
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
                      onSetIcon={(icon) => setIcon(block.id, block.activity_id, icon)}
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
