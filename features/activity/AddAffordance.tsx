"use client";

import { useState } from "react";
import { IconPlus, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { SoftField } from "@/components/ui/SoftField";
import { ActivityAutocomplete } from "./ActivityAutocomplete";
import type { BlockType, SlotKey, SearchResult } from "./types";

const TYPE_OPTIONS: { type: BlockType; emoji: string; label: string }[] = [
  { type: "place",  emoji: "📍", label: "Luogo" },
  { type: "meal",   emoji: "🍽️", label: "Pasto" },
  { type: "pause",  emoji: "☕", label: "Pausa" },
  { type: "action", emoji: "✅", label: "Azione" },
  { type: "move",   emoji: "↔️", label: "Sposta" },
];

type Props = {
  tripId: string;
  dayId: string;
  defaultSlot: SlotKey;
  spineLeft: number;       // px — allineamento con la spine
  onAddBlock: (opts: { title: string; type: BlockType; slot: SlotKey; fuzzy: boolean }) => void;
  onAddFromEntity: (entity: SearchResult) => void;
  onCreateActivity: (title: string) => void;
};

type Mode = "idle" | "block" | "activity";

export function AddAffordance({
  tripId, dayId, defaultSlot, spineLeft,
  onAddBlock, onAddFromEntity, onCreateActivity,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [mode, setMode]       = useState<Mode>("idle");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockType, setBlockType]   = useState<BlockType>("place");

  const isOpen = mode !== "idle";

  function reset() {
    setMode("idle");
    setBlockTitle("");
    setBlockType("place");
  }

  function submitBlock() {
    if (!blockTitle.trim()) return;
    onAddBlock({
      title: blockTitle.trim(),
      type: blockType,
      slot: defaultSlot,
      fuzzy: !blockTitle.trim(), // se non ha titolo → fuzzy (non dovrebbe succedere)
    });
    reset();
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => !isOpen && setHovered(false)}
    >
      {/* ── Affordance trigger (hover) ── */}
      {!isOpen && (
        <div
          className={cn(
            "relative flex items-center gap-2 transition-all duration-200 overflow-hidden",
            hovered ? "opacity-100 h-8 my-0.5" : "opacity-0 h-0"
          )}
          style={{ paddingLeft: spineLeft + 10 }}
        >
          {/* Dot on spine */}
          <div
            className="absolute flex items-center justify-center w-[14px] h-[14px] rounded-full bg-orange z-10 shadow-sm"
            style={{ left: spineLeft - 7, top: "50%", transform: "translateY(-50%)" }}
          >
            <IconPlus size={9} className="text-white" />
          </div>

          <button
            onClick={() => setMode("block")}
            className="inline-flex items-center gap-1 bg-orange text-white text-[11px] font-semibold px-2.5 py-1 rounded-full hover:bg-orange/90 transition-colors shadow-sm"
          >
            <IconPlus size={9} />
            blocco
          </button>
          <button
            onClick={() => setMode("activity")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft bg-white border border-border px-2.5 py-1 rounded-full hover:border-orange/50 hover:text-ink transition-colors"
          >
            <IconPlus size={9} />
            attività
          </button>
        </div>
      )}

      {/* ── Block composer ── */}
      {mode === "block" && (
        <div className="my-1 rounded-xl border-2 border-orange/40 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[11px] font-bold text-ink shrink-0">Tipo</span>
            <div className="flex gap-1 flex-wrap flex-1">
              {TYPE_OPTIONS.map(({ type, emoji, label }) => (
                <button
                  key={type}
                  onClick={() => setBlockType(type)}
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors",
                    blockType === type
                      ? "bg-orange text-white border-orange"
                      : "text-ink-soft border-border hover:border-orange/40"
                  )}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <button onClick={reset} className="text-ink-faint hover:text-ink shrink-0 transition-colors">
              <IconX size={13} />
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <SoftField
                value={blockTitle}
                onChange={setBlockTitle}
                placeholder="Descrivi il blocco…"
                inputProps={{
                  autoFocus: true,
                  onKeyDown: (e: any) => {
                    if (e.key === "Enter") submitBlock();
                    if (e.key === "Escape") reset();
                  },
                } as any}
              />
            </div>
            <button
              onClick={submitBlock}
              disabled={!blockTitle.trim()}
              className="bg-orange text-white rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-orange/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Aggiungi
            </button>
          </div>
          {!blockTitle.trim() && (
            <p className="mt-1.5 text-[11px] text-ink-faint italic">
              Senza testo → blocco fuzzy
            </p>
          )}
        </div>
      )}

      {/* ── Activity autocomplete ── */}
      {mode === "activity" && (
        <div className="my-1">
          <ActivityAutocomplete
            tripId={tripId}
            dayId={dayId}
            onSelect={(result) => { onAddFromEntity(result); reset(); }}
            onCreateNew={(title) => { onCreateActivity(title); reset(); }}
            onClose={reset}
          />
        </div>
      )}
    </div>
  );
}
