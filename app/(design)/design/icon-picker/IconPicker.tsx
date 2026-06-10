"use client";

/**
 * IconPicker — sketch del componente generalizzato.
 *
 * Due livelli (è la forma proposta anche per il porting):
 *
 * 1. `IconPicker` — PURO e presentazionale: riceve `groups` e non sa
 *    nulla del dominio. Niente liste di icone hardcoded.
 * 2. `CategoryIconPicker` — wrapper di dominio: deriva i groups da
 *    `useExploreCategories()` (che legge EXPLORE_CATEGORY_TREE +
 *    label i18n `ExploreCategories.*`). È la STESSA fonte della
 *    ExploreToolbar: una categoria aggiunta all'albero compare
 *    automaticamente sia nella toolbar che nel picker.
 *
 * Resa: proposta A "Sezioni" (it.11b di timeline-readability) —
 * popover flottante, macro come eyebrow, un tap per scegliere.
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

export function IconPicker({
  groups,
  selectedId,
  onSelect,
  className,
}: {
  /** Gruppi (macro) → items (icone selezionabili). Il chiamante decide
   *  il dominio; il picker non contiene NESSUNA icona propria. */
  groups: IconPickerGroup[];
  /** Id dell'item selezionato (es. "mercati"). */
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

/** Wrapper di dominio: il picker delle categorie Explore. Unica fonte:
 *  EXPLORE_CATEGORY_TREE via useExploreCategories (label localizzate).
 *  Aggiungi una categoria all'albero → appare qui senza toccare nulla. */
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
