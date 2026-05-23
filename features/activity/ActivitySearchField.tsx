"use client";

/**
 * ActivitySearchField — combobox to search the activities of a trip.
 *
 * Controlled selection (`value` / `onChange`). Results are grouped into
 * "To plan" (no scheduled occurrence) and "Already planned" (with the
 * local day label, time and booking status of each occurrence).
 *
 * Two layouts:
 *  • floating (default) — bare input, dropdown opens on focus, closes on
 *    click-outside / Esc.
 *  • inline panel (`defaultOpen`) — input + list as one always-open panel
 *    that takes space in the layout (e.g. a day-editor add zone).
 *
 * Data source: pass `tripId` to fetch the trip's activities once, or pass
 * `items` directly (tests / sandbox). Filtering is client-side.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useRef,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  IconSearch,
  IconX,
  IconPlus,
  IconCalendarTime,
  IconCircleDashed,
  IconMapPin,
} from "@/components/ui/icons";
import { SoftField } from "@/components/ui/SoftField";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import type { ActivitySearchWishlistRow } from "@/lib/dal";
import type { BookingStatus, TripActivityOption } from "./types";

// ── Helpers ────────────────────────────────────────────────────────

function formatDayLabel(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  const wd = weekday.replace(/\.$/, "");
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${date.getDate()}`;
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/20 rounded-sm not-italic">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}

const STATUS_DOT: Record<BookingStatus, string> = {
  todo: "bg-status-todo-fg",
  booked: "bg-status-booked-fg",
  paid: "bg-status-paid-fg",
};

function mapWishlist(rows: ActivitySearchWishlistRow[]): TripActivityOption[] {
  return rows.map((r) => ({
    id: r.id,
    title: String(r.title ?? ""),
    location: (r.location as string | null) ?? null,
    scheduled: r.scheduled ?? [],
  }));
}

// ── Component ──────────────────────────────────────────────────────

export type ActivitySearchFieldProps = {
  value: TripActivityOption | null;
  onChange: (activity: TripActivityOption | null) => void;
  /**
   * When set, a "create new" row appears at the end of the results whenever
   * the typed query has no exact title match. Called with the trimmed text.
   */
  onCreate?: (title: string) => void;
  /** Fetch the trip's activities. Ignored when `items` is provided. */
  tripId?: string;
  /** Pre-supplied activities (skips fetching). For tests / sandbox. */
  items?: TripActivityOption[];
  placeholder?: string;
  label?: string;
  /** When true the floating label is always visible (not just on hover/focus). */
  labelAlwaysVisible?: boolean;
  className?: string;
  /** Visual size of the field, mirroring SoftField. Default "md". */
  size?: "sm" | "md";
  /** Render the input without pill chrome (transparent) — for embedding in another container. */
  bare?: boolean;
  /** Only open the dropdown once the user has typed (no full list on focus). */
  requireQuery?: boolean;
  /**
   * When `true`, render as an always-open inline panel (input + list).
   * Otherwise the dropdown floats and opens on focus.
   */
  defaultOpen?: boolean;
  /** Autofocus the input on mount (e.g. when the field opens inside a form). */
  autoFocus?: boolean;
  /**
   * Activity ids to omit from the results — e.g. activities already scheduled
   * on the current day, so they can't be picked and duplicated.
   */
  excludeIds?: string[];
};

