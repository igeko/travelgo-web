"use client";

/**
 * features/activity/IconPicker.tsx
 * ─────────────────────────────────────────────────────────────────
 * Popover di selezione icona per activity / pernottamenti.
 *
 * - Activity (mode="activity") → tutte le categorie ECCETTO `sleep`.
 * - Lodging  (mode="lodging")  → SOLO la categoria `sleep` (i tab
 *   spariscono perché non c'è scelta).
 *
 * Controllato: il parent passa `value` (icon key corrente) e riceve
 * la nuova chiave via `onChange`. Il picker NON persiste — è il
 * consumer a fare la PATCH e a chiudere il popover.
 *
 * Atomic level: molecule. Composto da pillole categoria + grid icone.
 * ─────────────────────────────────────────────────────────────────
 */

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import {
  STOP_ICONS,
  STOP_ICON_CATEGORIES,
  type StopIconCategory,
} from "@/features/activity/Timeline/stopIcons";

export type IconPickerMode = "activity" | "lodging";

export function IconPicker({
  mode,
  value,
  onChange,
  className,
}: {
  mode: IconPickerMode;
  /** Icon key corrente (può essere null su entità senza icona ancora). */
  value: string | null;
  /** Chiamato al click su una icona. Il parent decide se chiudere e/o persistere. */
  onChange: (key: string) => void;
  className?: string;
}) {
  const tIcons = useTranslations("Timeline.stopIcons");
  const tCats = useTranslations("Timeline.stopIconCategories");

  const allowedCategories = useMemo<StopIconCategory[]>(
    () =>
      mode === "lodging"
        ? ["sleep"]
        : STOP_ICON_CATEGORIES.filter((c) => c !== "sleep"),
    [mode],
  );

  // Categoria iniziale: quella della icona corrente quando ancora valida,
  // altrimenti la prima categoria permessa.
  const currentCategory: StopIconCategory | null = useMemo(() => {
    const opt = STOP_ICONS.find((i) => i.key === value);
    if (opt && allowedCategories.includes(opt.category)) return opt.category;
    return null;
  }, [value, allowedCategories]);

  const [activeCat, setActiveCat] = useState<StopIconCategory>(
    currentCategory ?? allowedCategories[0],
  );

  const items = useMemo(
    () => STOP_ICONS.filter((i) => i.category === activeCat),
    [activeCat],
  );

  return (
    <div
      className={cn(
        "flex w-[300px] flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-float",
        className,
      )}
    >
      {allowedCategories.length > 1 ? (
        <div className="flex flex-wrap gap-1">
          {allowedCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={cn(
                "rounded-pill px-2 py-1 text-tiny font-medium transition-colors",
                activeCat === cat
                  ? "bg-ink text-white"
                  : "bg-surface-soft text-ink-soft hover:bg-surface-warm hover:text-ink",
              )}
            >
              {tCats(cat)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-6 gap-1">
        {items.map(({ key, Icon }) => {
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              title={tIcons(key)}
              aria-label={tIcons(key)}
              aria-pressed={selected}
              onClick={() => onChange(key)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm transition-colors",
                selected
                  ? "bg-primary text-white"
                  : "text-ink-soft hover:bg-surface-soft hover:text-ink",
              )}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
