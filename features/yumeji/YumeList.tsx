"use client";

/**
 * YumeList · corpo del pannello Yume (tutto tranne l'header).
 *
 *   - Ricerca (abilitabile via `searchable`)
 *   - Chip filtri (abilitabili via `filterable`)
 *   - Lista degli yume — propri o condivisi al viaggio da altri utenti
 *
 * Riusabile ovunque (pannello, pagina dedicata). Mostra solo i campi reali che
 * abbiamo oggi (titolo, location, prezzo, immagine, owner) — vedi YumeListItem.
 * Le righe senza immagine usano lo stesso placeholder di ActivityList.
 *
 * Dati ancora mock — il filtraggio reale dei chip è parte dati.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { SoftField } from "@/components/ui/SoftField";
import { AddressLabel } from "@/components/ui/AddressLabel";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { IconSearch, IconPlus } from "@/components/ui/icons";
import type { YumeListItem, YumeChip, YumeOwner } from "./mockData";
import { writeYumeDrag } from "./yumeDrag";

/** Placeholder immagine condiviso con ActivityList (ActivityRow.DEFAULT_THUMB). */
const PLACEHOLDER_THUMB = "/media/day-default-banner.png";

/** Filtro per stato di schedulazione nel trip corrente (server-side). */
export type YumeScheduleFilter = "all" | "scheduled" | "unscheduled";

type YumeListProps = {
  items: YumeListItem[];
  /** Mostra la barra di ricerca. Default true. */
  searchable?: boolean;
  /** Mostra i chip filtri. Default true. */
  filterable?: boolean;
  chips?: YumeChip[];
  /**
   * Filtro schedulazione CONTROLLATO (server-side). Se passi `onScheduleFilterChange`
   * il componente mostra i chip reali "Schedulati / Da pianificare" (mutuamente
   * esclusivi) al posto dei `chips` mock e l'host rifà la query.
   */
  scheduleFilter?: YumeScheduleFilter;
  onScheduleFilterChange?: (f: YumeScheduleFilter) => void;
  /** Mostra l'avatar dell'owner sulle righe condivise da altri. Default false. */
  showOwner?: boolean;
  /** Focus automatico sul campo ricerca al mount. */
  autoFocusSearch?: boolean;
  /**
   * Ricerca CONTROLLATA dall'host (server-side). Se passi `onSearchChange`, il
   * componente non filtra in FE: `items` è già il risultato filtrato dal server
   * (la ricerca interroga il DB). Senza callback resta una ricerca FE locale,
   * utile solo per liste statiche/mock.
   */
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  /** Esiste un'altra pagina dopo `items` → abilita l'endless scroll. */
  hasMore?: boolean;
  /** La pagina successiva è in caricamento (mostra "Carico…" sul sentinel). */
  loadingMore?: boolean;
  /** Carica la pagina successiva. Richiesto perché l'endless scroll si attivi. */
  onLoadMore?: () => void;
  /** Caricamento iniziale in corso (mostra un placeholder al posto dell'empty). */
  loading?: boolean;
  className?: string;
};

