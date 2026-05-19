"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { DestinationField } from "@/components/ui/DestinationField";
import { DatePickerField, type DateRange } from "@/components/ui/DatePickerField";
import type { PlaceResult } from "@/components/ui/AddressField";

/* ─────────────────────────────────────────────────────────────────
   CreateTripForm
   Content of the "Create trip" modal — no modal chrome here,
   the parent is responsible for the dialog/sheet wrapper.

   Props:
     onCancel()           — called when user cancels
     onSubmit(data)       — called when user confirms

   Data shape:
     { destination: PlaceResult | null, dates: DateRange,
       adults: number, children: number, themes: string[],
       themeNote: string }
───────────────────────────────────────────────────────────────── */

const THEMES = [
  "Nature", "Food", "Culture", "Sport",
  "Relax", "Family", "Spiritual", "Off-the-beaten",
];

type Card = "dates" | "travelers" | "theme";

export type CreateTripData = {
  destination: PlaceResult | null;
  dates: DateRange;
  adults: number;
  children: number;
  themes: string[];
  themeNote: string;
};

type Props = {
  onCancel?: () => void;
  onSubmit?: (data: CreateTripData) => void;
  /** Pre-populate destination (e.g. from sandbox controls) */
  initialDestination?: PlaceResult | null;
};

