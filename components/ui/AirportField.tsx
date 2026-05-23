"use client";

/**
 * AirportField — autocomplete over the airport reference table.
 *
 * Searches IATA / name / city via `api.airports.search` (debounced) and, on
 * select, emits a `{ city, iata }` value ready for the boarding pass. Built on
 * SoftField + a results dropdown; closes on click-outside / Escape.
 */

import { useEffect, useId, useRef, useState } from "react";
import { SoftField } from "@/components/ui/SoftField";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import type { DbAirport } from "@/lib/dal";
import type { TripAirport } from "@/lib/trip-home/airports";

function label(a: TripAirport): string {
  return a.city ? `${a.city} (${a.iata})` : a.iata;
}

export type AirportFieldProps = {
  value: TripAirport | null;
  onChange: (value: TripAirport | null) => void;
  label?: string;
  placeholder?: string;
};

export function AirportField({ value, onChange, label: fieldLabel, placeholder }: AirportFieldProps) {
  const [query, setQuery] = useState(value ? label(value) : "");
  const [results, setResults] = useState<DbAirport[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Debounced search while the dropdown is open.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    let active = true;
    const timer = setTimeout(() => {
      if (q.length < 2) { if (active) setResults([]); return; }
      api.airports.search(q)
        .then((r) => { if (active) setResults(r); })
        .catch(() => { if (active) setResults([]); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [query, open]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function select(a: DbAirport) {
    const picked: TripAirport = { city: a.city ?? a.name, iata: a.iata };
    onChange(picked);
    setQuery(label(picked));
    setOpen(false);
  }

  function handleInput(v: string) {
    setQuery(v);
    setOpen(true);
    if (v.trim() === "") onChange(null);
  }

  return (
    <div ref={wrapRef} className="relative">
      <SoftField
        label={fieldLabel}
        value={query}
        onChange={handleInput}
        placeholder={placeholder}
        hideCounter
        inputProps={{
          onFocus: () => setOpen(true),
          onKeyDown: (e) => { if (e.key === "Escape") setOpen(false); },
          role: "combobox",
          "aria-expanded": open,
          "aria-controls": listId,
          autoComplete: "off",
        }}
      />
      {open && results.length > 0 && (
        <ul
          id={listId}
          className="absolute z-dropdown left-0 right-0 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-surface shadow-lg py-1"
        >
          {results.map((a) => (
            <li key={a.iata}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(a); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-soft transition-colors",
                )}
              >
                <span className="font-mono text-mini font-medium text-orange-deep w-9 shrink-0">{a.iata}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-mini text-ink truncate">{a.name}</span>
                  {(a.city || a.country) && (
                    <span className="block text-tiny text-ink-faint truncate">
                      {[a.city, a.country].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