export function YumeList({
  items,
  searchable = true,
  filterable = true,
  chips = [],
  scheduleFilter = "all",
  onScheduleFilterChange,
  showOwner = false,
  autoFocusSearch = false,
  loading = false,
  searchValue,
  onSearchChange,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  className,
}: YumeListProps) {
  const t = useTranslations("Yumeji");
  // Ricerca controllata (server) se l'host passa onSearchChange; altrimenti FE.
  const searchControlled = onSearchChange != null;
  const [internalSearch, setInternalSearch] = useState("");
  const search = searchControlled ? (searchValue ?? "") : internalSearch;
  const setSearch = (v: string) => (onSearchChange ? onSearchChange(v) : setInternalSearch(v));
  const [activeChips, setActiveChips] = useState<Set<string>>(
    () => new Set(chips.filter((c) => c.active).map((c) => c.id)),
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLOListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    if (autoFocusSearch) searchRef.current?.focus();
  }, [autoFocusSearch]);

  // Tieni l'ultima callback in un ref così l'observer non si ricrea a ogni render.
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Endless scroll: quando il sentinel entra in viewport carica la pagina dopo.
  // In ricerca FE è disattivato (filtra solo ciò che è già caricato); in ricerca
  // controllata/server resta attivo (l'host pagina i risultati già filtrati).
  const canPaginate = hasMore && !!onLoadMore && (searchControlled || !search.trim());
  useEffect(() => {
    if (!canPaginate) return;
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) onLoadMoreRef.current?.();
      },
      { root, rootMargin: "160px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [canPaginate, loadingMore]);

  const visible = useMemo(() => {
    // Ricerca controllata → il server ha già filtrato: mostra items così com'è.
    if (searchControlled) return items;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.location ?? "").toLowerCase().includes(q),
    );
  }, [items, search, searchControlled]);

  function toggleChip(id: string) {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Filtro schedulazione controllato dall'host → TabSwitcher; altrimenti chip mock.
  const scheduleControlled = onScheduleFilterChange != null;
  const showChips = filterable && (scheduleControlled || chips.length > 0);

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Search */}
      {searchable && (
        <div className="px-3.5 py-2.5 border-b border-dashed border-border shrink-0">
          <SoftField
            ref={searchRef as React.Ref<HTMLInputElement>}
            value={search}
            onChange={setSearch}
            placeholder={t("searchPlaceholder")}
            size="sm"
            type="search"
          >
            <SoftField.Prefix>
              <IconSearch />
            </SoftField.Prefix>
          </SoftField>
        </div>
      )}

      {/* Chip filtri */}
      {showChips && (
        <div className="px-3.5 py-2 border-b border-dashed border-border flex flex-wrap gap-1 shrink-0">
          {scheduleControlled ? (
            // Filtro reale: schedulazione nel trip corrente.
            <TabSwitcher<YumeScheduleFilter>
              size="xs"
              value={scheduleFilter}
              onChange={(f) => onScheduleFilterChange?.(f)}
              tabs={[
                { key: "unscheduled", label: t("filterUnscheduled") },
                { key: "scheduled", label: t("filterScheduled") },
              ]}
            />
          ) : (
            <>
              {chips.map((c) => {
                const isOn = activeChips.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleChip(c.id)}
                    className={cn(
                      "text-micro px-2 py-[3px] rounded-pill border cursor-pointer transition-colors whitespace-nowrap",
                      isOn
                        ? "bg-ink border-ink text-white font-medium"
                        : "bg-surface border-border text-ink-soft hover:border-border-strong",
                    )}
                  >
                    {c.label}
                    {c.count !== undefined && (
                      <span className={cn("ml-0.5", isOn && "opacity-80")}>· {c.count}</span>
                    )}
                  </button>
                );
              })}
              <span className="text-micro px-2 py-[3px] rounded-pill border border-border bg-surface text-ink-soft inline-flex items-center gap-0.5 cursor-pointer hover:border-border-strong">
                <IconPlus size={10} />
                {t("moreFilters")}
              </span>
            </>
          )}
        </div>
      )}

      {/* Lista · loading · empty state */}
      {loading && visible.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-mini text-ink-faint">
          {t("loading")}
        </div>
      ) : visible.length > 0 ? (
        <ol
          ref={scrollRef}
          className="m-0 p-0 list-none flex-1 overflow-y-auto min-h-0 scrollbar-thin"
        >
          {visible.map((it) => (
            <YumeRow key={it.id} item={it} showOwner={showOwner} />
          ))}
          {/* Sentinel endless-scroll · solo senza ricerca attiva */}
          {canPaginate && (
            <li
              ref={sentinelRef}
              className="px-3 py-3 flex items-center justify-center text-mini text-ink-faint"
            >
              {loadingMore ? t("loadingMore") : <span aria-hidden className="opacity-0">·</span>}
            </li>
          )}
        </ol>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
          <p className="text-meta font-medium text-ink mb-1">
            {search.trim() ? t("emptySearchTitle") : t("emptyTitle")}
          </p>
          <p className="text-mini text-ink-faint max-w-[240px] leading-snug">
            {search.trim() ? t("emptySearchBody") : t("emptyBody")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Riga · pattern DayItem (thumb · info · owner) ─────────────────── */

function YumeRow({ item, showOwner }: { item: YumeListItem; showOwner: boolean }) {
  return (
    <li className="border-b border-dashed border-border last:border-0">
      <button
        type="button"
        draggable
        onDragStart={(e) => writeYumeDrag(e.dataTransfer, { id: item.id, title: item.title, location: item.location })}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left cursor-grab active:cursor-grabbing border-0 bg-transparent transition-colors hover:bg-surface-soft"
      >
        <span
          style={{ backgroundImage: `url(${item.imageUrl ?? PLACEHOLDER_THUMB})` }}
          className="w-10 h-10 rounded-md shrink-0 bg-cover bg-center"
        />
        <span className="flex-1 min-w-0">
          <span className="block text-meta text-ink font-medium leading-tight truncate">
            {item.title}
          </span>
          {(item.location || item.price) && (
            <span className="mt-0.5 flex items-center gap-1.5 min-w-0 leading-tight">
              <AddressLabel
                address={item.location}
                className="min-w-0 flex-1 text-mini text-ink-soft"
              />
              {item.price && (
                <span className="shrink-0 text-mini font-medium text-orange">{item.price}</span>
              )}
            </span>
          )}
        </span>
        {showOwner && item.owner && <OwnerAvatar owner={item.owner} />}
      </button>
    </li>
  );
}

function OwnerAvatar({ owner }: { owner: YumeOwner }) {
  const initials = owner.name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      title={owner.name}
      className="w-6 h-6 rounded-full overflow-hidden bg-ink flex items-center justify-center shrink-0"
    >
      {owner.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={owner.avatarUrl}
          alt={owner.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-[9px] font-semibold text-white leading-none">{initials}</span>
      )}
    </span>
  );
}
