"use client";

/**
 * useTimeline — stato locale + optimistic updates + auto-save
 *
 * Gestisce la lista dei blocchi del giorno, le operazioni CRUD
 * e il drag-and-drop order. Auto-save con debounce 800ms.
 */

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/client";
import type { TimelineBlock, InstancePatch, NewBlockPayload, BridgeData } from "./types";

type UseTimelineOptions = {
  dayId: string;
  initialBlocks: TimelineBlock[];
};

export function useTimeline({ dayId, initialBlocks }: UseTimelineOptions) {
  const [blocks, setBlocks] = useState<TimelineBlock[]>(initialBlocks);
  const [saving, setSaving] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── helpers ──────────────────────────────────────────────────── */

  function scheduleReload() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => loadBlocks(), 800);
  }

  const loadBlocks = useCallback(async () => {
    setSaving(true);
    try {
      setBlocks(await api.activities.listForDay(dayId));
    } catch {
      // keep current blocks on failure
    } finally {
      setSaving(false);
    }
  }, [dayId]);

  /* ── CRUD ─────────────────────────────────────────────────────── */

  const addBlock = useCallback(async (payload: NewBlockPayload, afterBlockId?: string) => {
    // Calcola position dopo il blocco di riferimento
    const afterIdx = afterBlockId
      ? blocks.findIndex((b) => b.id === afterBlockId)
      : blocks.length - 1;
    const position = afterIdx >= 0 ? (blocks[afterIdx]?.position ?? afterIdx) + 1 : 1;

    try {
      const created = await api.activities.addToDay(dayId, { ...payload, position });
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(afterIdx + 1, 0, created);
        return next;
      });
    } catch {
      // creation failed — leave list unchanged
    }
  }, [blocks, dayId]);

  const addFromEntity = useCallback(async (
    entity: { id: string; title: string; type: TimelineBlock["type"]; location?: string | null },
    afterBlockId?: string,
  ) => {
    return addBlock({
      title:     entity.title,
      type:      entity.type,
      slot:      "morning",
      fuzzy:     false,
      entity_id: entity.id,
    } as NewBlockPayload & { entity_id: string }, afterBlockId);
  }, [addBlock]);

  const patchInstance = useCallback(async (blockId: string, patch: InstancePatch) => {
    // Optimistic
    setBlocks((prev) =>
      prev.map((b) => b.id === blockId ? { ...b, ...patch } : b)
    );

    try {
      await api.activities.updateInstance(blockId, patch as Record<string, unknown>);
    } catch {
      await loadBlocks(); // rollback
    }
  }, [loadBlocks]);

  const deleteBlock = useCallback(async (blockId: string) => {
    // Optimistic
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));

    try {
      await api.activities.removeFromDay(blockId);
    } catch {
      await loadBlocks();
    }
  }, [loadBlocks]);

  const patchBridge = useCallback(async (
    blockId: string,
    direction: "in" | "out",
    bridge: Partial<BridgeData> | null,
  ) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? {
              ...b,
              bridge_in_json:  direction === "in"  ? (bridge as BridgeData) : b.bridge_in_json,
              bridge_out_json: direction === "out" ? (bridge as BridgeData) : b.bridge_out_json,
            }
          : b
      )
    );

    await api.activities
      .setBridge(blockId, direction, bridge as Record<string, unknown> | null)
      .catch(() => {});
  }, []);

  /* ── Reorder (drag) ───────────────────────────────────────────── */

  const reorder = useCallback(async (fromId: string, toId: string) => {
    setBlocks((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((b) => b.id === fromId);
      const toIdx   = next.findIndex((b) => b.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      // ricalcola position
      return next.map((b, i) => ({ ...b, position: i + 1 }));
    });

    // Persist in background
    scheduleReload();
    const updated = blocks.map((b, i) => ({ id: b.id, position: i + 1, slot: b.slot }));
    await Promise.all(
      updated.map((u) =>
        api.activities.updateInstance(u.id, { position: u.position, slot: u.slot }).catch(() => {}),
      ),
    );
  }, [blocks, scheduleReload]);

  /* ── AI Organize ──────────────────────────────────────────────── */

  const aiOrganize = useCallback(async () => {
    setOrganizing(true);
    try {
      setBlocks(await api.activities.organize(dayId));
    } catch {
      // organize failed — keep current order
    } finally {
      setOrganizing(false);
    }
  }, [dayId]);

  return {
    blocks,
    saving,
    organizing,
    loadBlocks,
    addBlock,
    addFromEntity,
    patchInstance,
    deleteBlock,
    patchBridge,
    reorder,
    aiOrganize,
  };
}
