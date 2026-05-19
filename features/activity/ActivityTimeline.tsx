"use client";

/**
 * ActivityTimeline — Day Editor
 *
 * Embedding: sezione "Day itinerary" dentro TripDayView.
 * Chrome (header, save button, edit toggle) è tutto della pagina ospite.
 *
 * Props:
 *   dayId        — ID del giorno
 *   tripId       — ID del trip (per autocomplete + auth)
 *   initialBlocks — server-fetched blocks (evita flash)
 *   editMode     — se false, tutto read-only
 */

import { useMemo } from "react";
import { IconMap, IconSparkles } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useTimeline } from "./useTimeline";
import { TimelineBlock, SPINE_LEFT } from "./TimelineBlock";
import { AddAffordance } from "./AddAffordance";
import type { TimelineBlock as Block, SlotKey, SearchResult } from "./types";
import { SLOT_ORDER, SLOT_LABEL } from "./types";

type View = "lista" | "timeline" | "racconto";

type Props = {
  dayId: string;
  tripId: string;
  initialBlocks: Block[];
  editMode?: boolean;
  view?: View;
  onViewChange?: (v: View) => void;
  onShowMap?: () => void;
};

/* ─── Section divider ─── */
function SectionDivider({ slot, count }: { slot: SlotKey; count: number }) {
  return (
    <div
      className="flex items-center gap-3 py-3 mt-2 first:mt-0"
      style={{ paddingLeft: SPINE_LEFT + 14 }}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange whitespace-nowrap">
        {SLOT_LABEL[slot]}
      </span>
      <div className="flex-1 h-[1.5px] bg-orange/20 rounded-full" />
      <span className="text-[10px] text-ink-faint uppercase tracking-[0.10em] shrink-0">
        {count} att
      </span>
    </div>
  );
}

/* ─── View toggle ─── */
const VIEWS: { key: View; label: string }[] = [
  { key: "lista",    label: "Lista"    },
  { key: "timeline", label: "Timeline" },
  { key: "racconto", label: "Racconto" },
];

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex items-center bg-surface-soft rounded-full border border-border p-[3px] gap-[2px]">
      {VIEWS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150",
            view === key
              ? "bg-white text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── ActivityTimeline ─── */
export function ActivityTimeline({
  dayId,
  tripId,
  initialBlocks,
  editMode = false,
  view = "timeline",
  onViewChange,
  onShowMap,
}: Props) {
  const {
    blocks,
    organizing,
    addBlock,
    addFromEntity,
    patchInstance,
    deleteBlock,
    patchBridge,
    aiOrganize,
  } = useTimeline({ dayId, initialBlocks });

  /* ── Raggruppamento per slot ── */
  const slotGroups = useMemo(() => {
    const groups: Record<SlotKey, Block[]> = {
      morning: [], afternoon: [], evening: [], night: [],
    };
    for (const b of blocks) {
      const slot = (b.slot as SlotKey) ?? "morning";
      groups[slot].push(b);
    }
    return groups;
  }, [blocks]);

  const activeSlots = SLOT_ORDER.filter((s) => slotGroups[s].length > 0);

  /* ── Handler per entity da autocomplete ── */
  async function handleAddFromEntity(entity: SearchResult, afterBlockId?: string) {
    await addFromEntity(
      { id: entity.id, title: entity.title, type: entity.type, location: entity.location },
      afterBlockId,
    );
  }

  async function handleCreateActivity(title: string, afterBlockId?: string) {
    // Crea come blocco fuzzy (nessuna entity) e poi l'utente può arricchirlo
    await addBlock(
      { title, type: "place", slot: "morning", fuzzy: !title },
      afterBlockId,
    );
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
          Day itinerary
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {onShowMap && (
            <button
              onClick={onShowMap}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-surface-soft transition-colors"
            >
              <IconMap size={14} />
              Show map
            </button>
          )}

          {editMode && (
            <button
              onClick={aiOrganize}
              disabled={organizing}
              className={cn(
                "inline-flex items-center gap-1.5 bg-orange text-white text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors shadow-sm",
                organizing ? "opacity-60 cursor-wait" : "hover:bg-orange/90"
              )}
            >
              <IconSparkles size={13} className={organizing ? "animate-spin" : ""} />
              {organizing ? "Organizzando…" : "Organizza questo giorno"}
            </button>
          )}

          {onViewChange && (
            <ViewToggle view={view} onChange={onViewChange} />
          )}
        </div>
      </div>

      {/* ── Vista Lista (placeholder) ── */}
      {view === "lista" && (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <p className="text-[13px] text-ink-faint italic">Vista Lista — in arrivo</p>
        </div>
      )}

      {/* ── Vista Racconto (placeholder) ── */}
      {view === "racconto" && (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <p className="text-[13px] text-ink-faint italic">Vista Racconto — in arrivo</p>
        </div>
      )}

      {/* ── Vista Timeline (spine) ── */}
      {view === "timeline" && (
        <div className="relative">
          {/* Spine verticale continua */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-orange/15 rounded-full pointer-events-none"
            style={{ left: SPINE_LEFT }}
          />

          {blocks.length === 0 && (
            <div
              className="py-10 text-center text-[13px] text-ink-faint"
              style={{ paddingLeft: SPINE_LEFT + 16 }}
            >
              Nessuna attività — aggiungi il primo blocco
            </div>
          )}

          {activeSlots.map((slot) => {
            const slotBlocks = slotGroups[slot];
            return (
              <div key={slot}>
                <SectionDivider slot={slot} count={slotBlocks.length} />

                {slotBlocks.map((block, idx) => {
                  const isLast = idx === slotBlocks.length - 1;

                  return (
                    <div key={block.id}>
                      <TimelineBlock
                        block={block}
                        editMode={editMode}
                        onPatchInstance={(patch) => patchInstance(block.id, patch)}
                        onDelete={() => deleteBlock(block.id)}
                        onPatchBridge={(dir, bridge) => patchBridge(block.id, dir, bridge)}
                      />

                      {/* Add affordance tra blocchi (non dopo l'ultimo del giorno) */}
                      {editMode && !isLast && (
                        <AddAffordance
                          tripId={tripId}
                          dayId={dayId}
                          defaultSlot={slot}
                          spineLeft={SPINE_LEFT}
                          onAddBlock={(opts) => addBlock(opts, block.id)}
                          onAddFromEntity={(entity) => handleAddFromEntity(entity, block.id)}
                          onCreateActivity={(title) => handleCreateActivity(title, block.id)}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Add affordance alla fine di ogni sezione */}
                {editMode && (
                  <AddAffordance
                    tripId={tripId}
                    dayId={dayId}
                    defaultSlot={slot}
                    spineLeft={SPINE_LEFT}
                    onAddBlock={(opts) => addBlock({ ...opts, slot })}
                    onAddFromEntity={(entity) => handleAddFromEntity(entity)}
                    onCreateActivity={(title) => handleCreateActivity(title)}
                  />
                )}
              </div>
            );
          })}

          {/* Add alla fine (se non ci sono slot o per aggiungere in coda) */}
          {editMode && activeSlots.length === 0 && (
            <AddAffordance
              tripId={tripId}
              dayId={dayId}
              defaultSlot="morning"
              spineLeft={SPINE_LEFT}
              onAddBlock={(opts) => addBlock(opts)}
              onAddFromEntity={(entity) => handleAddFromEntity(entity)}
              onCreateActivity={(title) => handleCreateActivity(title)}
            />
          )}
        </div>
      )}
    </div>
  );
}
