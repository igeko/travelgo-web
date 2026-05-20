"use client";

/**
 * ActivityTimeline — Day Editor (embedded)
 *
 * Pure timeline component, no chrome. Show map + AI organize + view toggle
 * are provided by the host page, NOT by this component.
 *
 * Props:
 *   dayId        — Day ID
 *   tripId       — Trip ID (for autocomplete + auth)
 *   initialBlocks — server-fetched blocks (avoids flash)
 *   editMode     — if false, all read-only
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useTimeline } from "./useTimeline";
import { TimelineBlock, SPINE_LEFT } from "./TimelineBlock";
import { AddAffordance } from "./AddAffordance";
import type { TimelineBlock as Block, SlotKey, SearchResult } from "./types";
import { SLOT_ORDER } from "./types";

type Props = {
  dayId: string;
  tripId: string;
  initialBlocks: Block[];
  editMode?: boolean;
};

/* ─── Section divider ─── */
function SectionDivider({ slot, count, t }: { slot: SlotKey; count: number; t: any }) {
  return (
    <div className="sec-div">
      <span className="sec-lbl">{t(`ActivityTimeline.section.${slot}`)}</span>
      <span className="sec-line"></span>
      <span className="sec-count">{count} {t("ActivityTimeline.acts")}</span>
    </div>
  );
}

/* ─── ActivityTimeline ─── */
export function ActivityTimeline({
  dayId,
  tripId,
  initialBlocks,
  editMode = false,
}: Props) {
  const t = useTranslations();
  const {
    blocks,
    addBlock,
    addFromEntity,
    patchInstance,
    deleteBlock,
    patchBridge,
  } = useTimeline({ dayId, initialBlocks });

  /* ── Group by slot ── */
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

  /* ── Handler for autocomplete entity ── */
  async function handleAddFromEntity(entity: SearchResult, afterBlockId?: string) {
    await addFromEntity(
      { id: entity.id, title: entity.title, type: entity.type, location: entity.location },
      afterBlockId,
    );
  }

  async function handleCreateActivity(title: string, afterBlockId?: string) {
    await addBlock(
      { title, type: "place", slot: "morning", fuzzy: !title },
      afterBlockId,
    );
  }

  return (
    <div>
      {/* ── Toolbar (minimal, only "Day itinerary" eyebrow) ── */}
      <div className="day-toolbar mb-3">
        <span className="dt-eyebrow">{t("ActivityTimeline.dayItinerary")}</span>
      </div>

      {/* ── Timeline spine ── */}
      <div className="relative">
        {blocks.length === 0 && (
          <div
            className="py-10 text-center text-meta text-ink-faint"
            style={{ paddingLeft: SPINE_LEFT + 16 }}
          >
            {t("ActivityTimeline.noActivities")}
          </div>
        )}

        {activeSlots.map((slot) => {
          const slotBlocks = slotGroups[slot];
          return (
            <div key={slot}>
              <SectionDivider slot={slot} count={slotBlocks.length} t={t} />

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

                    {/* Add affordance between blocks */}
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

              {/* Add affordance at end of section */}
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

        {/* Add at end if no slots */}
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
    </div>
  );
}
