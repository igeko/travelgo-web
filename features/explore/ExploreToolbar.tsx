"use client";

/**
 * ExploreToolbar — macro rail + sub-category chip row, vertical or horizontal.
 *
 * Presentation-only: it never performs the side-effect of a selection. It
 * emits the chosen sub-category through `onSelectSub` and lets the host page
 * decide what to do (query places, drop markers…). Same decoupling philosophy
 * as the Go event bus, expressed here through callback props.
 *
 * Two orientations, switched by the host on its own breakpoint:
 *
 *  - "vertical" (desktop) — rail anchored top-right of a `relative` container,
 *    the chip row flows out to its left:
 *      <ExploreToolbar className="absolute right-4 top-4 z-20" … />
 *
 *  - "horizontal" (mobile) — full-width macro bar on top, sub chip row stacked
 *    below it:
 *      <ExploreToolbar orientation="horizontal" className="absolute inset-x-2 top-2 z-20" … />
 *
 * Selection is single (one active sub at a time) and toggle-off (re-clicking
 * the active sub emits `null`). Pinned subs are promoted into the rail so they
 * are reachable without opening their macro first.
 *
 * Controlled component: `selectedSubId` and `pinnedSubIds` are owned by the
 * host. Labels arrive already translated (i18n is the consumer's job).
 *
 * Search — first item of the rail. Mutually exclusive with the macro chip row:
 * opening the search panel closes any open macro and vice versa. Google Places
 * autocomplete is driven internally via `usePlaceAutocomplete` with the
 * `enriched` fetcher: a single Places call returns coords + rating + photos +
 * hours, so the host can hand the result straight to `PlaceHoverCard` via
 * `initialPlace` and skip the card's lazy fetch.
 */

import { forwardRef, useEffect, useRef, useState } from "react";
import {
  IconAdjustmentsHorizontal,
  IconMapPin,
  IconPin,
  IconPinnedFilled,
  IconSearch,
  IconX,
  type Icon,
} from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { usePlaceAutocomplete } from "@/lib/hooks/usePlaceAutocomplete";
import { api } from "@/lib/client";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";

export type ExploreToolbarOrientation = "vertical" | "horizontal";

export type ExploreSubcategory = {
  id: string;
  label: string;
  icon: Icon;
};

export type ExploreMacroCategory = {
  id: string;
  label: string;
  icon: Icon;
  subs: ExploreSubcategory[];
};

export type ExploreToolbarSelectionMode = "single" | "multiple";

export type ExploreToolbarProps = {
  categories: ExploreMacroCategory[];
  /** Currently selected sub-category ids. */
  selectedSubIds: string[];
  /** Emitted with the next selection whenever a sub is toggled. */
  onSelectionChange: (subIds: string[]) => void;
  /**
   * "multiple" (default) lets several subs be active at once; "single" keeps
   * at most one (selecting another replaces it). Both toggle off on re-click.
   */
  selectionMode?: ExploreToolbarSelectionMode;
  /** Sub-category ids pinned into the rail. */
  pinnedSubIds: string[];
  onTogglePin: (subId: string) => void;
  /** Show the settings gear in the rail. Default false. */
  showSettings?: boolean;
  /** Optional — behaviour TBD; the gear is a placeholder for now. */
  onSettingsClick?: () => void;
  /**
   * Emitted when the user picks a suggestion from the Places autocomplete
   * dropdown (either click or Enter). The toolbar has already fetched the
   * enriched place (coords + rating + photos + hours), so the host can hand
   * this object straight to `PlaceHoverCard` via `initialPlace`.
   */
  onSelectPlace?: (place: PlaceEnriched) => void;
  /** Placeholder for the search input. Defaults to "Search places…". */
  searchPlaceholder?: string;
  /** Rail direction. The host flips this on its breakpoint. Default vertical. */
  orientation?: ExploreToolbarOrientation;
  className?: string;
};

