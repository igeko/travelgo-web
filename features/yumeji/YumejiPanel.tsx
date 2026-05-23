"use client";

/**
 * YumejiPanel · pannello "I tuoi Yume" (v2).
 *
 * Contenitore in stile lista-giorni (`features/day/DayList` aside):
 * `bg-surface rounded-lg border border-border`, header con eyebrow + azioni
 * (pin / chiudi), e il corpo delegato a <YumeList> (ricerca · filtri · lista).
 *
 * Agnostico rispetto al posizionamento: l'host lo monta come overlay flottante
 * (`floating` → ombra) o come colonna nel layout di pagina (pinned).
 *
 * Dati ancora mock (mockData.ts) — il data layer reale è la fase successiva.
 */

import { cn } from "@/lib/cn";
import { IconPin, IconX } from "@/components/ui/icons";
import { YumejiGlyph } from "./YumejiGlyph";
import { YumeList } from "./YumeList";
import type { YumeListItem, YumeChip } from "./mockData";

type YumejiPanelProps = {
  items: YumeListItem[];
  chips?: YumeChip[];
  eyebrow?: string;
  /** Overlay flottante → aggiunge l'ombra. Colonna in-layout → senza ombra. */
  floating?: boolean;
  /** Stato del pin (per l'icona). Se passi onTogglePin, l'icona è cliccabile. */
  pinned?: boolean;
  onTogglePin?: () => void;
  onClose?: () => void;
  /** Forwarded a YumeList */
  searchable?: boolean;
  filterable?: boolean;
  showOwner?: boolean;
  autoFocusSearch?: boolean;
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
};

export function YumejiPanel({
  items,
  chips = [],
  eyebrow = "Yumeji · 夢路",
  floating = false,
  pinned = false,
  onTogglePin,
  onClose,
  searchable = true,
  filterable = true,
  showOwner = false,
  autoFocusSearch = false,
  loading = false,
  searchValue,
  onSearchChange,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  className,
}: YumejiPanelProps) {
  return (
    <aside
      aria-label="Pannello Yumeji"
      className={cn(
        "flex flex-col min-h-0 bg-surface rounded-lg border border-border overflow-hidden",
        className,
      )}
      style={floating ? { boxShadow: "var(--shadow-float)" } : undefined}
    >
      {/* Header · stile aside DayList (eyebrow) + azioni pin/chiudi */}
      <div className="flex items-center px-[18px] py-3 border-b border-border shrink-0">
        <div className="min-w-0 flex items-center gap-1.5 text-ink-soft">
          <YumejiGlyph size={14} />
          <span className="text-micro uppercase tracking-eyebrow-wide">{eyebrow}</span>
        </div>
        {(onTogglePin || onClose) && (
          <div className="ml-auto flex items-center gap-2.5 text-ink-faint pl-2">
            {onTogglePin && (
              <button
                type="button"
                onClick={onTogglePin}
                aria-pressed={pinned}
                title={pinned ? "Sgancia il pannello" : "Ancora il pannello"}
                className="inline-flex items-center justify-center cursor-pointer border-0 bg-transparent p-0 transition-colors hover:text-ink"
              >
                <IconPin
                  size={15}
                  className={cn("transition-transform duration-150", pinned && "rotate-[-45deg] text-orange-deep")}
                />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Chiudi pannello Yumeji"
                className="inline-flex items-center justify-center cursor-pointer border-0 bg-transparent p-0 transition-colors hover:text-ink"
              >
                <IconX size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Corpo */}
      <YumeList
        items={items}
        chips={chips}
        searchable={searchable}
        filterable={filterable}
        showOwner={showOwner}
        autoFocusSearch={autoFocusSearch}
        loading={loading}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        className="flex-1"
      />
    </aside>
  );
}
