"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { IconSearch, IconX, IconMapPin } from "@/components/ui/icons";
import { IconPicker } from "@/components/ui/IconPicker";
import { ActivitySearchField } from "../ActivitySearchField";
import { STOP_ICONS, stopIconNode } from "./stopIcons";
import type { TripActivityOption } from "../types";

/* ─────────────────────────────────────────────────────────────────
   AddActivityForm
   Attività temporanea (riga vuota) + edit form "add activity" con il
   componente ActivitySearchField per selezionare un'attività del viaggio.
   Alla selezione: stato "pending" (spinner) finché il chiamante la
   programma nel giorno, poi la form si chiude e si apre SCHEDULE.
   `onSelect` restituisce l'esito: se false, si torna alla ricerca.
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

  const iconOptions = useMemo(
    () => STOP_ICONS.map((o) => ({ key: o.key, Icon: o.Icon, label: tIcons(o.key) })),
    [tIcons],
  );

  async function handlePick(opt: TripActivityOption) {
    setPending(opt);
    const ok = await onSelect(opt, icon);
    // Su successo la form viene smontata dal parent → niente da fare.
    // Su fallimento torniamo alla ricerca.
    if (!ok) setPending(null);
  }

  return (
    <div>
      {/* Riga attività temporanea — stessa grafica di un'attività ma con
          bordi tratteggiati arancioni; in pending mostra il titolo scelto */}
      <div className="relative flex items-center gap-3 py-1.5 pr-2 pl-5 my-1 rounded-full rounded-br-none border border-dashed border-orange">
        <div
          className="absolute flex items-center justify-center rounded-full border-2 border-dashed border-orange bg-white text-orange z-10 [&>svg]:size-3.5"
          style={{
            left: -27,
            top: "50%",
            transform: "translateY(-50%)",
            width: 30,
            height: 30,
            boxShadow: "0 0 0 4px var(--color-bg)",
          }}
          aria-hidden
        >
          {stopIconNode(icon) ?? <IconMapPin size={14} />}
        </div>
        <span
          className={cn(
            "flex-1 text-[15px] truncate",
            pending ? "text-ink" : "text-ink-faint italic",
          )}
        >
          {pending ? pending.title : t("addActivityForm.newActivity")}
        </span>
      </div>

      {/* Edit form */}
      <div className="relative py-1">
        <div
          className="absolute w-[1.5px] bg-orange pointer-events-none"
          style={{ left: -19, top: 8, bottom: 8 }}
          aria-hidden
        />
        <div className="rounded-md rounded-tr-none border-[1.5px] border-orange bg-white p-[11px_13px] shadow-[0_4px_14px_rgba(244,123,58,0.10)]">
          {/* Head */}
          <div className="flex items-center gap-1.5 text-micro uppercase tracking-[0.08em] text-orange-deep font-medium mb-3">
            <IconSearch size={11} />
            <span>{t("actions.addActivity")}</span>
            {!pending && (
              <button
                aria-label={t("edit.close")}
                className="ml-auto text-ink-faint hover:text-ink transition-colors"
                onClick={onClose}
              >
                <IconX size={13} />
              </button>
            )}
          </div>

          {pending ? (
            /* Transizione verso SCHEDULE */
            <div className="flex items-center gap-2 py-2 text-mini text-ink-soft animate-pulse">
              <span
                aria-hidden
                className="w-3.5 h-3.5 rounded-full border-2 border-orange border-t-transparent animate-spin"
              />
              <span>{t("addActivityForm.adding")}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Icona (opzionale) — prima della ricerca */}
              <div>
                <span className="block text-micro uppercase tracking-[0.08em] text-ink-faint font-medium mb-1.5">
                  {t("stop.iconLabel")}
                </span>
                <IconPicker value={icon} onChange={setIcon} options={iconOptions} />
              </div>

              {/* Ricerca attività del viaggio — inline, focus all'apertura */}
              <ActivitySearchField
                value={null}
                onChange={(opt) => { if (opt) handlePick(opt); }}
                tripId={tripId}
                excludeIds={excludeIds}
                size="sm"
                defaultOpen
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
