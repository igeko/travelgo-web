/**
 * features/explore/AddressRow.tsx
 * ─────────────────────────────────────────────────────────────────
 * The underlined "Address" line inside a stop editor card. Pure
 * presentational — a map-pin glyph + the address (or a placeholder).
 * The redesign mocks this as a static line; wiring to AddressField
 * (Google Places) happens when the card is connected to real data.
 *
 * Atomic level: molecule.
 * ─────────────────────────────────────────────────────────────────
 */

import { IconMapPin } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function AddressRow({
  value,
  placeholder = "Address",
  className,
}: {
  value?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 border-b border-ink py-1.5",
        className,
      )}
    >
      <IconMapPin size={16} className="shrink-0 text-ink" />
      <span className={cn("min-w-0 flex-1 truncate text-mini", value ? "text-ink" : "text-ink-soft")}>
        {value ?? placeholder}
      </span>
    </div>
  );
}