export function CreateTripForm({ onCancel, onSubmit, initialDestination = null }: Props) {
  /* ── Destination ── */
  const [destination, setDestination] = useState<PlaceResult | null>(initialDestination);

  /* ── Cards ── */
  const [openCard, setOpenCard] = useState<Card | null>(null);

  function toggleCard(card: Card) {
    setOpenCard((c) => (c === card ? null : card));
  }

  /* ── Dates ── */
  const [dates, setDates] = useState<DateRange>({ start: null, end: null });

  /* ── Travelers ── */
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  /* ── Theme ── */
  const [themes, setThemes] = useState<string[]>([]);
  const [themeNote, setThemeNote] = useState("");

  function toggleTheme(t: string) {
    setThemes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  /* ── Summaries (shown on filled cards) ── */
  function datesSummary(): string | null {
    const { start, end } = dates;
    if (!start) return null;
    const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const curYear = new Date().getFullYear();
    const needsYear = (d: Date) => d.getFullYear() !== curYear;
    const fmtShort = (d: Date, forceYear = false) => {
      const base = `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
      return (forceYear || needsYear(d)) ? `${base} ${d.getFullYear()}` : base;
    };
    if (!end) return `From ${fmtShort(start)}`;
    const n = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    const showYear = needsYear(start) || needsYear(end);
    const diffYear = start.getFullYear() !== end.getFullYear();
    return `${fmtShort(start, showYear || diffYear)} → ${fmtShort(end, showYear)} · ${n} night${n === 1 ? "" : "s"}`;
  }

  function travelersSummary(): string | null {
    if (adults === 2 && children === 0) return null;
    const parts = [`${adults} adult${adults === 1 ? "" : "s"}`];
    if (children) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
    return parts.join(" · ");
  }

  function themeSummary(): string | null {
    if (!themes.length) return null;
    const shown = themes.slice(0, 3).join(" · ");
    return themes.length > 3 ? `${shown} +${themes.length - 3}` : shown;
  }

  const canSubmit = !!destination;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit?.({ destination, dates, adults, children, themes, themeNote });
  }

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 mb-1">
        <GoAvatar size="sm" />
        <h1 className="text-2xl font-serif italic font-medium text-ink leading-tight">
          Alright, let's go!
        </h1>
      </div>
      <p className="text-mini text-ink-faint ml-[38px] mb-4">
        A new trip starts with a place.
      </p>

      {/* ── Destination ── */}
      <DestinationField
        mode="single"
        value={destination}
        onChange={setDestination}
        placeholder="Where would you like to go?"
        placeTypes="(regions)"
      />

      {/* ── Reveal (shown after destination is set) ── */}
      {destination && (
        <div className="mt-3.5 pt-4 border-t border-dashed border-orange-border">

          {/* Go suggests label */}
          <div className="flex items-center gap-2 text-micro font-medium uppercase tracking-[0.08em] text-orange mb-1.5">
            <GoAvatar size="xs" />
            Go suggests
          </div>
          <p className="text-[14px] font-serif italic text-ink leading-snug mb-3">
            Great choice. Want to add anything else, or shall we start like this?
          </p>

          {/* ── Option cards ── */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {(["dates", "travelers", "theme"] as Card[]).map((card) => {
              const meta = {
                dates:     { icon: <CalendarIcon />, title: "Dates",     sub: "Pick start & end",     summary: datesSummary() },
                travelers: { icon: <UsersIcon />,    title: "Travelers", sub: "Solo? With family?",   summary: travelersSummary() },
                theme:     { icon: <SmileIcon />,    title: "Theme",     sub: "Nature, food, culture…", summary: themeSummary() },
              }[card];

              const isActive = openCard === card;
              const isFilled = !!meta.summary;

              return (
                <button
                  key={card}
                  type="button"
                  onClick={() => toggleCard(card)}
                  className={cn(
                    "text-left rounded-xl border p-3 transition-all duration-150",
                    isActive
                      ? "bg-[rgba(13,44,61,0.05)] border-ink shadow-[0_0_0_2px_rgba(13,44,61,0.08)]"
                      : "bg-surface border-border-strong hover:bg-surface-soft hover:border-ink-soft",
                  )}
                >
                  <span className={cn("block mb-1.5 text-[18px]", isActive ? "text-ink" : "text-ink-soft")}>
                    {meta.icon}
                  </span>
                  <div className="text-mini font-medium text-ink">{meta.title}</div>
                  {isFilled ? (
                    <div className="text-micro font-medium text-ink mt-0.5">{meta.summary}</div>
                  ) : (
                    <div className="text-micro font-serif italic text-ink-faint mt-0.5">{meta.sub}</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Anchored form panel ── */}
          {openCard && (
            <div className="relative bg-[rgba(13,44,61,0.04)] border border-[rgba(13,44,61,0.22)] rounded-xl px-4 pt-4 pb-3 mt-0.5">
              {/* Arrow pointing to card */}
              <span
                className="absolute -top-[7px] w-3 h-3 bg-[#f4f2eb] border-t border-l border-[rgba(13,44,61,0.22)] rotate-45"
                style={{ left: openCard === "dates" ? "calc(16.6% - 6px)" : openCard === "travelers" ? "calc(50% - 6px)" : "calc(83.3% - 6px)" }}
              />

              {/* Panel header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[15px] text-ink">
                  {openCard === "dates" ? <CalendarIcon /> : openCard === "travelers" ? <UsersIcon /> : <SmileIcon />}
                </span>
                <span className="text-meta font-medium text-ink">
                  {openCard === "dates" ? "Dates" : openCard === "travelers" ? "Travelers" : "Theme"}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenCard(null)}
                  className="ml-auto text-tiny text-ink-soft underline decoration-ink/20 hover:text-ink transition-colors"
                >
                  Skip
                </button>
              </div>

              {/* ── Dates panel ── */}
              {openCard === "dates" && (
                <DatePickerField
                  mode="range"
                  value={dates}
                  onChange={setDates}
                  fromDate={new Date()}
                  placeholder="Pick your dates"
                />
              )}

              {/* ── Travelers panel ── */}
              {openCard === "travelers" && (
                <div className="flex flex-col divide-y divide-border">
                  {[
                    { key: "adults",   label: "Adults",   sub: "From 18 years", value: adults,   min: 1, set: setAdults },
                    { key: "children", label: "Children", sub: "From 0 to 17",  value: children, min: 0, set: setChildren },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-meta font-medium text-ink">{row.label}</div>
                        <div className="text-tiny font-serif italic text-ink-soft">{row.sub}</div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => row.set((v) => Math.max(row.min, v - 1))}
                          disabled={row.value <= row.min}
                          className="w-7 h-7 rounded-full bg-surface border border-border-strong flex items-center justify-center text-[14px] text-ink hover:border-ink transition-colors disabled:opacity-35 disabled:pointer-events-none"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-[14px] font-medium tabular-nums">{row.value}</span>
                        <button
                          type="button"
                          onClick={() => row.set((v) => v + 1)}
                          className="w-7 h-7 rounded-full bg-surface border border-border-strong flex items-center justify-center text-[14px] text-ink hover:border-ink transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Theme panel ── */}
              {openCard === "theme" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {THEMES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTheme(t)}
                        className={cn(
                          "text-mini px-3 py-1.5 rounded-pill border transition-colors font-medium",
                          themes.includes(t)
                            ? "bg-ink text-white border-ink"
                            : "bg-surface border-border text-ink-soft hover:border-border-strong",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={themeNote}
                    onChange={(e) => setThemeNote(e.target.value)}
                    rows={2}
                    placeholder="Describe your ideal trip — anything Go should know…"
                    className={cn(
                      "w-full resize-none rounded-xl bg-surface border border-border px-3.5 py-2.5",
                      "text-meta text-ink placeholder:text-ink-faint font-sans",
                      "focus:outline-none focus:border-orange focus:shadow-[0_0_0_3px_rgba(244,123,58,0.12)]",
                      "transition-[border-color,box-shadow] duration-150",
                    )}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-end gap-2.5 mt-5 pt-3.5 border-t border-border">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-mini text-ink-soft hover:text-ink underline decoration-ink/20 px-2 py-1.5 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-pill",
            "text-meta font-medium text-white bg-orange",
            "hover:bg-orange-deep transition-colors",
            "disabled:opacity-45 disabled:pointer-events-none",
          )}
        >
          <RocketIcon />
          Create trip
        </button>
      </div>
    </div>
  );
}

/* ── Inline SVG icons ── */
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="inline w-[1em] h-[1em]">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="inline w-[1em] h-[1em]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="inline w-[1em] h-[1em]">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  );
}
function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  );
}
