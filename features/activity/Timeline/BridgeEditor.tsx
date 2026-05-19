"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconCircleMinus, IconPencil, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { BridgeData } from "@/lib/dal/trips";
import { TRANSPORT_ICON } from "./icons";

type BridgeTransport = BridgeData["transport"];

const BRIDGE_TRANSPORT_KEYS: BridgeTransport[] = ["walk", "metro", "bus", "taxi", "bike"];

export function BridgeEditor({
  bridge,
  onSave,
  onClose,
  onMarkFree,
}: {
  bridge: BridgeData | null;
  onSave:     (b: BridgeData) => void;
  onClose:    () => void;
  onMarkFree: () => void;
}) {
  const tT = useTranslations("Timeline");
  const [transport, setTransport] = useState<BridgeTransport>(bridge?.transport ?? "walk");
  const [duration,  setDuration]  = useState(bridge?.duration_min?.toString() ?? "");
  const [line,      setLine]      = useState(bridge?.line ?? "");
  const [note,      setNote]      = useState(bridge?.note ?? "");

  return (
    <div className="relative py-1">
      <div
        className="absolute top-0 bottom-0 w-[1.5px] pointer-events-none"
        style={{
          left: -19,
          background: "repeating-linear-gradient(180deg, var(--color-orange) 0 3px, transparent 3px 7px)",
        }}
        aria-hidden
      />
      <div className="rounded-[var(--radius-md)] border-[1.5px] border-orange bg-white p-[11px_13px] shadow-[0_4px_14px_rgba(244,123,58,0.10)]">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-orange-deep font-medium mb-2">
          <IconPencil size={11} />
          <span>{tT("edit.editTransfer")}</span>
          <button aria-label={tT("edit.close")} className="ml-auto text-ink-faint hover:text-ink transition-colors" onClick={onClose}>
            <IconX size={13} />
          </button>
        </div>

        <div className="mb-2">
          <span className="block text-[10.5px] font-medium text-ink-soft mb-1.5">{tT("edit.mode")}</span>
          <div className="flex gap-1 flex-wrap">
            {BRIDGE_TRANSPORT_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setTransport(key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-pill)] border text-[11px] font-medium transition-colors",
                  transport === key
                    ? "bg-ink text-white border-ink"
                    : "bg-surface-soft border-border text-ink-soft hover:border-orange/40",
                )}
              >
                {TRANSPORT_ICON[key]}
                {tT(`transport.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className="bg-surface-soft rounded-[7px] px-2.5 py-1.5 text-[11.5px]">
            <span className="block text-[9.5px] uppercase tracking-[0.04em] text-ink-faint mb-0.5">{tT("edit.time")}</span>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-transparent outline-none w-full text-ink font-medium placeholder:text-ink-faint"
              placeholder="~10 min"
            />
          </div>
          <div className="bg-surface-soft rounded-[7px] px-2.5 py-1.5 text-[11.5px]">
            <span className="block text-[9.5px] uppercase tracking-[0.04em] text-ink-faint mb-0.5">{tT("edit.line")}</span>
            <input
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="bg-transparent outline-none w-full text-ink placeholder:text-ink-faint"
              placeholder="opz."
            />
          </div>
        </div>

        <div className="bg-surface-soft rounded-[7px] px-2.5 py-1.5 text-[11.5px] mb-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-transparent outline-none w-full text-ink-soft italic placeholder:text-ink-faint"
            placeholder={tT("edit.note")}
          />
        </div>

        <div className="flex justify-between items-center mt-2.5 text-[11px]">
          <button
            className="inline-flex items-center gap-1 text-red-700 hover:underline underline-offset-[3px] transition-colors"
            onClick={onMarkFree}
          >
            <IconCircleMinus size={11} />
            {tT("edit.markFreeTime")}
          </button>
          <button
            className="bg-ink text-white rounded-[var(--radius-pill)] px-3 py-1 text-[11px] font-medium hover:opacity-90 transition-opacity"
            onClick={() =>
              onSave({
                transport,
                duration_min: parseInt(duration) || 0,
                line:  line  || null,
                note:  note  || null,
                stops: null,
              })
            }
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
