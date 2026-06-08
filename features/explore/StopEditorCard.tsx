/**
 * features/explore/StopEditorCard.tsx
 * ─────────────────────────────────────────────────────────────────
 * The white editor card revealed when a stop row is opened. Shared
 * chrome for ActivityStop (Open) and FuzzyStop (Open): a title row
 * (plain icon + name + close ✕), a stack of body sections, and an
 * optional centred Remove affordance.
 *
 * The body sections are passed as children; the card only owns the
 * outer surface, the header and the Remove button so the two stop
 * types stay visually identical where they overlap.
 *
 * Atomic level: organism (chrome) — composes StopIconBadge + Button.
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType, ReactNode } from "react";
import { IconX, IconUnlink, IconArrowUp, IconArrowDown } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export function StopEditorCard({
  icon: Icon,
  title,
  onClose,
  onRemove,
  removeLabel = "Remove",
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  children,
  className,
}: {
  icon: IconCmp;
  title: string;
  onClose?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  /** Move the stop one slot up (intra- or cross-day on border). Hidden when not set. */
  onMoveUp?: () => void;
  /** Move the stop one slot down (intra- or cross-day on border). Hidden when not set. */
  onMoveDown?: () => void;
  /** Whether the Move Up button is enabled (false → grey-out, no-op on click). */
  canMoveUp?: boolean;
  /** Whether the Move Down button is enabled. */
  canMoveDown?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 rounded-sm bg-surface px-4 pt-4 pb-2",
        className,
      )}
    >
      {/* Title row */}
      <header className="flex w-full items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon size={22} className="shrink-0 text-ink" />
          <p className="truncate text-[16px] font-semibold text-ink">{title}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          onClick={onClose}
          aria-label="Close"
          className="shrink-0"
        >
          <IconX />
        </Button>
      </header>

      {children}

      {(onRemove || onMoveUp || onMoveDown) ? (
        <div className="flex w-full items-center justify-between gap-2 py-2">
          {/* Left: destructive action (Remove). Spacer when not present so
              the move buttons stay anchored to the right. */}
          <div className="flex items-center">
            {onRemove ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onRemove}
                className="border-primary-border text-primary-deep hover:border-primary hover:bg-primary hover:text-white"
              >
                <IconUnlink />
                {removeLabel}
              </Button>
            ) : null}
          </div>
          {/* Right: reorder actions. Hidden as a pair when neither is wired. */}
          {(onMoveUp || onMoveDown) ? (
            <div className="flex items-center gap-1">
              {onMoveUp ? (
                <Button
                  size="sm"
                  variant="outline"
                  iconOnly
                  disabled={!canMoveUp}
                  onClick={onMoveUp}
                  aria-label="Move up"
                >
                  <IconArrowUp />
                </Button>
              ) : null}
              {onMoveDown ? (
                <Button
                  size="sm"
                  variant="outline"
                  iconOnly
                  disabled={!canMoveDown}
                  onClick={onMoveDown}
                  aria-label="Move down"
                >
                  <IconArrowDown />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
