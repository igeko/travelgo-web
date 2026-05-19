"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconX, IconCheck, IconCircleDashed, IconBookmark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { TimelineBlock, InstancePatch, BookingStatus, SlotKey } from "./types";
import { SLOT_ORDER } from "./types";

type Props = {
  block: TimelineBlock;
  onSave: (patch: InstancePatch) => void;
  onClose: () => void;
};

export function InstancePopover({ block, onSave, onClose }: Props) {
  const t = useTranslations("InstancePopover");
  const tCommon = useTranslations("Common");
  const [time,   setTime]   = useState(block.time ?? "");
  const [fuzzy,  setFuzzy]  = useState(block.fuzzy);
  const [note,   setNote]   = useState(block.instance_note ?? "");
  const [status, setStatus] = useState<BookingStatus | null>(block.booking_status ?? null);
  const [slot,   setSlot]   = useState<SlotKey>((block.slot as SlotKey) ?? "morning");

  function handleSave() {
    onSave({
      time:           time || null,
      fuzzy,
      instance_note:  note || null,
      booking_status: status,
      slot,
    });
    onClose();
  }

  return (
    <div className="mt-1 mb-2 rounded-xl border border-border bg-white shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-ink">{t("title")}</span>
        <button onClick={onClose} aria-label={tCommon("close")} className="text-ink-faint hover:text-ink transition-colors p-1">
          <IconX size={14} />
        </button>
      </div>

      {/* Slot */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1.5">
          {t("dayMoment")}
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {SLOT_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setSlot(s)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                slot === s
                  ? "bg-orange text-white border-orange"
                  : "text-ink-soft border-border hover:border-orange/40"
              )}
            >
              {t(`slots.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
          {t("time")}
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-orange/50 transition-colors bg-white"
        />
      </div>

      {/* Fuzzy */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[12px] text-ink">{t("fuzzyTitle")}</p>
          <p className="text-[11px] text-ink-faint">{t("fuzzyHint")}</p>
        </div>
        <button
          role="switch"
          aria-checked={fuzzy}
          aria-label={t("fuzzyTitle")}
          onClick={() => setFuzzy((v) => !v)}
          className={cn(
            "relative w-9 h-5 rounded-full border-2 transition-colors shrink-0 ml-4",
            fuzzy ? "bg-orange border-orange" : "bg-surface border-border"
          )}
        >
          <span
            className={cn(
              "absolute top-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform",
              fuzzy ? "translate-x-[18px]" : "translate-x-[2px]"
            )}
          />
        </button>
      </div>

      {/* Nota istanza */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
          {t("noteLabel")}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          rows={2}
          className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint outline-none focus:border-orange/50 transition-colors bg-white resize-none"
        />
      </div>

      {/* Booking status */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1.5">
          {t("bookingStatus")}
        </label>
        <div className="flex gap-1.5">
          {(["todo", "booked", "paid"] as BookingStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus((prev) => prev === s ? null : s)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                status === s
                  ? "bg-orange text-white border-orange"
                  : "bg-white text-ink-soft border-border hover:border-orange/30"
              )}
            >
              {s === "todo"   && <IconCircleDashed size={11} />}
              {s === "booked" && <IconBookmark size={11} />}
              {s === "paid"   && <IconCheck size={11} />}
              {t(`status.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-orange text-white rounded-lg py-2 text-[13px] font-semibold hover:bg-orange/90 transition-colors"
      >
        {tCommon("save")}
      </button>
    </div>
  );
}
