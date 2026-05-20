"use client";

/**
 * useTimeline — stato locale + optimistic updates + auto-save
 *
 * Gestisce la lista dei blocchi del giorno, le operazioni CRUD
 * e il drag-and-drop order. Auto-save con debounce 800ms.
 */

import { useState, useCallback, useRef } from "react";
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
      const res = await fetch(`/api/days/${dayId}/activities`);
      if (res.ok) {
        const { data } = await res.json();
        setBlocks(data);
      }
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

    const res = await fetch(`/api/days/${dayId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, position }),
    });

    if (res.ok) {
      const { data: created } = (await res.json()) as { data: TimelineBlock };
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(afterIdx + 1, 0, created);
        return next;
      });
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

    const res = await fetch(`/api/scheduled-activities/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      // Rollback
      await loadBlocks();
    }
  }, [loadBlocks]);

  const deleteBlock = useCallback(async (blockId: string) => {
    // Optimistic
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));

    const res = await fetch(`/api/scheduled-activities/${blockId}`, { method: "DELETE" });
    if (!res.ok) await loadBlocks();
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

    await fetch(`/api/scheduled-activities/${blockId}/bridge`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, bridge }),
    });
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
        fetch(`/api/scheduled-activities/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: u.position, slot: u.slot }),
        })
      )
    );
  }, [blocks, scheduleReload]);

  /* ── AI Organize ──────────────────────────────────────────────── */

  const aiOrganize = useCallback(async () => {
    setOrganizing(true);
    try {
      const res = await fetch(`/api/days/${dayId}/activities/organize`, { method: "POST" });
      if (res.ok) {
        const { data: organized } = await res.json();
        setBlocks(organized);
      }
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
