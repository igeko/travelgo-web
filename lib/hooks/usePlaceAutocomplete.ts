"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaceResult } from "@/components/ui/AddressField";
import { api } from "@/lib/client";

export type Suggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type UsePlaceAutocompleteOptions = {
  /** Google Places autocomplete type filter. Default: undefined (uses API default). */
  types?: string;
};

export type UsePlaceAutocompleteReturn = {
  inputText: string;
  setInputText: (text: string) => void;
  suggestions: Suggestion[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  isLoadingSuggestions: boolean;
  isLoadingDetails: boolean;
  isLoading: boolean;
  handleInputChange: (text: string, onClear?: () => void) => void;
  selectSuggestion: (suggestion: Suggestion, onSelect: (place: PlaceResult) => void) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent, onSelect: (place: PlaceResult) => void) => void;
};

/**
 * Shared autocomplete logic for address/destination fields.
 * Handles debounced fetch to /api/places/autocomplete,
 * detail fetch to /api/places/details, keyboard navigation,
 * and loading states.
 */
export function usePlaceAutocomplete(options: UsePlaceAutocompleteOptions = {}): UsePlaceAutocompleteReturn {
  const { types } = options;
  const [inputText, setInputText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Cleanup debounce on unmount ── */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /* ── Autocomplete fetch (debounced 300ms) ── */
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await api.places.autocomplete<Suggestion>(query, types);
      setSuggestions(suggestions);
      setIsOpen(suggestions.length > 0);
      setActiveIndex(-1);
    } catch {
      // silently ignore network errors
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  /* ── Input change handler ── */
  const handleInputChange = useCallback(
    (text: string, onClear?: () => void) => {
      setInputText(text);
      if (!text.trim()) {
        onClear?.();
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
    },
    [fetchSuggestions],
  );

  /* ── Place details fetch on selection ── */
  const selectSuggestion = useCallback(
    async (suggestion: Suggestion, onSelect: (place: PlaceResult) => void) => {
      setIsOpen(false);
      setInputText(suggestion.description);
      setSuggestions([]);

      setIsLoadingDetails(true);
      try {
        const place = await api.places.details<PlaceResult>(suggestion.placeId);
        if (place) onSelect(place);
      } catch {
        onSelect({
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
    [],
  );

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, onSelect: (place: PlaceResult) => void) => {
      if (!isOpen || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex], onSelect);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    },
    [isOpen, suggestions, activeIndex, selectSuggestion],
  );

  return {
    inputText,
    setInputText,
    suggestions,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    isLoadingSuggestions,
    isLoadingDetails,
    isLoading: isLoadingSuggestions || isLoadingDetails,
    handleInputChange,
    selectSuggestion,
    handleKeyDown,
  };
}
