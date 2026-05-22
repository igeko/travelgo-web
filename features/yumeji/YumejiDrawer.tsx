"use client";

/**
 * Yumeji · pannello "I tuoi Yume" (design v2 · docs/design/yumeji.md)
 *
 * Due pezzi disaccoppiati, posizionati dall'host:
 *
 *   <YumejiToggle>  · vive in Row 2 del sub-header — apre/chiude il pannello.
 *   <YumejiDrawer>  · il pannello vero e proprio: largo 340px, piena altezza,
 *                     SLITTA orizzontalmente da destra (translateX) — entra in
 *                     overlay (floating, con ombra direzionale) o resta nel flow
 *                     (pinned, il main si restringe via padding-right dell'host).
 *
 * Tre stati: closed · floating · pinned. Esc / click sull'header navy / scrim
 * chiudono; 📌 nell'header passa floating ⇄ pinned.
 *
 * Componente di presentazione: stato e dati arrivano dall'host (controlled).
 * I dati sono mock (vedi mockData.ts); il data layer reale è "la parte dati".
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SoftField } from "@/components/ui/SoftField";
import { IconSearch, IconPin, IconPlus } from "@/components/ui/icons";
import { YumejiGlyph } from "./YumejiGlyph";
import type { YumeItem, YumeChip } from "./mockData";

export type YumejiDrawerState = "closed" | "floating" | "pinned";

const EASE = "cubic-bezier(.2,.7,.2,1)";

/* ── Toggle · vive in Row 2 ────────────────────────────────────────── */

export function YumejiToggle({
  active,
  onClick,
  label = "Yume",
  className,
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  // Stesso linguaggio dei tab del sub-header (Viaggio · Giorno per giorno · Esplora):
  // pill px-3 py-[5px], text-mini, niente bordo; attivo = bg-ink text-white.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? "Chiudi pannello Yumeji" : "Apri pannello Yumeji"}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border-0 font-sans",
        "rounded-pill px-3 py-[5px] text-mini transition-colors",
        active ? "bg-ink text-white font-medium" : "bg-transparent text-ink-soft hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2",
        className,
      )}
    >
      <YumejiGlyph size={13} />
      <span className="leading-none">{label}</span>
    </button>
  );
}

/* ── Pannello · slitta da destra ───────────────────────────────────── */

type YumejiDrawerProps = {
  state: YumejiDrawerState;
  onStateChange: (next: YumejiDrawerState) => void;
  items: YumeItem[];
  chips?: YumeChip[];
  /** Etichetta dell'header navy. Default "Yume". */
  title?: string;
  className?: string;
};

export function YumejiDrawer({
  state,
  onStateChange,
  items,
  chips = [],
  title = "Yume",
  className,
}: YumejiDrawerProps) {
  const open = state !== "closed";
  const pinned = state === "pinned";

  const [search, setSearch] = useState("");
  const [activeChips, setActiveChips] = useState<Set<string>>(
    () => new Set(chips.filter((c) => c.active).map((c) => c.id)),
  );
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset della ricerca alla chiusura (pattern "adjust state during render").
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setSearch("");
  }

  // Focus automatico sul campo ricerca all'apertura (Dec 10).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 320);
    return () => window.clearTimeout(id);
  }, [open]);

  // Esc chiude il drawer quando è aperto.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onStateChange("closed");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onStateChange]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  function handleHeaderClick(e: React.MouseEvent) {
    // Click sull'header navy (fuori dal pin) → chiude.
    const target = e.target as HTMLElement;
    if (target.closest("[data-yumeji-pin]")) return;
    onStateChange("closed");
  }

  function togglePin(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    onStateChange(pinned ? "floating" : "pinned");
  }

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
      aria-hidden={!open}
      aria-label="Pannello Yumeji"
      className={cn(
        "absolute top-0 right-0 z-[2] h-full w-[340px] flex flex-col overflow-hidden",
        "bg-surface border-l border-border",
        "transition-transform duration-300",
        open ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none",
        className,
      )}
      style={{
        transitionTimingFunction: EASE,
        boxShadow: state === "floating" ? "var(--shadow-yumeji-drawer)" : undefined,
      }}
    >
      {/* Header navy · click chiude · barra arancione sul bordo sinistro */}
      <div
        onClick={handleHeaderClick}
        className="relative flex items-center min-h-[42px] shrink-0 bg-ink pl-[18px] pr-3 cursor-pointer"
      >
        <span
          aria-hidden
          className="absolute left-[-1.5px] top-1/2 -translate-y-1/2 w-[3px] h-[22px] rounded-[2px] bg-orange"
        />
        <span className="inline-flex items-center gap-[7px] text-white text-mini font-medium">
          <YumejiGlyph size={15} />
          <span className="leading-none">{title}</span>
        </span>
        <span className="ml-auto inline-flex items-center gap-3.5 text-white/70">
          <button
            type="button"
            data-yumeji-pin
            onClick={togglePin}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") togglePin(e);
            }}
            aria-pressed={pinned}
            title={pinned ? "Sgancia il pannello" : "Ancora il pannello"}
            className="inline-flex items-center justify-center cursor-pointer border-0 bg-transparent p-0 transition-colors hover:text-white"
          >
            <IconPin
              size={14}
              className={cn("transition-transform duration-150", pinned && "rotate-[-45deg] text-orange")}
            />
          </button>
        </span>
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
        <ol className="m-0 p-0 list-none flex-1 overflow-y-auto">
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

/* ── Riga della lista · pattern DayList (Dec 10) ───────────────────── */

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
