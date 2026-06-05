"use client";

import { useState } from "react";
import { RouteMap } from "@/components/ui/RouteMap";
import { Timeline, type TimelineDayData } from "@/features/explore/Timeline";
import { ExploreToolbar } from "@/features/explore/ExploreToolbar";
import { useExploreCategories } from "@/features/explore/useExploreCategories";

type Props = {
  days: TimelineDayData[];
};

/**
 * Composizione di layout della Explore (next):
 *   ─ RouteMap full-bleed (sfondo)
 *   ─ Panel sinistro: Timeline in card arrotondata
 *   ─ ExploreToolbar verticale a destra
 *
 * Nessuna integrazione fra i tre: lo stato della toolbar vive qui ma non
 * comunica con la mappa. I marker della RouteMap restano [] finché non
 * collegheremo i pezzi uno alla volta.
 */
export function ExploreNextShell({ days }: Props) {
  const categories = useExploreCategories();

  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [pinnedSubIds, setPinnedSubIds] = useState<string[]>([]);

  return (
    <div className="relative h-full w-full">
      <RouteMap points={[]} className="absolute inset-0 rounded-none" />

      {/* Panel sinistro — card arrotondata che contiene la Timeline. */}
      <aside className="absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-float">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Timeline days={days} />
        </div>
      </aside>

      <ExploreToolbar
        categories={categories}
        selectedSubIds={selectedSubIds}
        onSelectionChange={setSelectedSubIds}
        selectionMode="single"
        pinnedSubIds={pinnedSubIds}
        onTogglePin={(subId) =>
          setPinnedSubIds((prev) =>
            prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId],
          )
        }
        orientation="vertical"
        className="absolute right-4 top-4 z-20"
      />
    </div>
  );
}
