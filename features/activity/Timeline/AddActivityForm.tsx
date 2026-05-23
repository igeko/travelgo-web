"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { IconX, IconMapPin } from "@/components/ui/icons";
import { IconPicker } from "@/components/ui/IconPicker";
import { ActivitySearchField } from "../ActivitySearchField";
import { STOP_ICONS, stopIconNode } from "./stopIcons";
import type { TripActivityOption } from "../types";

/* ─────────────────────────────────────────────────────────────────
   AddActivityForm
   La pill tratteggiata È il campo di ricerca: si digita lì dentro
   (ActivitySearchField "bare") e i risultati escono nel dropdown sotto.
   Il cerchio-icona a sinistra apre l'IconPicker (popover) per scegliere
   l'icona dello stop. Alla selezione: stato "pending" (spinner) finché
   il chiamante la programma nel giorno; `onSelect` → se false torna alla
   ricerca.
───────────────────────────────────────────────────────────────── */

export function AddActivityForm({
  tripId,
  onSelect,
  onClose,
  excludeIds,
}: {
  tripId: string;
  onSelect: (option: TripActivityOption, icon: string | null) => Promise<boolean>;
  onClose: () => void;
  /** Activity ids already scheduled on this day — hidden from the search. */
  excludeIds?: string[];
}) {
  const t = useTranslations("Timeline");
  const tIcons = useTranslations("Timeline.stopIcons");
  const [pending, setPending] = useState<TripActivityOption | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const iconWrapRef = useRef<HTMLDivElement>(null);

  const iconOptions = useMemo(
    () => STOP_ICONS.map((o) => ({ key: o.key, Icon: o.Icon, label: tIcons(o.key) })),
    [tIcons],
  );

  // Click-outside chiude il popover dell'icona.
  useEffect(() => {
    if (!iconOpen) return;
    const handler = (e: MouseEvent) => {
      if (iconWrapRef.current && !iconWrapRef.current.contains(e.target as Node)) {
        setIconOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [iconOpen]);

  async function handlePick(opt: TripActivityOption) {
    setPending(opt);
    const ok = await onSelect(opt, icon);
    // Su successo la form viene smontata dal parent → niente da fare.
    // Su fallimento torniamo alla ricerca.
    if (!ok) setPending(null);
  }

  return (
    <div className="relative my-1">
      {/* La pill tratteggiata È il campo di ricerca */}
      <div className="relative flex items-center gap-2 py-1.5 pr-2 pl-5 rounded-full rounded-br-none border border-dashed border-orange focus-within:bg-orange/[0.03] transition-colors">
        {/* Cerchio-icona = trigger dell'IconPicker */}
        <div ref={iconWrapRef} className="absolute" style={{ left: -27, top: "50%", transform: "translateY(-50%)" }}>
          <button
            type="button"
            onClick={() => setIconOpen((o) => !o)}
            aria-label={t("stop.iconLabel")}
            aria-expanded={iconOpen}
            disabled={!!pending}
            className={cn(
              "flex items-center justify-center rounded-full border-2 border-dashed border-orange bg-white text-orange [&>svg]:size-3.5",
              "transition-shadow hover:shadow-[0_0_0_2px_rgba(244,123,58,0.25)] disabled:cursor-not-allowed",
              iconOpen && "shadow-[0_0_0_2px_rgba(244,123,58,0.35)]",
            )}
            style={{ width: 30, height: 30, boxShadow: "0 0 0 4px var(--color-bg)" }}
          >
            {stopIconNode(icon) ?? <IconMapPin size={14} />}
          </button>

          {/* Popover IconPicker */}
          {iconOpen && (
            <div className="absolute left-0 top-[38px] z-dropdown w-[280px] rounded-md border border-border bg-surface p-3 shadow-[0_4px_24px_rgba(13,44,61,0.12)]">
              <span className="block text-micro uppercase tracking-[0.08em] text-ink-faint font-medium mb-2">
                {t("stop.iconLabel")}
              </span>
              <IconPicker
                value={icon}
                onChange={(key) => {
                  setIcon((prev) => (prev === key ? null : key));
                  setIconOpen(false);
                }}
                options={iconOptions}
              />
            </div>
          )}
        </div>

        {pending ? (
          <span className="flex-1 flex items-center gap-2 text-[15px] text-ink truncate">
            <span
              aria-hidden
              className="w-3.5 h-3.5 rounded-full border-2 border-orange border-t-transparent animate-spin shrink-0"
            />
            <span className="truncate">{pending.title}</span>
          </span>
        ) : (
          <ActivitySearchField
            bare
            requireQuery
            size="sm"
            className="flex-1"
            value={null}
            onChange={(opt) => { if (opt) handlePick(opt); }}
            tripId={tripId}
            excludeIds={excludeIds}
            placeholder={t("addActivityForm.newActivity")}
            autoFocus
          />
        )}

        {!pending && (
          <button
            type="button"
            aria-label={t("edit.close")}
            onClick={onClose}
            className="shrink-0 w-6 h-6 rounded-full text-ink-faint hover:bg-ink/[0.06] hover:text-ink inline-flex items-center justify-center"
          >
            <IconX size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
