"use client";

/**
 * FilterPill · TravelGo filter/toggle pill
 *
 * Piccola primitiva per chip/filtri attivabili (es. admin filters, tag selector).
 * Allineata al sistema Button — stesso pattern CVA, rounded-pill, tones semantici.
 *
 * Sizes:
 *   sm → h-6  px-2.5 text-tiny  (11px)
 *   md → h-7  px-3   text-mini  (12px) — default
 *   lg → h-8  px-3.5 text-meta  (13px)
 *
 * Tones:
 *   neutral → ink quando attivo, ink-soft quando inattivo (default)
 *   danger / warning / success → versioni semantiche
 *
 * Usage:
 *   <FilterPill active={selected} onClick={...}>All</FilterPill>
 *   <FilterPill active={s === filter} tone="danger" onClick={...}>
 *     <Icon /> {label}
 *     {count > 0 && <span className="...">{count}</span>}
 *   </FilterPill>
 */

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const filterPillVariants = cva(
  [
    "inline-flex items-center gap-1 select-none cursor-pointer",
    "rounded-pill border transition-colors font-sans",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:opacity-45 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      size: {
        sm: "h-6 px-2.5 text-tiny",
        md: "h-7 px-3 text-mini",
        lg: "h-8 px-3.5 text-meta",
      },
      tone: {
        neutral: "",
        danger: "",
        warning: "",
        success: "",
      },
      active: {
        true: "font-medium",
        false: "bg-transparent",
      },
    },
    compoundVariants: [
      /* ── Active states ── */
      {
        active: true,
        tone: "neutral",
        class: "bg-ink text-white border-ink focus-visible:outline-ink",
      },
      {
        active: true,
        tone: "danger",
        class:
          "bg-danger-deep text-white border-danger-deep focus-visible:outline-danger-deep",
      },
      {
        active: true,
        tone: "warning",
        class:
          "bg-warning-deep text-white border-warning-deep focus-visible:outline-warning-deep",
      },
      {
        active: true,
        tone: "success",
        class:
          "bg-success-fg text-white border-success-fg focus-visible:outline-success-fg",
      },

      /* ── Inactive states ── */
      {
        active: false,
        tone: "neutral",
        class:
          "border-border text-ink-soft hover:border-border-strong hover:text-ink focus-visible:outline-ink",
      },
      {
        active: false,
        tone: "danger",
        class:
          "border-danger-border text-danger-fg hover:bg-danger-bg focus-visible:outline-danger-fg",
      },
      {
        active: false,
        tone: "warning",
        class:
          "border-warning-border text-warning-fg hover:bg-warning-bg focus-visible:outline-warning-fg",
      },
      {
        active: false,
        tone: "success",
        class:
          "border-success-border text-success-fg hover:bg-success-bg focus-visible:outline-success-fg",
      },
    ],
    defaultVariants: {
      size: "md",
      tone: "neutral",
      active: false,
    },
  },
);

type FilterPillVariants = VariantProps<typeof filterPillVariants>;

export type FilterPillProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled"
> &
  FilterPillVariants & {
    disabled?: boolean;
  };

export const FilterPill = forwardRef<HTMLButtonElement, FilterPillProps>(
  ({ className, size, tone, active, disabled, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(filterPillVariants({ size, tone, active }), className)}
        disabled={disabled}
        aria-pressed={active || undefined}
        {...props}
      />
    );
  },
);
FilterPill.displayName = "FilterPill";
