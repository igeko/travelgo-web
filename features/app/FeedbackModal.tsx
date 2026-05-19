"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { IconBug, IconBulb, IconCheck, IconMessage, IconMessageReport, IconSend, IconX } from "@/components/ui/icons";

type NoteType = "bug" | "suggestion" | "other";

type Props = {
  tripId?: string;
  onClose: () => void;
};

export function FeedbackModal({ tripId, onClose }: Props) {
  const t = useTranslations("FeedbackModal");
  const pathname = usePathname();
  const [type, setType] = useState<NoteType>("suggestion");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const TYPES: { id: NoteType; label: string; icon: React.ReactNode }[] = [
    { id: "bug",        label: t("types.bug"),        icon: <IconBug size={20} /> },
    { id: "suggestion", label: t("types.suggestion"), icon: <IconBulb size={20} /> },
    { id: "other",      label: t("types.other"),      icon: <IconMessage size={20} /> },
  ];

  const placeholder =
    type === "bug"
      ? t("placeholders.bug")
      : type === "suggestion"
      ? t("placeholders.suggestion")
      : t("placeholders.other");

  async function handleSubmit() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/tester-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note, page_url: pathname, trip_id: tripId ?? null }),
      });
      setDone(true);
      setTimeout(onClose, 1400);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(13,44,61,0.30)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-[420px]">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <IconMessageReport size={16} className="text-ink-soft shrink-0" />
          <span className="text-meta font-medium text-ink flex-1">{t("title")}</span>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full text-ink-faint border border-border inline-flex items-center justify-center hover:bg-surface-soft hover:text-ink transition-colors"
          >
            <IconX size={12} />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center">
              <IconCheck size={20} className="text-white" />
            </div>
            <p className="text-[14px] font-medium text-ink mt-1">{t("thankYou")}</p>
            <p className="text-mini text-ink-soft">{t("saved")}</p>
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* Tipo */}
            <div className="flex gap-2">
              {TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-tiny font-medium transition-colors cursor-pointer",
                    type === item.id
                      ? "border-ink bg-ink text-white"
                      : "border-border text-ink-soft hover:border-border-strong hover:text-ink",
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Testo */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={placeholder}
              className={cn(
                "w-full resize-none rounded-xl bg-bg border border-border px-3.5 py-2.5",
                "text-meta text-ink placeholder:text-ink-faint font-sans",
                "focus:outline-none focus:border-orange focus:shadow-[0_0_0_3px_rgba(244,123,58,0.10)]",
                "transition-[border-color,box-shadow] duration-150",
              )}
              autoFocus
            />

            {/* Pagina auto-catturata */}
            <div className="text-tiny text-ink-faint">
              {t("page")} <span className="font-mono text-ink-soft">{pathname}</span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-mini text-ink-soft hover:text-ink underline decoration-ink/20 px-2 py-1.5 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!note.trim() || saving}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-pill",
                  "text-meta font-medium text-white bg-ink",
                  "hover:bg-ink-hover transition-colors",
                  "disabled:opacity-40 disabled:pointer-events-none",
                )}
              >
                <IconSend size={13} />
                {saving ? t("sending") : t("send")}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
