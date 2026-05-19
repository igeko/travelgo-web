"use client";

import { useState, useEffect, useRef } from "react";
import { IconMapPin, IconX, IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { SearchResult, SearchResponse } from "./types";

type Props = {
  tripId: string;
  dayId: string;
  onSelect: (result: SearchResult) => void;
  onCreateNew: (title: string) => void;
  onClose: () => void;
};

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-orange/20 rounded-[2px] not-italic">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export function ActivityAutocomplete({ tripId, dayId, onSelect, onCreateNew, onClose }: Props) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResponse>({ wishlist: [], platform: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      // Senza query: mostra la wishlist del trip senza filtri
      debounceRef.current = setTimeout(() => fetchResults(""), 0);
      return;
    }

    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function fetchResults(q: string) {
    setLoading(true);
    try {
      const url = `/api/activities/search?trip_id=${tripId}&day_id=${dayId}&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  const hasWishlist = results.wishlist.length > 0;
  const hasPlatform = results.platform.length > 0;
  const hasAny      = hasWishlist || hasPlatform;

  return (
    <div className="rounded-xl border-2 border-orange/40 bg-white shadow-md overflow-hidden">
      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <IconMapPin size={14} className="text-orange shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cerca attività…"
          className="flex-1 text-[13px] text-ink placeholder:text-ink-faint outline-none bg-transparent"
        />
        {loading && (
          <span className="w-3 h-3 rounded-full border-2 border-orange border-t-transparent animate-spin shrink-0" />
        )}
        <button onClick={onClose} className="text-ink-faint hover:text-ink shrink-0 p-0.5 transition-colors">
          <IconX size={13} />
        </button>
      </div>

      {/* Gruppo 1: wishlist */}
      {hasWishlist && (
        <div>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-ink-faint bg-surface-soft border-b border-border">
            Nella wishlist
          </div>
          {results.wishlist.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 hover:bg-surface-soft transition-colors border-b border-border/50"
            >
              <span className="text-sm leading-none shrink-0">📍</span>
              <span className="flex-1 min-w-0 text-[13px] text-ink truncate">
                {highlight(item.title, query)}
              </span>
              {item.in_current_day && (
                <span className="shrink-0 text-[10px] font-bold text-orange bg-orange/10 px-1.5 py-0.5 rounded ml-auto">
                  Questo giorno
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Gruppo 2: piattaforma */}
      {hasPlatform && (
        <div>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-ink-faint bg-surface-soft border-b border-border">
            Su TravelGo
          </div>
          {results.platform.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 hover:bg-surface-soft transition-colors border-b border-border/50"
            >
              <span className="text-sm leading-none shrink-0">🔍</span>
              <span className="flex-1 min-w-0 text-[13px] text-ink truncate">
                {highlight(item.title, query)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasAny && query && (
        <div className="px-3 py-3 text-[12px] text-ink-faint italic">
          Nessun risultato per &ldquo;{query}&rdquo;
        </div>
      )}

      {/* Crea nuova */}
      {query.trim() && (
        <div className="px-3 py-2.5 border-t border-border">
          <button
            onClick={() => onCreateNew(query.trim())}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-orange hover:underline transition-colors"
          >
            <IconPlus size={13} />
            Crea &ldquo;{query.trim()}&rdquo; come nuova attività
          </button>
        </div>
      )}
    </div>
  );
}
