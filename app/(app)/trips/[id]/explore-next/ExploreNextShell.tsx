"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RouteMap } from "@/components/ui/RouteMap";
import { IconAdjustmentsHorizontal, IconSearch } from "@/components/ui/icons";
import { Timeline, type TimelineDayData } from "@/features/explore/Timeline";
import { ExploreToolbar } from "@/features/explore/ExploreToolbar";
import { useExploreCategories } from "@/features/explore/useExploreCategories";
import { cn } from "@/lib/cn";

type Props = {
  days: TimelineDayData[];
};

/**
 * Composizione di layout della Explore (next):
 *   ─ RouteMap full-bleed (sfondo)
 *   ─ Panel sinistro: search pill + Timeline (Figma 32:392)
 *   ─ ExploreToolbar verticale a destra
 *
 * Nessuna integrazione tra i tre: lo stato della toolbar e della search vive
 * qui ma non comunica con la mappa. I marker della RouteMap restano [] finché
 * non collegheremo i pezzi uno alla volta.
 */
export function ExploreNextShell({ days }: Props) {
  const t = useTranslations("ExploreNext");
  const categories = useExploreCategories();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [pinnedSubIds, setPinnedSubIds] = useState<string[]>([]);

  return (
    <div className="relative h-full w-full">
      {/* Mappa di sfondo. points=[] disattiva marker e fetch route: per ora è
          puro Google Map full-bleed, gli overlay flottano sopra. */}
      <RouteMap points={[]} className="absolute inset-0 rounded-none" />

      {/* Panel sinistro — sticky in alto a sinistra, scrollabile in verticale
          se la Timeline supera l'altezza disponibile. Larghezza 360 come da
          Figma. */}
      <aside
        className={cn(
          "absolute left-4 top-4 z-20 flex w-[360px] flex-col gap-2",
          "max-h-[calc(100%-2rem)]",
        )}
      >
        {/* Search row — pill input + bottone affianco (placeholder, 32px
            quadrato come da Figma). Nessuna logica: niente autocomplete,
            niente fetch. È lo shell visivo della futura ricerca. */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 flex-1 items-center gap-1 rounded-pill border border-border-strong bg-surface px-3 shadow-float">
            <IconSearch size={15} stroke={1.75} className="shrink-0 text-ink-soft" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-mini text-ink outline-none placeholder:text-ink-faint"
              aria-label={t("searchPlaceholder")}
            />
          </div>
          <button
            type="button"
            aria-label={t("settingsLabel")}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-soft shadow-float hover:text-ink"
          >
            <IconAdjustmentsHorizontal size={16} stroke={1.75} />
          </button>
        </div>

        {/* Timeline — organism già esistente. Lavora in pura presentazione
            sui days passati dal server. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Timeline days={days} />
        </div>
      </aside>

      {/* Toolbar verticale in alto a destra. Stato locale, non collegata a
          marker o area-search per ora. */}
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
