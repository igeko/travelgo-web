"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconRoute, IconClock, IconNotes, IconX, IconTrash } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SoftField } from "@/components/ui/SoftField";
import type { BridgeData } from "@/lib/dal/domain";
import { TRANSPORT_ICON } from "./icons";
import { parseDurationToMinutes, formatMinutes, hasUnitToken } from "./duration";

type BridgeTransport = BridgeData["transport"];

const BRIDGE_TRANSPORT_KEYS: BridgeTransport[] = ["walk", "metro", "bus", "taxi", "bike"];

export function BridgeEditor({
  bridge,
  onSave,
  onClose,
  onDelete,
}: {
  bridge: BridgeData | null;
  onSave:   (b: BridgeData) => void;
  onClose:  () => void;
  onDelete: () => void;
}) {
  const tT = useTranslations("Timeline");
  const tCommon = useTranslations("Common");
  const [transport, setTransport] = useState<BridgeTransport>(bridge?.transport ?? "walk");
  const [duration,  setDuration]  = useState(formatMinutes(bridge?.duration_min));
  const [line,      setLine]      = useState(bridge?.line ?? "");
  const [note,      setNote]      = useState(bridge?.note ?? "");

  const parsedMin  = parseDurationToMinutes(duration);
  const recognized = hasUnitToken(duration) && parsedMin !== null;

  function handleSave() {
    onSave({
      transport,
      duration_min: parsedMin ?? 0,
      line:  line  || null,
      note:  note  || null,
      stops: null,
    });
  }

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
      <div className="rounded-md rounded-br-none border-[1.5px] border-orange bg-white p-[11px_13px] shadow-[0_4px_14px_rgba(244,123,58,0.10)]">
        <div className="flex items-center gap-1.5 text-micro uppercase tracking-[0.08em] text-orange-deep font-medium mb-3">
          <IconRoute size={11} />
          <span>{tT("edit.transit")}</span>
          <button aria-label={tT("edit.close")} className="ml-auto text-ink-faint hover:text-ink transition-colors" onClick={onClose}>
            <IconX size={13} />
          </button>
        </div>

        <div className="mb-3">
          <span className="block text-[10.5px] font-medium text-ink-soft mb-1.5">{tT("edit.mode")}</span>
          <div className="flex gap-1 flex-wrap">
            {BRIDGE_TRANSPORT_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setTransport(key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-pill border text-tiny font-medium transition-colors",
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

        <div className="mb-3">
          <div className="grid grid-cols-2 gap-2">
            <SoftField
              size="sm"
              value={duration}
              onChange={setDuration}
              label={tT("edit.time")}
              labelAlwaysVisible
              placeholder="es. 1d 4h 20m"
            >
              <SoftField.Prefix><IconClock /></SoftField.Prefix>
            </SoftField>
            <SoftField
              size="sm"
              value={line}
              onChange={setLine}
              label={tT("edit.line")}
              labelAlwaysVisible
              placeholder="opz."
            >
              <SoftField.Prefix><IconRoute /></SoftField.Prefix>
            </SoftField>
          </div>
          {recognized && (
            <p className="mt-1.5 ml-1 text-[10px] text-ink-faint">
              {tT("edit.durationRecognized", { total: parsedMin })}
            </p>
          )}
        </div>

        <div className="mb-3">
          <SoftField
            size="sm"
            value={note}
            onChange={setNote}
            label={tT("edit.note")}
            labelAlwaysVisible
            placeholder={tT("edit.note")}
          >
            <SoftField.Prefix><IconNotes /></SoftField.Prefix>
          </SoftField>
        </div>

        <div className="flex items-center mt-2.5">
          {bridge && (
            <Button size="sm" variant="ghost" tone="danger" onClick={onDelete}>
              <IconTrash />
              {tCommon("delete")}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="ghost" tone="neutral" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button size="sm" variant="solid" tone="neutral" onClick={handleSave}>
              {tCommon("apply")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
