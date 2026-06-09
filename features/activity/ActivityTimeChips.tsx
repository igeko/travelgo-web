/**
 * features/activity/ActivityTimeChips.tsx
 * ─────────────────────────────────────────────────────────────────
 * Riga arrivo → partenza nel pannello Activity / Accommodation.
 * Variante B della spec /design/activity-time-display: due chip
 * cliccabili affiancate, freccia separatrice al centro.
 *
 * Le chip sono "trigger" del picker arrivo/partenza. Lo stato del
 * picker aperto è gestito dal parent via `activeField`. Quando i
 * callback `onChipClick` non sono passati le chip restano visive
 * (read-only) — è il caso accommodation in questa iterazione.
 *
 * Atomic level: molecule. Composta da due TimeChip (atomi).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { cn } from "@/lib/cn";
import { IconLogin2, IconLogout2, IconArrowRight } from "@/components/ui/icons";

export type TimeField = "arrival" | "departure";

export type TimeChipData = {
  field: TimeField;
  /** 0–23. */
  hour: number;
  /** 0 | 15 | 30 | 45 — coerente con il picker. */
  minute: number;
  /** Label data compatta, es. "Thu 04 Aug". Vuota → non renderizzata. */
  date?: string;
};

type Props = {
  arrival: TimeChipData;
  departure: TimeChipData;
  /** Chip attualmente aperta — null se nessuna. */
  activeField?: TimeField | null;
  /** Omesso → chip read-only (es. accommodation in questa iterazione). */
  onChipClick?: (field: TimeField) => void;
};

function TimeChip({
  data,
  active,
  onClick,
}: {
  data: TimeChipData;
  active?: boolean;
  onClick?: () => void;
}) {
  const Icon = data.field === "arrival" ? IconLogin2 : IconLogout2;
  const label = data.field === "arrival" ? "Arrivo" : "Partenza";
  const timeStr = `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`;
  const interactive = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
        active
          ? "border-primary bg-primary-soft"
          : "border-transparent bg-surface-soft",
        interactive && !active && "hover:border-primary/40",
        !interactive && "cursor-default",
      )}
    >
      <Icon
        size={14}
        className={cn("shrink-0", active ? "text-primary" : "text-ink-faint")}
        aria-hidden
      />
      <div className="flex min-w-0 flex-col">
        <span className="text-micro tracking-eyebrow uppercase leading-none text-ink-faint">
          {label}
        </span>
        <span
          className={cn(
            "text-[15px] font-semibold leading-none",
            active ? "text-primary" : "text-ink",
          )}
        >
          {timeStr}
        </span>
        {data.date ? (
          <span className="mt-[3px] truncate text-micro leading-none text-ink-soft">
            {data.date}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function ActivityTimeChips({ arrival, departure, activeField, onChipClick }: Props) {
  return (
    <div className="flex items-center gap-2">
      <TimeChip
        data={arrival}
        active={activeField === "arrival"}
        onClick={onChipClick ? () => onChipClick("arrival") : undefined}
      />
      <IconArrowRight size={14} className="shrink-0 text-ink-faint" aria-hidden />
      <TimeChip
        data={departure}
        active={activeField === "departure"}
        onClick={onChipClick ? () => onChipClick("departure") : undefined}
      />
    </div>
  );
}
