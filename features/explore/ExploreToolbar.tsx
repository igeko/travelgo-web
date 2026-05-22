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
 */

import { useState } from "react";
import {
  IconAdjustmentsHorizontal,
  IconPin,
  IconPinnedFilled,
  type Icon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

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
  /** Rail direction. The host flips this on its breakpoint. Default vertical. */
  orientation?: ExploreToolbarOrientation;
  className?: string;
};

export function ExploreToolbar({
  categories,
  selectedSubIds,
  onSelectionChange,
  selectionMode = "multiple",
  pinnedSubIds,
  onTogglePin,
  showSettings = false,
  onSettingsClick,
  orientation = "vertical",
  className,
}: ExploreToolbarProps) {
  const [openMacroId, setOpenMacroId] = useState<string | null>(null);

  const isVertical = orientation === "vertical";
  const openMacro = categories.find((m) => m.id === openMacroId) ?? null;
  const pinned = resolvePinned(categories, pinnedSubIds);

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

  const chipRow = openMacro && openMacro.subs.length > 0 && (
    <div
      role="group"
      aria-label={openMacro.label}
      className={cn(
        "flex items-center gap-1 rounded-pill border border-border bg-surface p-1.5",
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
        "flex gap-1 rounded-pill border border-border bg-surface p-1.5",
        isVertical ? "flex-col" : "flex-row items-center",
        !isVertical && "max-w-full overflow-x-auto scrollbar-none",
      )}
    >
      {categories.map((macro) => {
        const MacroIcon = macro.icon;
        const isOpen = macro.id === openMacroId;
        return (
          <RailButton
            key={macro.id}
            label={macro.label}
            active={isOpen}
            dot={macroHasSelection(macro)}
            onClick={() => setOpenMacroId(isOpen ? null : macro.id)}
          >
            <MacroIcon size={19} stroke={1.75} />
          </RailButton>
        );
      })}

      {pinned.length > 0 && (
        <>
          <Divider vertical={isVertical} />
          {pinned.map((sub) => {
            const SubIcon = sub.icon;
            const active = selectedSubIds.includes(sub.id);
            return (
              <RailButton
                key={sub.id}
                label={sub.label}
                active={active}
                tone="pinned"
                onClick={() => toggle(sub.id)}
              >
                <SubIcon size={18} stroke={1.75} />
              </RailButton>
            );
          })}
        </>
      )}

      {/* Vertical: a divider stacks settings under the rail. Horizontal:
          settings is pushed to the right edge with ml-auto. */}
      {showSettings && (
        <>
          {isVertical && <Divider vertical />}
          <RailButton
            label="Settings"
            onClick={onSettingsClick}
            className={cn(!isVertical && "ml-auto")}
          >
            <IconAdjustmentsHorizontal size={18} stroke={1.75} />
          </RailButton>
        </>
      )}
    </div>
  );

  // Vertical: chip row to the left of the rail. Horizontal: macro bar on top,
  // chip row stacked below.
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
          {chipRow}
          {rail}
        </>
      ) : (
        <>
          {rail}
          {chipRow}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function RailButton({
  label,
  active = false,
  dot = false,
  tone = "macro",
  onClick,
  className,
  children,
}: {
  label: string;
  active?: boolean;
  dot?: boolean;
  tone?: "macro" | "pinned";
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "relative inline-flex size-9 flex-shrink-0 items-center justify-center rounded-full transition-colors",
        active && tone === "pinned" && "bg-primary text-white",
        active && tone === "macro" && "bg-ink text-white",
        !active && "text-ink-soft hover:bg-surface-soft",
        className,
      )}
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
}

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
