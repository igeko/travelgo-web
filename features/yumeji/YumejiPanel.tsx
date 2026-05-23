"use client";

/**
 * YumejiPanel · v2 del pannello "I tuoi Yume".
 *
 * Stesso contenuto del drawer v1 (search · chip filtri · lista list-style) ma in
 * un CONTENITORE in stile lista-giorni (`features/day/DayList` aside):
 * `bg-surface rounded-lg border border-border`, header con eyebrow + titolo.
 *
 * È agnostico rispetto al posizionamento: l'host lo monta come overlay flottante
 * (prop `floating` → ombra) oppure come colonna nel layout di pagina (pinned).
 * Pin/chiusura sono affordance opzionali nell'header (rese solo se passi il
 * relativo handler).
 *
 * Dati ancora mock (mockData.ts) — il data layer reale è la fase successiva.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SoftField } from "@/components/ui/SoftField";
import { IconSearch, IconPin, IconPlus, IconX } from "@/components/ui/icons";
import { YumejiGlyph } from "./YumejiGlyph";
import type { YumeItem, YumeChip } from "./mockData";

type YumejiPanelProps = {
  items: YumeItem[];
  chips?: YumeChip[];
  eyebrow?: string;
  /** Overlay flottante → aggiunge l'ombra. Colonna in-layout → senza ombra. */
  floating?: boolean;
  /** Stato del pin (per l'icona). Se passi onTogglePin, l'icona è cliccabile. */
  pinned?: boolean;
  onTogglePin?: () => void;
  onClose?: () => void;
  /** Mette il focus sul campo ricerca al mount (apertura del pannello). */
  autoFocusSearch?: boolean;
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
  autoFocusSearch = false,
  className,
}: YumejiPanelProps) {
  const [search, setSearch] = useState("");
  const [activeChips, setActiveChips] = useState<Set<string>>(
    () => new Set(chips.filter((c) => c.active).map((c) => c.id)),
  );
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus automatico sul campo ricerca al mount (apertura del pannello).
  useEffect(() => {
    if (autoFocusSearch) searchRef.current?.focus();
  }, [autoFocusSearch]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  function toggleChip(id: string) {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

      {/* Search */}
      <div className="px-3.5 py-2.5 border-b border-dashed border-border shrink-0">
        <SoftField
          ref={searchRef as React.Ref<HTMLInputElement>}
          value={search}
          onChange={setSearch}
          placeholder="Cerca nei tuoi yume…"
          size="sm"
          type="search"
        >
          <SoftField.Prefix>
            <IconSearch />
          </SoftField.Prefix>
        </SoftField>
      </div>

      {/* Chip filtri (mock · il filtraggio reale è parte dati) */}
      {chips.length > 0 && (
        <div className="px-3.5 py-2 border-b border-dashed border-border flex flex-wrap gap-1 shrink-0">
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
            Altri filtri
          </span>
        </div>
      )}

      {/* Lista o empty state */}
      {visible.length > 0 ? (
        <ol className="m-0 p-0 list-none flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {visible.map((it) => (
            <YumeRow key={it.id} item={it} />
          ))}
        </ol>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
          <span className="text-orange">
            <YumejiGlyph size={30} />
          </span>
          <p className="text-meta font-medium text-ink mt-3 mb-1">
            {search.trim() ? "Nessuno yume trovato" : "Non hai ancora salvato niente"}
          </p>
          <p className="text-mini text-ink-faint max-w-[240px] leading-snug">
            {search.trim()
              ? "Nessun risultato per la ricerca. Prova un altro termine."
              : "Esplora Discovery e salva i luoghi che ti incuriosiscono: li ritroverai qui, filtrati per destinazione."}
          </p>
        </div>
      )}
    </aside>
  );
}

/* ── Riga della lista · pattern DayItem (Dec 10) ───────────────────── */

function YumeRow({ item }: { item: YumeItem }) {
  const scheduled = item.scheduled;
  return (
    <li className="border-b border-dashed border-border last:border-0">
      <button
        type="button"
        className="grid w-full grid-cols-[40px_1fr] items-center gap-2.5 px-3 py-2 text-left cursor-pointer border-0 bg-transparent transition-colors hover:bg-surface-soft"
      >
        <span
          style={{ backgroundImage: item.thumb }}
          className="w-10 h-10 rounded-md shrink-0 bg-cover bg-center"
        />
        <span className="min-w-0">
          <span className="block text-micro tracking-eyebrow uppercase text-orange font-medium leading-tight truncate">
            {item.zone} · {item.duration} · {item.price}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-meta text-ink leading-tight">
            <span className="font-medium truncate">{item.name}</span>
            {item.priority === "must" && !scheduled && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-pill font-medium uppercase tracking-meta bg-orange-soft text-orange-deep">
                Must
              </span>
            )}
            {scheduled && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-pill font-medium tracking-meta bg-status-paid-bg text-status-paid-fg">
                {scheduled.day} · {scheduled.time}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
