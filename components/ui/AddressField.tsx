"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { SoftField } from "./SoftField";
import { IconMap, IconMapPin } from "./icons";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */

/** Structured result returned to the parent on selection. */
export type PlaceResult = {
  /** Human-readable formatted address from Google */
  formatted: string;
  /** Optional place name (e.g. "Shinjuku Gyoen") for establishments */
  name: string;
  /** Google place_id — stable identifier, good for storing in DB */
  placeId: string;
  lat: number;
  lng: number;
  /**
   * Flat map of address_component types → long_name.
   * Common keys: locality, administrative_area_level_1, country, postal_code.
   */
  components?: Record<string, string>;
};

type Suggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

/* ─────────────────────────────────────────────────────────────────
   AddressField
   A SoftField wired to /api/places/autocomplete + /api/places/details.

   Usage:
     <AddressField
       value={place}
       onChange={setPlace}
       placeholder="Search a place…"
       label="Location"
     />

   - Controlled-only: parent owns `value` (PlaceResult | null) + onChange.
   - Debounce 300 ms on the autocomplete call.
   - Escape or click-outside closes the dropdown.
   - Selecting a suggestion fetches full details (lat/lng, components)
     then calls onChange with the PlaceResult.
   - Clearing the text field calls onChange(null).
───────────────────────────────────────────────────────────────── */

export type AddressFieldProps = {
  value: PlaceResult | null;
  onChange: (place: PlaceResult | null) => void;
  placeholder?: string;
  /** Floating label shown on focus (passed through to SoftField) */
  label?: string;
  disabled?: boolean;
  /** Extra classes on the outer wrapper div */
  className?: string;
  /** Show the "map" button in the suffix. Visual only for now. */
  showMapButton?: boolean;
};

export function AddressField({
  value,
  onChange,
  placeholder = "Search address…",
  label,
  disabled,
  className,
  showMapButton = false,
}: AddressFieldProps) {
  // The text the user is typing — decoupled from the selected PlaceResult
  const [inputText, setInputText] = useState(value?.formatted ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Keep inputText in sync if the parent resets value externally
  useEffect(() => {
    setInputText(value?.formatted ?? "");
  }, [value]);

  /* ── Autocomplete fetch (debounced) ── */
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(query)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
      setIsOpen((data.suggestions ?? []).length > 0);
      setActiveIndex(-1);
    } catch {
      // Network error — silently ignore, user can keep typing
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);

      // If the user clears the field, notify parent immediately
      if (!text.trim()) {
        onChange(null);
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      // Debounce the API call
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
    },
    [fetchSuggestions, onChange],
  );

  /* ── Place details fetch on selection ── */
  const selectSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      setIsOpen(false);
      setInputText(suggestion.description);
      setSuggestions([]);

      setIsLoadingDetails(true);
      try {
        const res = await fetch(
          `/api/places/details?placeId=${encodeURIComponent(suggestion.placeId)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.place) onChange(data.place as PlaceResult);
      } catch {
        // If details fail, at least surface the formatted text
        onChange({
          formatted: suggestion.description,
          name: suggestion.mainText,
          placeId: suggestion.placeId,
          lat: 0,
          lng: 0,
          components: {},
        });
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [onChange],
  );

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    },
    [isOpen, suggestions, activeIndex, selectSuggestion],
  );

  /* ── Click outside closes the dropdown ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Cleanup debounce on unmount ── */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const isLoading = isLoadingSuggestions || isLoadingDetails;

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {/* Input — reuses SoftField visuals */}
      <SoftField
        value={inputText}
        onChange={handleInputChange}
        placeholder={placeholder}
        label={label}
        disabled={disabled || isLoadingDetails}
        autoComplete="off"
        inputProps={{
          onKeyDown: handleKeyDown,
          role: "combobox",
          "aria-autocomplete": "list",
          "aria-controls": isOpen ? listboxId : undefined,
          "aria-expanded": isOpen,
        }}
      >
        <SoftField.Prefix>
          <IconMapPin
            className={cn(
              "transition-colors transition-opacity duration-150",
              isLoading && "opacity-40",
              value && !isLoading ? "text-[#e24b4a]" : "text-ink-faint",
            )}
          />
        </SoftField.Prefix>
        {showMapButton && (
          <SoftField.Suffix>
            <Button variant="outline" iconOnly={false}>
              <IconMap />
              map
            </Button>
          </SoftField.Suffix>
        )}
      </SoftField>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute z-50 top-[calc(100%+6px)] left-0 right-0",
            "bg-surface border border-border rounded-lg shadow-[0_4px_24px_rgba(13,44,61,0.10)]",
            "py-1 overflow-hidden",
          )}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                // Prevent the SoftField from losing focus before we register the click
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex items-start gap-2.5 px-4 py-2.5 cursor-pointer",
                "transition-colors duration-75",
                i === activeIndex
                  ? "bg-surface-soft"
                  : "hover:bg-surface-soft",
              )}
            >
              {/* Pin icon column */}
              <span className="shrink-0 mt-0.5 text-ink-faint [&>svg]:size-3.5">
                <IconMapPin />
              </span>

              {/* Text column */}
              <span className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium text-ink leading-snug truncate">
                  {s.mainText}
                </span>
                {s.secondaryText && (
                  <span className="text-[11px] text-ink-soft leading-snug truncate">
                    {s.secondaryText}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
