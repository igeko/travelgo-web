"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { SoftField } from "./SoftField";
import { IconMap, IconMapPin } from "./icons";
import { usePlaceAutocomplete } from "@/lib/hooks/usePlaceAutocomplete";

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

/* ─────────────────────────────────────────────────────────────────
   AddressField
   A SoftField wired to /api/places/autocomplete + /api/places/details.
   Autocomplete logic is shared via usePlaceAutocomplete().
───────────────────────────────────────────────────────────────── */

export type AddressFieldProps = {
  value: PlaceResult | null;
  onChange: (place: PlaceResult | null) => void;
  placeholder?: string;
  /**
   * Visual style — forwarded to the underlying SoftField.
   * - "pill" (default): soft pill with the map pin in the prefix slot.
   * - "inline": "passport row" — no chrome, pin + eyebrow label inline.
   *   `label` becomes the eyebrow; `error`/`errorMessage` show below the row.
   */
  variant?: "pill" | "inline";
  /** Floating label (pill) / eyebrow label (inline), passed through to SoftField */
  label?: string;
  disabled?: boolean;
  /** Error state — tints the value (inline variant). */
  error?: boolean;
  /** Micro message below the row (inline variant). */
  errorMessage?: ReactNode;
  /** Extra classes on the outer wrapper div */
  className?: string;
  /** Show the "map" button in the suffix. Visual only for now. */
  showMapButton?: boolean;
  /** When true the floating label is always visible (not just on hover/focus) */
  labelAlwaysVisible?: boolean;
};

export function AddressField({
  value,
  onChange,
  placeholder = "Search address…",
  variant = "pill",
  label,
  disabled,
  error,
  errorMessage,
  className,
  showMapButton = false,
  labelAlwaysVisible,
}: AddressFieldProps) {
  const inline = variant === "inline";
  const {
    inputText,
    setInputText,
    suggestions,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    isLoading,
    isLoadingDetails,
    handleInputChange,
    selectSuggestion,
    handleKeyDown,
  } = usePlaceAutocomplete();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Map pin — faint when empty, red when a valid place is selected, dimmed while
  // a suggestion request is in flight. Shared between the inline `icon` prop and
  // the pill `SoftField.Prefix` slot.
  const pin = (
    <IconMapPin
      className={cn(
        "transition-colors transition-opacity duration-150",
        isLoading && "opacity-40",
        value && !isLoading ? "text-[#e24b4a]" : "text-ink-faint",
      )}
    />
  );

  // Keep inputText in sync if the parent resets value externally
  useEffect(() => {
    setInputText(value?.formatted ?? "");
  }, [value, setInputText]);

  /* ── Click outside closes the dropdown ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <SoftField
        variant={variant}
        icon={inline ? pin : undefined}
        value={inputText}
        onChange={(text) => handleInputChange(text, () => onChange(null))}
        placeholder={placeholder}
        label={label}
        labelAlwaysVisible={labelAlwaysVisible}
        disabled={disabled || isLoadingDetails}
        error={error}
        errorMessage={errorMessage}
        autoComplete="off"
        inputProps={{
          onKeyDown: (e) => handleKeyDown(e, (place) => onChange(place)),
          role: "combobox",
          "aria-autocomplete": "list",
          "aria-controls": isOpen ? listboxId : undefined,
          "aria-expanded": isOpen,
        }}
      >
        {/* Pill: pin lives in the prefix slot. Inline: it goes via the `icon` prop above. */}
        {!inline && <SoftField.Prefix>{pin}</SoftField.Prefix>}
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
                e.preventDefault();
                selectSuggestion(s, (place) => onChange(place));
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex items-start gap-2.5 px-4 py-2.5 cursor-pointer",
                "transition-colors duration-75",
                i === activeIndex ? "bg-surface-soft" : "hover:bg-surface-soft",
              )}
            >
              <span className="shrink-0 mt-0.5 text-ink-faint [&>svg]:size-3.5">
                <IconMapPin />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-meta font-medium text-ink leading-snug truncate">
                  {s.mainText}
                </span>
                {s.secondaryText && (
                  <span className="text-tiny text-ink-soft leading-snug truncate">
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
