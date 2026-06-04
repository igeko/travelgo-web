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
import { IconX, IconUnlink } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export function StopEditorCard({
  icon: Icon,
  title,
  onClose,
  onRemove,
  removeLabel = "Remove",
  children,
  className,
}: {
  icon: IconCmp;
  title: string;
  onClose?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
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

      {onRemove ? (
        <div className="flex w-full items-center justify-center py-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRemove}
            className="border-primary-border text-primary-deep hover:border-primary hover:bg-primary hover:text-white"
          >
            <IconUnlink />
            {removeLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