export function ActivitySearchField({
  value,
  onChange,
  onCreate,
  tripId,
  items,
  placeholder,
  label,
  labelAlwaysVisible,
  className,
  size = "md",
  bare = false,
  requireQuery = false,
  defaultOpen = false,
  autoFocus = false,
  excludeIds,
}: ActivitySearchFieldProps) {
  const t = useTranslations("ActivitySearch");
  const locale = useLocale();

  const [fetched, setFetched] = useState<TripActivityOption[]>([]);
  // Risultati di una ricerca server-side sul termine digitato: includono il
  // "platform" (gli yume dell'utente non ancora nel trip), che il fetch iniziale
  // — fatto con query vuota — non restituisce.
  const [searched, setSearched] = useState<TripActivityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState(value?.title ?? "");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeIndex, setActiveIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  // Data source: explicit items win; altrimenti unione (deduplicata) delle
  // activity del trip + i risultati di ricerca (incluso il platform/yume).
  const allItems = useMemo(() => {
    if (items) return items;
    const map = new Map<string, TripActivityOption>();
    for (const a of fetched) map.set(a.id, a);
    for (const a of searched) if (!map.has(a.id)) map.set(a.id, a);
    return [...map.values()];
  }, [items, fetched, searched]);

  // Sync the input text when the controlled value changes from outside, and
  // reset the active option when the query changes — both adjusted during
  // render (the sanctioned alternative to a state-syncing effect).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputText(value?.title ?? "");
  }
  const [prevInput, setPrevInput] = useState(inputText);
  if (inputText !== prevInput) {
    setPrevInput(inputText);
    setActiveIndex(0);
  }

  // Fetch the trip's activities once (skipped when items are supplied).
  useEffect(() => {
    if (items || !tripId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.activities.search({ tripId, query: "" });
        if (!cancelled) setFetched(mapWishlist(res.wishlist));
      } catch {
        if (!cancelled) setFetched([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tripId, items]);

  // Ricerca server-side sul termine digitato (debounced): porta anche il
  // platform (yume dell'utente fuori dal trip) tra i risultati selezionabili.
  useEffect(() => {
    if (items || !tripId) return;
    const q = inputText.trim();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (!q || q === (value?.title ?? "")) {
        setSearched([]);
        return;
      }
      try {
        const res = await api.activities.search({ tripId, query: q });
        setSearched([
          ...mapWishlist(res.wishlist),
          ...res.platform.map((r) => ({
            id: r.id,
            title: String(r.title ?? ""),
            location: (r.location as string | null) ?? null,
            scheduled: [],
          })),
        ]);
      } catch {
        // keep previous results on failure
      }
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [inputText, items, tripId, value]);

  const excludeKey = excludeIds?.join(",") ?? "";
  const { toPlan, planned, flat } = useMemo(() => {
    const excluded = excludeKey ? new Set(excludeKey.split(",")) : null;
    const pool = excluded ? allItems.filter((a) => !excluded.has(a.id)) : allItems;
    const q = inputText.trim().toLowerCase();
    const matches =
      q && q !== (value?.title ?? "").toLowerCase()
        ? pool.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              (a.location ?? "").toLowerCase().includes(q),
          )
        : pool;
    const toPlan = matches.filter((a) => a.scheduled.length === 0);
    const planned = matches.filter((a) => a.scheduled.length > 0);
    return { toPlan, planned, flat: [...toPlan, ...planned] };
  }, [inputText, value, allItems, excludeKey]);

  // Click-outside closes the dropdown (floating mode only).
  useEffect(() => {
    if (defaultOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [defaultOpen]);

  const selectActivity = useCallback(
    (a: TripActivityOption) => {
      setInputText(a.title);
      setIsOpen(false);
      onChange(a);
    },
    [onChange],
  );

  const handleInputChange = (text: string) => {
    setInputText(text);
    setIsOpen(true);
    if (value && text !== value.title) onChange(null);
  };

  const trimmedQuery = inputText.trim();
  const hasExactMatch = flat.some((a) => a.title.toLowerCase() === trimmedQuery.toLowerCase());
  const canCreate = !!onCreate && trimmedQuery.length > 0 && !hasExactMatch;
  const handleCreate = () => {
    if (!canCreate) return;
    setIsOpen(false);
    onCreate?.(trimmedQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (isOpen && flat[activeIndex]) {
        e.preventDefault();
        selectActivity(flat[activeIndex]);
      } else if (isOpen && canCreate) {
        e.preventDefault();
        handleCreate();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const optionId = (id: string) => `${listboxId}-opt-${id}`;
  const activeOption = flat[activeIndex];

  const inputElement = (
    <SoftField
      value={inputText}
      onChange={handleInputChange}
      placeholder={placeholder ?? t("placeholder")}
      label={label}
      labelAlwaysVisible={labelAlwaysVisible}
      size={size}
      bare={bare}
      autoComplete="off"
      inputProps={{
        autoFocus,
        onFocus: () => setIsOpen(true),
        onKeyDown: handleKeyDown,
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-controls": isOpen ? listboxId : undefined,
        "aria-expanded": isOpen,
        "aria-activedescendant":
          isOpen && activeOption ? optionId(activeOption.id) : undefined,
      }}
    >
      <SoftField.Prefix>
        <IconSearch
          className={cn(
            "transition-colors duration-150",
            value ? "text-primary" : "text-ink-faint",
          )}
        />
      </SoftField.Prefix>
      <SoftField.Suffix>
        {loading && (
          <span className="w-3 h-3 rounded-pill border-2 border-primary border-t-transparent animate-spin" />
        )}
        {inputText && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setInputText("");
              onChange(null);
              setIsOpen(true);
            }}
            className="text-ink-faint hover:text-ink p-0.5 transition-colors"
            aria-label={t("clear")}
          >
            <IconX size={13} />
          </button>
        )}
      </SoftField.Suffix>
    </SoftField>
  );

  const renderOption = (a: TripActivityOption) => {
    const i = flat.indexOf(a);
    return (
      <Option
        key={a.id}
        id={optionId(a.id)}
        item={a}
        query={inputText}
        active={i === activeIndex}
        locale={locale}
        size={size}
        statusLabel={statusLabel(t)}
        wishlistOnlyLabel={t("wishlistOnly")}
        onSelect={selectActivity}
        onHover={() => setActiveIndex(i)}
      />
    );
  };

  const listContent = (
    <ul id={listboxId} role="listbox" aria-label={t("listLabel")} className="py-1">
      {toPlan.length > 0 && (
        <SectionLabel label={t("toPlan")} count={toPlan.length} tone="neutral" size={size} />
      )}
      {toPlan.map(renderOption)}

      {planned.length > 0 && (
        <SectionLabel label={t("planned")} count={planned.length} tone="brand" size={size} />
      )}
      {planned.map(renderOption)}
    </ul>
  );

  const emptyState = (
    <div className="px-3 py-3 text-mini text-ink-faint italic text-center">
      {t("noResults", { query: inputText })}
    </div>
  );

  const createRow = canCreate ? (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
      className={cn(
        "w-full flex items-center gap-2.5 text-left transition-colors bg-primary-soft/40 hover:bg-primary-soft",
        size === "sm" ? "px-3 py-2" : "px-4 py-2.5",
        flat.length > 0 && "border-t border-dashed border-primary-border",
      )}
    >
      <span className="w-6 h-6 rounded-full bg-primary text-white inline-flex items-center justify-center shrink-0">
        <IconPlus size={13} />
      </span>
      <span className="text-mini text-primary-deep font-medium truncate">
        {t("createNew", { title: trimmedQuery })}
      </span>
    </button>
  ) : null;

  /** Body shared by inline + floating: matches (or empty/create state). */
  const dropdownBody = (
    <>
      {flat.length > 0 ? listContent : (canCreate ? null : emptyState)}
      {createRow}
    </>
  );

  // ── Inline panel ─────────────────────────────────────────────────
  // Bare input on top, results in their own bordered box below.
  if (defaultOpen) {
    const showResults = flat.length > 0 || inputText.trim().length > 0;
    return (
      <div ref={wrapperRef} className={cn("w-full", className)}>
        {inputElement}
        {showResults && (
          <div className="mt-2 bg-surface border border-border rounded-lg overflow-hidden">
            <div className="max-h-[360px] overflow-y-auto scrollbar-thin">
              {dropdownBody}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Floating ─────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {inputElement}

      {isOpen && (requireQuery ? inputText.trim().length > 0 : flat.length > 0 || inputText.trim().length > 0) && (
        <div
          className={cn(
            "absolute z-dropdown top-[calc(100%+6px)] left-0 right-0",
            "bg-surface border border-border rounded-lg overflow-hidden",
            "shadow-[0_4px_24px_rgba(13,44,61,0.10)]",
          )}
        >
          <div className="max-h-[360px] overflow-y-auto scrollbar-thin">{dropdownBody}</div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────

function statusLabel(t: ReturnType<typeof useTranslations>): Record<BookingStatus, string> {
  return {
    todo: t("statusTodo"),
    booked: t("statusBooked"),
    paid: t("statusPaid"),
  };
}

function SectionLabel({
  label,
  count,
  tone,
  size,
}: {
  label: string;
  count: number;
  tone: "neutral" | "brand";
  size: "sm" | "md";
}) {
  return (
    <li
      role="presentation"
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between",
        size === "sm" ? "px-3 py-1" : "px-4 py-1.5",
        "text-micro font-bold uppercase tracking-eyebrow-wide",
        tone === "brand"
          ? "bg-primary-soft text-primary-deep border-b border-primary-border"
          : "bg-surface-soft text-ink-faint border-b border-border",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "normal-case font-medium tracking-normal tabular-nums",
          tone === "brand" ? "text-primary-deep/70" : "text-ink-faint/80",
        )}
      >
        {count}
      </span>
    </li>
  );
}

function Option({
  id,
  item,
  query,
  active,
  locale,
  size,
  statusLabel,
  wishlistOnlyLabel,
  onSelect,
  onHover,
}: {
  id: string;
  item: TripActivityOption;
  query: string;
  active: boolean;
  locale: string;
  size: "sm" | "md";
  statusLabel: Record<BookingStatus, string>;
  wishlistOnlyLabel: string;
  onSelect: (a: TripActivityOption) => void;
  onHover: () => void;
}) {
  const isScheduled = item.scheduled.length > 0;
  const small = size === "sm";

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(item);
      }}
      onMouseEnter={onHover}
      className={cn(
        "flex items-start gap-2.5 cursor-pointer transition-colors duration-75",
        small ? "px-3 py-2" : "px-4 py-2.5",
        active && "bg-surface-soft",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 w-[3px] self-stretch rounded-pill mt-0.5",
          isScheduled ? "bg-primary" : "bg-border-strong",
        )}
      />

      <span className="flex flex-col min-w-0 flex-1">
        <span
          className={cn(
            "font-medium text-ink leading-snug truncate",
            small ? "text-mini" : "text-meta",
          )}
        >
          {highlight(item.title, query)}
        </span>

        <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.location && (
            <span className="inline-flex items-center gap-0.5 text-tiny text-ink-soft">
              <IconMapPin size={10} />
              {item.location}
            </span>
          )}

          {item.location && (
            <span aria-hidden className="text-tiny text-ink-faint">
              ·
            </span>
          )}

          {isScheduled ? (
            item.scheduled.map((sch, i) => {
              const status = sch.status ?? undefined;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-tiny text-primary-deep font-medium"
                  title={
                    status
                      ? `${statusLabel[status]}${sch.time ? ` · ${sch.time}` : ""}`
                      : undefined
                  }
                >
                  {status && (
                    <span
                      aria-hidden
                      className={cn("inline-block w-1.5 h-1.5 rounded-pill", STATUS_DOT[status])}
                    />
                  )}
                  <IconCalendarTime size={10} />
                  {sch.date ? formatDayLabel(sch.date, locale) : null}
                  {sch.time && (
                    <span className="text-ink-faint font-normal tabular-nums">{sch.time}</span>
                  )}
                  {i < item.scheduled.length - 1 && <span className="text-ink-faint">,</span>}
                </span>
              );
            })
          ) : (
            <span className="inline-flex items-center gap-1 text-tiny text-ink-faint italic">
              <IconCircleDashed size={10} />
              {wishlistOnlyLabel}
            </span>
          )}
        </span>
      </span>
    </li>
  );
}
