"use client";

/**
 * features/activity/IconPicker.tsx
 * ─────────────────────────────────────────────────────────────────
 * Popover di selezione icona, ancorato al badge icona nell'header del
 * pannello dettaglio (state="open") di una activity o di un
 * pernottamento.
 *
 * Direzione (it.11b di timeline-readability, /design/icon-picker):
 *   - Popover flottante, sezioni stacked, un solo tap per scegliere.
 *   - Niente liste hardcoded, niente set paralleli.
 *   - Dominio = SEMPRE quello di EXPLORE_CATEGORY_TREE — la stessa
 *     fonte della ExploreToolbar via `useExploreCategories()`. Aggiungi
 *     una categoria all'albero e la trovi qui senza toccare il picker.
 *
 * Due livelli:
 *   - `IconPicker` — puro, presentazionale. Riceve `groups` e basta.
 *     Nessuna icona propria, nessun dominio implicito.
 *   - `CategoryIconPicker` — wrapper di dominio. Costruisce i groups
 *     a partire da `useExploreCategories()`. È la API consumata dai
 *     consumer reali (ActivityStop, …): un solo punto di accoppiamento
 *     col dominio Explore.
 *
 * Atomic level: molecule. Stand-alone (positioning del popover sta al
 * parent).
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType } from "react";
import { cn } from "@/lib/cn";
import { useExploreCategories } from "@/features/explore/useExploreCategories";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type IconPickerItem = { id: string; label: string; icon: IconCmp };
export type IconPickerGroup = {
  id: string;
  label: string;
  icon: IconCmp;
  items: IconPickerItem[];
};

/** Picker puro: non sa nulla del dominio. Il chiamante passa i groups. */
export function IconPicker({
  groups,
  selectedId,
  onSelect,
  className,
}: {
  groups: IconPickerGroup[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[252px] rounded-md border border-border-strong bg-surface p-2.5 shadow-float",
        className,
      )}
    >
      {groups.map((group, i) => {
        const MacroIcon = group.icon;
        return (
          <div key={group.id} className={cn(i > 0 && "mt-2.5")}>
            <p className="mb-1 flex items-center gap-1.5 px-0.5 text-[9px] font-medium uppercase tracking-eyebrow text-ink-faint">
              <MacroIcon size={12} />
              {group.label}
            </p>
            <div className="grid grid-cols-6 gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isSel = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-pressed={isSel}
                    onClick={() => onSelect?.(item.id)}
                    className={cn(
                      "flex h-8 cursor-pointer items-center justify-center rounded-md transition-colors",
                      isSel
                        ? "bg-ink text-white"
                        : "bg-surface-soft text-ink-soft hover:bg-ink/10 hover:text-ink",
                    )}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Wrapper di dominio: il picker delle categorie Explore. Unica fonte —
 *  EXPLORE_CATEGORY_TREE via `useExploreCategories()` — coerente con la
 *  ExploreToolbar. Aggiungi una categoria all'albero → appare qui senza
 *  toccare nulla. È questo il componente che si usa nei consumer reali. */
export function CategoryIconPicker({
  selectedId,
  onSelect,
  className,
}: {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const macros = useExploreCategories();
  const groups: IconPickerGroup[] = macros.map((m) => ({
    id: m.id,
    label: m.label,
    icon: m.icon,
    items: m.subs.map((s) => ({ id: s.id, label: s.label, icon: s.icon })),
  }));
  return (
    <IconPicker
      groups={groups}
      selectedId={selectedId}
      onSelect={onSelect}
      className={className}
    />
  );
}
