"use client";

/**
 * features/go/ActivityCard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Light activity card for Go's in-chat suggestions — same visual language
 * as the float's SuggestionCard but without photos. Carries per-card actions:
 * add to a day, save to Yumeji, and "more info" (deep-dive, fetched lazily).
 *
 * Add / Yumeji state is owned by the parent (flags + callbacks); the deep-dive
 * expansion is self-contained.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import type { GoDeepDive } from "@/lib/client/go";
import { IconCheck, IconPlus, IconStar, IconChevronDown, IconX } from "@/components/ui/icons";

const SLOT_LABEL: Record<string, string> = {
  morning: "Mattina",
  afternoon: "Pomeriggio",
  evening: "Sera",
  night: "Notte",
};

export type ActivityCardData = {
  title: string;
  category?: string;
  description?: string;
  day?: number;
  slot?: string;
  time?: string;
};

type DeepDive = GoDeepDive;

const PRICE = ["Gratis", "€", "€€", "€€€", "€€€€"];

export function ActivityCard({
  data,
  location,
  addLabel,
  onAdd,
  added = false,
  adding = false,
  onYumeji,
  yumeSaved = false,
  yumeSaving = false,
  addHint,
  autoOpenInfo = false,
  onDismiss,
  className,
}: {
  data: ActivityCardData;
  /** Location hint for the deep-dive. */
  location?: string;
  /** Label for the add button (e.g. "Aggiungi a g3"). */
  addLabel?: string;
  onAdd?: () => void;
  added?: boolean;
  adding?: boolean;
  onYumeji?: () => void;
  yumeSaved?: boolean;
  yumeSaving?: boolean;
  /** Shown in place of the add button when no day is available to add to. */
  addHint?: string;
  /** Open and fetch the deep-dive on mount (used by place-mention cards). */
  autoOpenInfo?: boolean;
  /** When set, shows an X in the corner to dismiss the card from the chat. */
  onDismiss?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(autoOpenInfo);
  const [dd, setDd] = useState<DeepDive | null>(null);
  const [ddLoading, setDdLoading] = useState(false);

  const meta = [
    data.day != null ? `Giorno ${data.day}` : null,
    data.slot ? (SLOT_LABEL[data.slot] ?? data.slot) : null,
    data.time || null,
  ].filter(Boolean).join(" · ");

  const loadInfo = async () => {
    if (dd || ddLoading) return;
    setDdLoading(true);
    try {
      setDd(await api.go.deepDive({ title: data.title, category: data.category, location, why: data.description }));
    } catch {
      /* leave dd null — the row just shows nothing */
    } finally {
      setDdLoading(false);
    }
  };

  const toggleInfo = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    void loadInfo();
  };

  // Place-mention cards auto-expand their deep-dive on mount (open state is
  // seeded from the prop; defer the fetch a frame so its loading setState
  // doesn't run synchronously inside the effect).
  useEffect(() => {
    if (!autoOpenInfo) return;
    const id = requestAnimationFrame(() => void loadInfo());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenInfo]);

  const pill = "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-mini font-medium transition-colors cursor-pointer";

  return (
    <div className={cn("relative rounded-md border border-border bg-surface p-3", className)}>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Rimuovi dalla chat"
          title="Rimuovi dalla chat"
          className="absolute top-1.5 right-1.5 inline-flex items-center justify-center size-6 rounded-md text-ink-faint hover:text-ink hover:bg-surface-soft transition-colors border-0 bg-transparent cursor-pointer"
        >
          <IconX size={14} />
        </button>
      )}
      <div className="flex items-baseline gap-2 pr-6">
        {data.category && (
          <span className="text-micro font-semibold uppercase tracking-eyebrow text-primary shrink-0">{data.category}</span>
        )}
        {meta && <span className="text-micro text-ink-faint">{meta}</span>}
      </div>
      <div className="text-meta font-semibold text-ink mt-0.5">{data.title}</div>
      {data.description && <div className="text-mini text-ink-soft leading-snug mt-1">{data.description}</div>}

      {/* Deep-dive */}
      {open && (
        <div className="mt-2 rounded-sm bg-surface-soft p-2.5 flex flex-col gap-1.5">
          {ddLoading && <div className="text-mini text-ink-faint font-serif italic">Cerco i dettagli…</div>}
          {dd && (
            <>
              <p className="text-mini text-ink-soft leading-snug m-0">{dd.overview}</p>
              {dd.tips?.length > 0 && (
                <ul className="m-0 pl-4 list-disc text-mini text-ink-soft flex flex-col gap-0.5">
                  {dd.tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
              {dd.bestFor && <div className="text-micro text-ink-faint"><span className="font-semibold">Ideale per:</span> {dd.bestFor}</div>}
              {dd.avoid && <div className="text-micro text-ink-faint"><span className="font-semibold">Attenzione:</span> {dd.avoid}</div>}

              {/* Live Google Places data, when a place matched. */}
              {dd.place && (
                <div className="mt-1 rounded-sm border border-border bg-surface overflow-hidden flex flex-col">
                  {dd.place.photoRefs?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={api.places.photoUrl(dd.place.photoRefs[0], 400)}
                      alt={data.title}
                      loading="lazy"
                      className="w-full h-28 object-cover"
                    />
                  )}
                  <div className="p-2 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap text-micro text-ink-soft">
                    {dd.place.rating != null && (
                      <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
                        ★ {dd.place.rating.toFixed(1)}
                        {dd.place.userRatingsTotal != null && (
                          <span className="font-normal text-ink-faint">({dd.place.userRatingsTotal})</span>
                        )}
                      </span>
                    )}
                    {dd.place.priceLevel != null && PRICE[dd.place.priceLevel] && (
                      <span className="text-ink-soft">{PRICE[dd.place.priceLevel]}</span>
                    )}
                    {dd.place.openNow != null && (
                      <span className={cn("font-medium", dd.place.openNow ? "text-success-fg" : "text-danger-fg")}>
                        {dd.place.openNow ? "Aperto ora" : "Chiuso ora"}
                      </span>
                    )}
                  </div>
                  {dd.place.address && <div className="text-micro text-ink-faint">{dd.place.address}</div>}
                  {dd.place.editorialSummary && (
                    <p className="text-micro text-ink-soft leading-snug m-0">{dd.place.editorialSummary}</p>
                  )}
                  <div className="flex items-center gap-2.5 flex-wrap text-micro">
                    {dd.place.website && (
                      <a href={dd.place.website} target="_blank" rel="noopener noreferrer" className="text-primary-deep underline">Sito</a>
                    )}
                    {dd.place.googleMapsUri && (
                      <a href={dd.place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-primary-deep underline">Mappa</a>
                    )}
                    {dd.place.phone && <span className="text-ink-faint">{dd.place.phone}</span>}
                  </div>
                  {dd.place.weekdayText?.length ? (
                    <details className="text-micro text-ink-faint">
                      <summary className="cursor-pointer select-none">Orari</summary>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {dd.place.weekdayText.map((w, i) => <span key={i}>{w}</span>)}
                      </div>
                    </details>
                  ) : null}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {added ? (
          <span className="inline-flex items-center gap-1 text-mini text-success-fg"><IconCheck size={14} /> Aggiunta</span>
        ) : onAdd ? (
          <button type="button" onClick={onAdd} disabled={adding} className={cn(pill, adding ? "bg-surface-soft text-ink-faint cursor-default" : "bg-ink text-white hover:bg-ink-hover")}>
            <IconPlus size={14} /> {addLabel ?? "Aggiungi"}
          </button>
        ) : addHint ? (
          <span className="text-mini text-ink-faint italic">{addHint}</span>
        ) : null}

        {yumeSaved ? (
          <span className="inline-flex items-center gap-1 text-mini text-ink-soft"><IconCheck size={14} /> In Yumeji</span>
        ) : onYumeji ? (
          <button type="button" onClick={onYumeji} disabled={yumeSaving} className={cn(pill, "border border-border-strong bg-transparent text-ink-soft hover:bg-surface-soft", yumeSaving && "opacity-50 cursor-default")}>
            <IconStar size={14} /> Yumeji
          </button>
        ) : null}

        <button type="button" onClick={toggleInfo} className={cn(pill, "border border-border-strong bg-transparent text-ink-soft hover:bg-surface-soft")}>
          <IconChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} /> Più info
        </button>
      </div>
    </div>
  );
}
