"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { SoftField } from "./SoftField";
import { IconMapPin, IconX } from "./icons";
import { usePlaceAutocomplete } from "@/lib/hooks/usePlaceAutocomplete";
import type { PlaceResult } from "./AddressField";

/* ─────────────────────────────────────────────────────────────────
   DestinationField
   Autocomplete field for selecting travel destinations.

   Two modes:
   - single:   value is PlaceResult | null. Shows a chip when selected;
               input stays active to replace with a new search.
   - multiple: value is PlaceResult[]. Chips accumulate; input stays
               active to add more destinations.

   placeTypes controls the Google Places autocomplete filter:
   - "(regions)"      cities + regions + countries (default — best for travel)
   - "(cities)"       cities only
   - "country"        countries only
   - "geocode"        any geographic address
   - "establishment"  businesses, POIs
   - "address"        precise street addresses

   Usage:
     <DestinationField mode="single" value={place} onChange={setPlace} />
     <DestinationField mode="multiple" value={places} onChange={setPlaces} placeTypes="(cities)" />
───────────────────────────────────────────────────────────────── */

export type PlaceTypes =
  | "(regions)"
  | "(cities)"
  | "country"
  | "geocode"
  | "address"
  | "establishment"
  | "locality"
  | "sublocality"
  | "postal_code"
  | "administrative_area_level_1"
  | "administrative_area_level_2";

type SingleProps = {
  mode: "single";
  value: PlaceResult | null;
  onChange: (place: PlaceResult | null) => void;
};

type MultipleProps = {
  mode: "multiple";
  value: PlaceResult[];
  onChange: (places: PlaceResult[]) => void;
};

type CommonProps = {
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  /**
   * Google Places autocomplete type filter. One or more types joined with "|".
   * Default: ["(regions)"] — best for travel destinations (cities, regions, countries).
   * Examples:
   *   placeTypes={["(cities)"]}
   *   placeTypes={["locality", "administrative_area_level_1"]}
   *   placeTypes={["geocode", "establishment"]}
   */
  placeTypes?: PlaceTypes | PlaceTypes[];
};

export type DestinationFieldProps = (SingleProps | MultipleProps) & CommonProps;

export function DestinationField(props: DestinationFieldProps) {
  const {
    placeholder = "Search destination…",
    label,
    disabled,
    className,
    autoFocus,
    placeTypes = "(regions)",
  } = props;

  const typesString = Array.isArray(placeTypes) ? placeTypes.join("|") : placeTypes;

  const {
    inputText,
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
  } = usePlaceAutocomplete({ types: typesString });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  /* ── Derive chips from value ── */
  const chips: PlaceResult[] =
    props.mode === "single"
      ? props.value ? [props.value] : []
      : props.value;

  /* ── Click outside closes dropdown ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  /* ── Handlers ── */
  function handleSelect(place: PlaceResult) {
    if (props.mode === "single") {
      props.onChange(place);
    } else {
      const already = props.value.some((p) => p.placeId === place.placeId);
      if (!already) props.onChange([...props.value, place]);
    }
    setIsOpen(false);
  }

  function removeChip(placeId: string) {
    if (props.mode === "single") {
      props.onChange(null);
    } else {
      props.onChange(props.value.filter((p) => p.placeId !== placeId));
    }
  }

  const isDisabled = disabled || isLoadingDetails;

  /* ── Placeholder logic ── */
  const activePlaceholder =
    props.mode === "single" && props.value
      ? "Search another destination…"
      : placeholder;

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <SoftField
        value={inputText}
        onChange={(text) =>
          handleInputChange(text, () => {
            if (props.mode === "single") props.onChange(null);
          })
        }
        placeholder={activePlaceholder}
        label={label}
        disabled={isDisabled}
        autoComplete="off"
        inputProps={{
          autoFocus,
          onKeyDown: (e) => handleKeyDown(e, handleSelect),
          role: "combobox",
          "aria-autocomplete": "list",
          "aria-controls": isOpen ? listboxId : undefined,
          "aria-expanded": isOpen,
        }}
      >
        {/* Chips + pin prefix */}
        <SoftField.Prefix>
          <span className="flex items-center gap-1.5 flex-wrap">
            {chips.map((chip) => (
              <Chip
                key={chip.placeId}
                label={chip.name || chip.formatted}
                onRemove={() => removeChip(chip.placeId)}
                disabled={isDisabled}
              />
            ))}
            {chips.length === 0 && (
              <IconMapPin
                className={cn(
                  "size-3.5 shrink-0 transition-opacity duration-150",
                  isLoading ? "opacity-40" : "text-ink-faint",
                )}
              />
            )}
          </span>
        </SoftField.Prefix>
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
                selectSuggestion(s, handleSelect);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex items-start gap-2.5 px-4 py-2.5 cursor-pointer transition-colors duration-75",
                i === activeIndex ? "bg-surface-soft" : "hover:bg-surface-soft",
              )}
            >
              <span className="shrink-0 mt-0.5 text-ink-faint [&>svg]:size-3.5">
                <IconMapPin />
              </span>
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

/* ─────────────────────────────────────────────────────────────────
   Chip
───────────────────────────────────────────────────────────────── */

function Chip({
  label,
  onRemove,
  disabled,
}: {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-ink text-white rounded-pill pl-2.5 pr-1.5 py-[3px] text-[12px] font-medium leading-none shrink-0">
      <span className="truncate max-w-[160px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${label}`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white/60 hover:text-white hover:bg-white/15 transition-colors ml-0.5 disabled:pointer-events-none"
      >
        <IconX className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
