"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { IconPlus, IconX } from "@/components/ui/icons";
import { SoftField } from "@/components/ui/SoftField";
import { IconPicker } from "@/components/ui/IconPicker";
import { STOP_ICONS, stopIconNode } from "./stopIcons";

/* ─────────────────────────────────────────────────────────────────
   StopComposer
   Riga temporanea + edit form "add stop": titolo + icona (set fisso).
   Crea un'attività fuzzy (senza orario), posizionata rispetto alla
   add-zone. `onCreate` restituisce l'esito (false → resta aperta).
───────────────────────────────────────────────────────────────── */

const DEFAULT_ICON = STOP_ICONS[0].key;

export function StopComposer({
  onCreate,
  onClose,
}: {
  onCreate: (title: string, icon: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const t = useTranslations("Timeline");
  const tCommon = useTranslations("Common");
  const tIcons = useTranslations("Timeline.stopIcons");

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<string>(DEFAULT_ICON);
  const [pending, setPending] = useState(false);

  const iconOptions = useMemo(
    () => STOP_ICONS.map((o) => ({ key: o.key, Icon: o.Icon, label: tIcons(o.key) })),
    [tIcons],
  );

  const canSubmit = title.trim().length > 0 && !pending;

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    const ok = await onCreate(title.trim(), icon);
    if (!ok) setPending(false);
  }

  return (
    <div>
      {/* Riga stop temporanea — pallino con l'icona scelta (preview live) */}
      <div className="relative flex items-center gap-3 py-1.5 pr-2 pl-5 my-1 rounded-full rounded-br-none border border-dashed border-orange">
        <div
          className="absolute flex items-center justify-center rounded-full border-2 border-dashed border-orange bg-white text-orange z-10 [&>svg]:size-3.5"
          style={{
            left: -23,
            top: "50%",
            transform: "translateY(-50%)",
            width: 22,
            height: 22,
            boxShadow: "0 0 0 4px var(--color-bg)",
          }}
          aria-hidden
        >
          {stopIconNode(icon) ?? <IconPlus size={12} />}
        </div>
        <span
          className={cn(
            "flex-1 text-tiny uppercase tracking-[0.08em] font-medium truncate",
            title.trim() ? "text-ink-soft" : "text-ink-faint italic",
          )}
        >
          {title.trim() || t("stop.newStop")}
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
            <IconPlus size={11} />
            <span>{t("actions.addStop")}</span>
            <button
              aria-label={t("edit.close")}
              className="ml-auto text-ink-faint hover:text-ink transition-colors"
              onClick={onClose}
            >
              <IconX size={13} />
            </button>
          </div>

          {/* Icona — prima del titolo */}
          <div className="mb-3">
            <span className="block text-micro uppercase tracking-[0.08em] text-ink-faint font-medium mb-1.5">
              {t("stop.iconLabel")}
            </span>
            <IconPicker value={icon} onChange={setIcon} options={iconOptions} />
          </div>

          {/* Titolo */}
          <SoftField
            size="sm"
            value={title}
            onChange={setTitle}
            label={t("stop.titleLabel")}
            labelAlwaysVisible
            placeholder={t("stop.titlePlaceholder")}
            inputProps={{
              autoFocus: true,
              onKeyDown: (e) => { if (e.key === "Enter") submit(); },
            }}
          />

          {/* Footer */}
          <div className="flex justify-end items-center gap-1.5 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-pill text-xs font-medium text-ink hover:bg-surface-soft transition-colors"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill text-xs font-medium bg-ink text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {pending && (
                <span
                  aria-hidden
                  className="w-3 h-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin"
                />
              )}
              {t("stop.create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
