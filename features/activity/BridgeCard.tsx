"use client";

import { useState } from "react";
import { IconChevronRight, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { SoftField } from "@/components/ui/SoftField";
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
        <span className="text-mini text-ink-soft">
          {TRANSPORT_LABEL[transport]} · {duration} min
        </span>
        {line && <span className="text-tiny text-ink-faint truncate">· {line}</span>}
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
        <span className="text-tiny font-bold uppercase tracking-eyebrow-wide text-orange">
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
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-tiny font-medium border transition-all",
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
          <SoftField
            label="Durata"
            value={duration}
            onChange={setDuration}
            placeholder="es. 15"
            type="text"
            inputProps={{ min: 1 }}
          >
            <SoftField.Suffix>
              <span className="text-mini text-ink-faint">min</span>
            </SoftField.Suffix>
          </SoftField>
        </div>
        <div className="flex-1">
          <SoftField
            label="Linea"
            value={line}
            onChange={setLine}
            placeholder="es. Hibiya Line"
          />
        </div>
      </div>

      {/* Fermate */}
      <div className="mb-3">
        <SoftField
          label="Fermate"
          value={stops}
          onChange={setStops}
          placeholder="es. Toyosu → Shibuya"
        />
      </div>

      {/* Nota libera */}
      <div className="mb-4">
        <SoftField
          label="Nota libera"
          value={note}
          onChange={setNote}
          placeholder="es. Biglietto incluso nel pass"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          className="bg-orange text-white rounded-lg px-4 py-1.5 text-mini font-semibold hover:bg-orange/90 transition-colors"
        >
          Salva
        </button>
        <button
          onClick={handleFreeBuffer}
          className="text-tiny text-ink-faint hover:text-ink underline transition-colors"
        >
          Converti in tempo libero
        </button>
      </div>
    </div>
  );
}
