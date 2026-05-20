"use client";

/**
 * useTimeline — stato locale + optimistic updates + auto-save
 *
 * Gestisce la lista dei blocchi del giorno, le operazioni CRUD
 * e il drag-and-drop order. Auto-save con debounce 800ms.
 */

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/client";
import type { TimelineBlock, InstancePatch, NewBlockPayload, BridgeData, SlotKey } from "./types";

type UseTimelineOptions = {
  dayId: string;
  initialBlocks: TimelineBlock[];
};

export function useTimeline({ dayId, initialBlocks }: UseTimelineOptions) {
  const [blocks, setBlocks] = useState<TimelineBlock[]>(initialBlocks);
  const [saving, setSaving] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror the source list whenever the parent replaces it (new array
  // reference) — e.g. the day's activities finish loading after a day switch,
  // or a realtime reload. Local edits go through setBlocks and never change
  // the parent's reference, so they are never clobbered. Adjusted during
  // render (the sanctioned alternative to a state-syncing effect).
  const [prevInitial, setPrevInitial] = useState(initialBlocks);
  if (initialBlocks !== prevInitial) {
    setPrevInitial(initialBlocks);
    setBlocks(initialBlocks);
  }

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
        // addToDay is idempotent: if the entity was already scheduled on the
        // day it returns the existing occurrence — don't insert it twice.
        if (prev.some((b) => b.id === created.id)) return prev;
        const next = [...prev];
        next.splice(afterIdx + 1, 0, created);
        return next;
      });
      return created;
    } catch {
      // creation failed — leave list unchanged
      return undefined;
    }
  }, [blocks, dayId]);

  const addFromEntity = useCallback(async (
    entity: { id: string; title: string; type: TimelineBlock["type"]; location?: string | null },
    afterBlockId?: string,
    slot: SlotKey = "morning",
    time?: string | null,
  ) => {
    return addBlock({
      title:     entity.title,
      type:      entity.type,
      slot,
      fuzzy:     false,
      entity_id: entity.id,
      ...(time ? { time } : {}),
    } as NewBlockPayload & { entity_id: string }, afterBlockId);
  }, [addBlock]);

  /**
   * Crea uno "stop" fuzzy (titolo + icona, senza orario). Modello 1:
   * eredita l'ora del blocco sopra (se ne ha una) per ordinarsi subito
   * dopo di esso; resta fuzzy (la UI non mostra l'ora).
   */
  const addStop = useCallback(async (
    title: string,
    icon: string,
    slot: SlotKey,
    afterBlockId?: string,
  ) => {
    const above = afterBlockId ? blocks.find((b) => b.id === afterBlockId) : undefined;
    const time = above?.time ?? undefined;
    return addBlock({
      title,
      type:  "pause",
      slot,
      fuzzy: true,
      ...(time ? { time } : {}),
      icon,
    } as NewBlockPayload & { icon: string }, afterBlockId);
  }, [addBlock, blocks]);

  /** Cambia l'icona (campo entità) di un blocco. Optimistic + persist. */
  const setIcon = useCallback(async (blockId: string, activityId: string, icon: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, icon } : b)));
    try {
      await api.activities.updateEntity(activityId, { icon });
    } catch {
      await loadBlocks();
    }
  }, [loadBlocks]);

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
    addStop,
    setIcon,
    patchInstance,
    deleteBlock,
    patchBridge,
    reorder,
    aiOrganize,
  };
}
