"use client";

/**
 * features/go/PlaceMention.tsx
 * ─────────────────────────────────────────────────────────────────
 * Inline chip for a place/activity Go names in its reply. Go wraps such
 * names in a `[[place:Name]]` macro; RichText turns each into one of these.
 *
 * Clicking the chip asks the host to append a detail card at the bottom of
 * the chat. Hovering (or focusing) just shows a non-interactive hint of what
 * the click does. When no handler is provided (e.g. the float chat) the chip
 * degrades to plain emphasized text — never a raw macro.
 * ─────────────────────────────────────────────────────────────────
 */

import { IconMapPin } from "@/components/ui/icons";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";

export function PlaceMention({ name, onInfo }: { name: string; onInfo?: () => void }) {
  // No action wired (shared with the float chat) → plain emphasized text.
  if (!onInfo) return <span className="font-medium not-italic text-ink">{name}</span>;

  return (
    <span className="group relative inline-block not-italic">
      <button
        type="button"
        onClick={onInfo}
        className="inline-flex items-baseline gap-0.5 font-medium text-primary-deep underline decoration-dotted underline-offset-2 cursor-pointer bg-transparent border-0 p-0 align-baseline"
      >
        <IconMapPin size={12} className="shrink-0 translate-y-0.5" />
        {name}
      </button>

      {/* Hover/focus hint — Go's own voice: avatar + serif italic. Purely
          informative, never intercepts the pointer. */}
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-dropdown
                   inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border border-border
                   bg-surface px-2 py-1 shadow-lg opacity-0 transition-opacity
                   group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <GoAvatar size="xs" pulse={false} />
        <span className="font-serif italic text-meta text-ink">Chiedi info a Go</span>
      </span>
    </span>
  );
}