// Open-panel state. Mutual exclusion is encoded in the type: only one variant
// can be active. Switching from one to the other replaces the previous.
type OpenPanel = { kind: "macro"; id: string } | { kind: "search" } | null;

export function ExploreToolbar({
  categories,
  selectedSubIds,
  onSelectionChange,
  selectionMode = "multiple",
  pinnedSubIds,
  onTogglePin,
  showSettings = false,
  onSettingsClick,
  onSelectPlace,
  searchPlaceholder,
  orientation = "vertical",
  className,
}: ExploreToolbarProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  // Google Places autocomplete — fully owned by the hook, like AddressField.
  // We swap the default `details` fetcher for `enriched`: one call now returns
  // everything `PlaceHoverCard` needs (coords + rating + photos + hours), so
  // the host can render the card without a second round-trip.
  const {
    inputText,
    suggestions,
    isOpen: isSuggestionsOpen,
    setIsOpen: setSuggestionsOpen,
    activeIndex,
    setActiveIndex,
    handleInputChange,
    selectSuggestion,
    handleKeyDown,
  } = usePlaceAutocomplete<PlaceEnriched>({
    detailFetcher: (id) => api.places.enriched<PlaceEnriched>(id),
  });

  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Click outside the search wrapper closes ONLY the suggestions dropdown.
  // The search panel itself has its own open/close lifecycle (the rail button).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setSuggestionsOpen]);

  const isVertical = orientation === "vertical";
  // Horizontal: the open chip row sits directly below the macro bar, so put
  // tooltips above it to avoid overlapping the chips.
  const tooltipSide = isVertical ? "left" : "top";
  const openMacroId = openPanel?.kind === "macro" ? openPanel.id : null;
  const openMacro = categories.find((m) => m.id === openMacroId) ?? null;
  const isSearchOpen = openPanel?.kind === "search";
  const hasQuery = inputText.trim().length > 0;
  const pinned = resolvePinned(categories, pinnedSubIds);

  // When the search panel closes (a macro is opened, or search rail toggled
  // off), also close the suggestions dropdown so it doesn't linger.
  useEffect(() => {
    if (!isSearchOpen) setSuggestionsOpen(false);
  }, [isSearchOpen, setSuggestionsOpen]);

  const handlePlacePicked = (place: PlaceEnriched) => {
    onSelectPlace?.(place);
    // Keep the search panel open so the user can refine the query or pick
    // another place without re-opening it. We only close the suggestions
    // dropdown — the hook already did that via `setIsOpen(false)`.
  };

  function toggle(subId: string) {
    const isSelected = selectedSubIds.includes(subId);
    if (selectionMode === "single") {
      onSelectionChange(isSelected ? [] : [subId]);
      return;
    }
    onSelectionChange(
      isSelected ? selectedSubIds.filter((id) => id !== subId) : [...selectedSubIds, subId],
    );
  }

  function macroHasSelection(macro: ExploreMacroCategory) {
    return macro.subs.some((s) => selectedSubIds.includes(s.id));
  }

  // Search panel — same pill shell as chipRow (40px total: p-1.5 + 28px input
  // row, matching the chips that render py-1.5 + text-mini at ~28px). Width is
  // 280px in vertical (panel-specific, not a token); full width in horizontal
  // to mirror the chip row layout below the rail. Wrapped in a `relative` div
  // so the suggestions dropdown can be positioned absolutely under the pill.
  const searchPanel = isSearchOpen && (
    <div
      ref={searchWrapperRef}
      className={cn("relative", isVertical ? "w-[280px]" : "w-full max-w-full")}
    >
      <div className="flex items-center gap-1 rounded-pill border border-border-strong bg-surface p-1.5 shadow-float">
        <span className="inline-flex h-7 flex-shrink-0 items-center justify-center pl-2 text-ink-soft">
          <IconMapPin size={15} stroke={1.75} />
        </span>
        <input
          type="text"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !isSuggestionsOpen) {
              setOpenPanel(null);
              return;
            }
            handleKeyDown(e, handlePlacePicked);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setSuggestionsOpen(true);
          }}
          placeholder={searchPlaceholder ?? "Search places…"}
          aria-label="Search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isSuggestionsOpen}
          aria-controls={isSuggestionsOpen ? "explore-toolbar-suggestions" : undefined}
          autoComplete="off"
          autoFocus
          className="h-7 min-w-0 flex-1 border-0 bg-transparent px-2 text-mini text-ink outline-none placeholder:text-ink-faint"
        />
        {hasQuery && (
          <button
            type="button"
            // Prevent the input from losing focus on mousedown so the input
            // stays focused after clearing (focus is then re-asserted on click).
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              handleInputChange("");
              const input = e.currentTarget.parentElement?.querySelector("input");
              input?.focus();
            }}
            aria-label="Clear search"
            className="inline-flex size-7 flex-shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-soft"
          >
            <IconX size={13} stroke={1.75} />
          </button>
        )}
      </div>

      {isSuggestionsOpen && suggestions.length > 0 && (
        <ul
          id="explore-toolbar-suggestions"
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
                selectSuggestion(s, handlePlacePicked);
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

  const chipRow = openMacro && openMacro.subs.length > 0 && (
    <div
      role="group"
      aria-label={openMacro.label}
      className={cn(
        "flex items-center gap-1 rounded-pill border border-border-strong bg-surface p-1.5 shadow-float",
        !isVertical && "max-w-full overflow-x-auto scrollbar-none",
      )}
    >
      {openMacro.subs.map((sub) => {
        const SubIcon = sub.icon;
        const active = selectedSubIds.includes(sub.id);
        const isPinned = pinnedSubIds.includes(sub.id);
        return (
          <div
            key={sub.id}
            className={cn(
              "group flex flex-shrink-0 items-center rounded-pill transition-colors",
              active ? "bg-primary text-white" : "text-ink-soft hover:bg-surface-soft",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(sub.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap py-1.5 pl-3 text-mini",
                isVertical ? "rounded-l-pill pr-1.5" : "rounded-pill pr-3",
              )}
            >
              <SubIcon size={15} stroke={1.75} />
              {sub.label}
            </button>
            {/* Pinning is a desktop affordance; the toggle is hidden on the
                space-constrained horizontal (mobile) bar. */}
            {isVertical && (
              <button
                type="button"
                onClick={() => onTogglePin(sub.id)}
                aria-pressed={isPinned}
                aria-label={isPinned ? `Unpin ${sub.label}` : `Pin ${sub.label}`}
                className={cn(
                  "inline-flex items-center justify-center rounded-r-pill py-1.5 pl-1 pr-2.5 transition-opacity",
                  isPinned
                    ? "opacity-100"
                    : "opacity-40 group-hover:opacity-100 focus-visible:opacity-100",
                  !active && isPinned && "text-primary",
                )}
              >
                {isPinned ? (
                  <IconPinnedFilled size={13} />
                ) : (
                  <IconPin size={13} stroke={1.75} />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const rail = (
    <div
      role="toolbar"
      aria-orientation={orientation}
      aria-label="Categories"
      className={cn(
        "flex gap-1 rounded-pill border border-border-strong bg-surface p-1.5 shadow-float",
        isVertical ? "flex-col" : "flex-row items-center",
        !isVertical && "max-w-full overflow-x-auto scrollbar-none",
      )}
    >
      {/* Search — first item of the rail. Toggles to search; any open macro
          is replaced (mutual exclusion via the OpenPanel union). */}
      <Tooltip label="Search" side={tooltipSide} disabled={isSearchOpen}>
        <RailButton
          label="Search"
          active={isSearchOpen}
          dot={hasQuery}
          onClick={() =>
            setOpenPanel((prev) => (prev?.kind === "search" ? null : { kind: "search" }))
          }
        >
          <IconSearch size={19} stroke={1.75} />
        </RailButton>
      </Tooltip>

      {categories.map((macro) => {
        const MacroIcon = macro.icon;
        const isOpen = macro.id === openMacroId;
        return (
          <Tooltip key={macro.id} label={macro.label} side={tooltipSide} disabled={isOpen}>
            <RailButton
              label={macro.label}
              active={isOpen}
              dot={macroHasSelection(macro)}
              onClick={() =>
                setOpenPanel((prev) =>
                  prev?.kind === "macro" && prev.id === macro.id
                    ? null
                    : { kind: "macro", id: macro.id },
                )
              }
            >
              <MacroIcon size={19} stroke={1.75} />
            </RailButton>
          </Tooltip>
        );
      })}

      {pinned.length > 0 && (
        <>
          <Divider vertical={isVertical} />
          {pinned.map((sub) => {
            const SubIcon = sub.icon;
            const active = selectedSubIds.includes(sub.id);
            return (
              <Tooltip key={sub.id} label={sub.label} side={tooltipSide}>
                <RailButton
                  label={sub.label}
                  active={active}
                  tone="pinned"
                  onClick={() => toggle(sub.id)}
                >
                  <SubIcon size={18} stroke={1.75} />
                </RailButton>
              </Tooltip>
            );
          })}
        </>
      )}

      {/* Vertical: a divider stacks settings under the rail. Horizontal:
          settings is pushed to the right edge with ml-auto. */}
      {showSettings && (
        <>
          {isVertical && <Divider vertical />}
          <Tooltip label="Settings" side={tooltipSide}>
            <RailButton
              label="Settings"
              onClick={onSettingsClick}
              className={cn(!isVertical && "ml-auto")}
            >
              <IconAdjustmentsHorizontal size={18} stroke={1.75} />
            </RailButton>
          </Tooltip>
        </>
      )}
    </div>
  );

  // Vertical: search/chip panel to the left of the rail. Horizontal: rail on
  // top, panel stacked below. Mutual exclusion guarantees only one of
  // `searchPanel` / `chipRow` is truthy at any time.
  return (
    <div
      className={cn(
        "flex",
        isVertical ? "items-start gap-2" : "flex-col items-stretch gap-1",
        className,
      )}
    >
      {isVertical ? (
        <>
          {searchPanel}
          {chipRow}
          {rail}
        </>
      ) : (
        <>
          {rail}
          {searchPanel}
          {chipRow}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

type RailButtonProps = {
  label: string;
  active?: boolean;
  dot?: boolean;
  tone?: "macro" | "pinned";
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<"button">, "onClick" | "className" | "children">;

// forwardRef + spread of extra props so <Tooltip> can clone it (inject ref +
// hover/focus handlers).
const RailButton = forwardRef<HTMLButtonElement, RailButtonProps>(function RailButton(
  { label, active = false, dot = false, tone = "macro", onClick, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative inline-flex size-9 flex-shrink-0 items-center justify-center rounded-full transition-colors",
        active && tone === "pinned" && "bg-primary text-white",
        active && tone === "macro" && "bg-ink text-white",
        !active && "text-ink-soft hover:bg-surface-soft",
        className,
      )}
      {...rest}
    >
      {children}
      {dot && (
        <span
          className={cn(
            "absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary ring-2",
            active ? "ring-ink" : "ring-surface",
          )}
        />
      )}
    </button>
  );
});

function Divider({ vertical }: { vertical: boolean }) {
  return (
    <span
      className={cn(
        "flex-shrink-0 bg-border",
        vertical ? "mx-2 my-0.5 h-px" : "my-1 mx-0.5 w-px self-stretch",
      )}
    />
  );
}

function resolvePinned(
  categories: ExploreMacroCategory[],
  pinnedSubIds: string[],
): ExploreSubcategory[] {
  const byId = new Map<string, ExploreSubcategory>();
  for (const macro of categories) {
    for (const sub of macro.subs) byId.set(sub.id, sub);
  }
  return pinnedSubIds
    .map((id) => byId.get(id))
    .filter((s): s is ExploreSubcategory => Boolean(s));
}
