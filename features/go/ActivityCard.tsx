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

import { useState } from "react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import { IconCheck, IconPlus, IconStar, IconChevronDown } from "@/components/ui/icons";

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

type DeepDive = { overview: string; tips: string[]; bestFor: string; avoid: string | null; nearbyIdeas: string[] };

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
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dd, setDd] = useState<DeepDive | null>(null);
  const [ddLoading, setDdLoading] = useState(false);

  const meta = [
    data.day != null ? `Giorno ${data.day}` : null,
    data.slot ? (SLOT_LABEL[data.slot] ?? data.slot) : null,
    data.time || null,
  ].filter(Boolean).join(" · ");

  const toggleInfo = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!dd && !ddLoading) {
      setDdLoading(true);
      try {
        setDd(await api.go.deepDive({ title: data.title, category: data.category, location, why: data.description }));
      } catch {
        /* leave dd null — the row just shows nothing */
      } finally {
        setDdLoading(false);
      }
    }
  };

  const pill = "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-mini font-medium transition-colors cursor-pointer";

  return (
    <div className={cn("rounded-md border border-border bg-surface p-3", className)}>
      <div className="flex items-baseline gap-2">
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
