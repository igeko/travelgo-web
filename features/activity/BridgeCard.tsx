"use client";

import { useState } from "react";
import { IconChevronRight, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { BridgeData } from "./types";

type Transport = BridgeData["transport"];

const TRANSPORT_EMOJI: Record<Transport, string> = {
  walk: "🚶", metro: "🚇", bus: "🚌", taxi: "🚕",
  bike: "🚴", car: "🚗", train: "🚆",
};
const TRANSPORT_LABEL: Record<Transport, string> = {
  walk: "A piedi", metro: "Metro", bus: "Bus", taxi: "Taxi",
  bike: "Bici", car: "Auto", train: "Treno",
};
const ALL_TRANSPORTS: Transport[] = ["walk", "metro", "bus", "taxi", "bike", "car", "train"];

type Props = {
  bridge: BridgeData;
  onSave: (bridge: Partial<BridgeData> | null) => void;
};

export function BridgeCard({ bridge, onSave }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [transport, setTransport] = useState<Transport>(bridge.transport);
  const [duration, setDuration]   = useState(String(bridge.duration_min));
  const [line, setLine]           = useState(bridge.line ?? "");
  const [stops, setStops]         = useState(bridge.stops ?? "");
  const [note, setNote]           = useState(bridge.note ?? "");

  function handleSave() {
    onSave({
      transport,
      duration_min: parseInt(duration, 10) || 0,
      line:  line || null,
      stops: stops || null,
      note:  note || null,
    });
    setExpanded(false);
  }

  function handleFreeBuffer() {
    onSave(null); // null → rimuove il ponte
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group flex items-center gap-2 w-full text-left rounded-lg px-3 py-1.5 hover:bg-surface-soft transition-colors"
      >
        <span className="text-base leading-none shrink-0">{TRANSPORT_EMOJI[transport]}</span>
        <span className="text-[12px] text-ink-soft">
          {TRANSPORT_LABEL[transport]} · {duration} min
        </span>
        {line && <span className="text-[11px] text-ink-faint truncate">· {line}</span>}
        <IconChevronRight
          size={12}
          className="text-ink-faint ml-auto opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
        />
      </button>
    );
  }

  return (
    <div className="my-1.5 rounded-xl border-2 border-orange/35 bg-orange/[0.03] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange">
          Spostamento
        </span>
        <button onClick={() => setExpanded(false)} className="text-ink-faint hover:text-ink p-1 transition-colors">
          <IconX size={14} />
        </button>
      </div>

      {/* Transport chips */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {ALL_TRANSPORTS.map((t) => (
          <button
            key={t}
            onClick={() => setTransport(t)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
              transport === t
                ? "bg-orange text-white border-orange shadow-sm"
                : "bg-white text-ink-soft border-border hover:border-orange/50 hover:text-ink"
            )}
          >
            <span>{TRANSPORT_EMOJI[t]}</span>
            <span>{TRANSPORT_LABEL[t]}</span>
          </button>
        ))}
      </div>

      {/* Duration + linea */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
            Durata
          </label>
          <div className="flex items-center gap-1 border border-border rounded-lg px-3 py-2 bg-white focus-within:border-orange/50 transition-colors">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full text-[13px] text-ink outline-none bg-transparent"
              min={1}
            />
            <span className="text-[12px] text-ink-faint shrink-0">min</span>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
            Linea
          </label>
          <input
            type="text"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="es. Hibiya Line"
            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint outline-none focus:border-orange/50 transition-colors bg-white"
          />
        </div>
      </div>

      {/* Fermate */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
          Fermate
        </label>
        <input
          type="text"
          value={stops}
          onChange={(e) => setStops(e.target.value)}
          placeholder="es. Toyosu → Shibuya"
          className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint outline-none focus:border-orange/50 transition-colors bg-white"
        />
      </div>

      {/* Nota libera */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
          Nota libera
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="es. Biglietto incluso nel pass"
          className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint outline-none focus:border-orange/50 transition-colors bg-white"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          className="bg-orange text-white rounded-lg px-4 py-1.5 text-[12px] font-semibold hover:bg-orange/90 transition-colors"
        >
          Salva
        </button>
        <button
          onClick={handleFreeBuffer}
          className="text-[11px] text-ink-faint hover:text-ink underline transition-colors"
        >
          Converti in tempo libero
        </button>
      </div>
    </div>
  );
}
