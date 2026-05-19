import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   Button · TravelGo button system
   Reproduces the original design system's .btn-icon with orthogonal
   variants: size × variant × tone × iconOnly.
   Icons go as children: <Button><IconSave /> Save</Button>.
   The direct SVG child auto-scales with the button's font-size.
───────────────────────────────────────────────────────────────── */

export const buttonVariants = cva(
  // Base · styles shared across ALL combinations
  [
    "inline-flex items-center justify-center gap-1.5 font-medium font-sans select-none",
    "rounded-pill border transition-[background,color,border-color,transform] duration-150",
    "active:scale-[0.96]",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100",
    // SVG figlio diretto scala con font-size
    "[&>svg]:size-[1em] [&>svg]:shrink-0",
  ],
  {
    variants: {
      /* ── Size (icon-only by default) ── */ // unchanged
      size: {
        sm: "w-6 h-6 text-tiny",
        md: "w-8 h-8 text-sm",
        lg: "w-10 h-10 text-base",
      },
      /* ── Visual variant ── */
      variant: {
        outline: "bg-surface border-border-strong",
        solid: "border-transparent",
        ghost: "bg-transparent border-transparent",
        "over-media": [
          "bg-white/[0.18] border-white/40 text-white",
          "backdrop-blur-[6px]",
          "hover:bg-white/30 hover:border-white/60",
          "focus-visible:outline-white",
        ],
        "text-only": "bg-surface border-border-strong",
      },
      /* ── Semantic tone ── */
      tone: {
        neutral: "",
        danger: "",
        warning: "",
        success: "",
      },
      /* ── Shape: icon-only (square) vs with label (auto-width) ── */
      iconOnly: {
        true: "",
        false: "w-auto",
      },
      disabled: {
        true: "",
        false: "",
      },
    },

    /* ── size × iconOnly combinations ── */
    compoundVariants: [
      // SIZES with LABEL — auto width + horizontal padding
      { size: "sm", iconOnly: false, class: "h-6 px-2.5 gap-1 text-tiny" },
      { size: "md", iconOnly: false, class: "h-8 px-3.5 gap-1.5 text-xs" },
      { size: "lg", iconOnly: false, class: "h-10 px-4.5 gap-2 text-meta" },

      /* ── Variant: outline · tone neutral (default) ── */
      {
        variant: "outline",
        tone: "neutral",
        class:
          "text-ink hover:bg-ink hover:border-ink hover:text-white focus-visible:outline-ink",
      },
      {
        variant: "outline",
        tone: "danger",
        class:
          "text-danger-fg border-danger-border hover:bg-danger-fg hover:border-danger-fg hover:text-white focus-visible:outline-danger-fg",
      },
      {
        variant: "outline",
        tone: "warning",
        class:
          "text-warning-fg border-warning-border hover:bg-warning-deep hover:border-warning-deep hover:text-white focus-visible:outline-warning-deep",
      },
      {
        variant: "outline",
        tone: "success",
        class:
          "text-success-fg border-success-border hover:bg-success-fg hover:border-success-fg hover:text-white focus-visible:outline-success-fg",
      },

      /* ── Variant: solid (filled, hover inverts) ── */
      {
        variant: "solid",
        tone: "neutral",
        class:
          "bg-ink text-white border-ink hover:bg-surface hover:text-ink hover:border-ink focus-visible:outline-ink",
      },
      {
        variant: "solid",
        tone: "danger",
        class:
          "bg-danger-deep text-white border-danger-deep hover:bg-surface hover:text-danger-deep hover:border-danger-deep focus-visible:outline-danger-deep",
      },
      {
        variant: "solid",
        tone: "warning",
        class:
          "bg-warning-deep text-white border-warning-deep hover:bg-surface hover:text-warning-fg hover:border-warning-deep focus-visible:outline-warning-deep",
      },
      {
        variant: "solid",
        tone: "success",
        class:
          "bg-success-fg text-white border-success-fg hover:bg-surface hover:text-success-fg hover:border-success-fg focus-visible:outline-success-fg",
      },

      /* ── Variant: ghost (transparent, hover surface-soft) ── */
      {
        variant: "ghost",
        tone: "neutral",
        class:
          "text-ink hover:bg-surface-soft focus-visible:outline-ink",
      },
      {
        variant: "ghost",
        tone: "danger",
        class:
          "text-danger-deep hover:bg-danger-bg focus-visible:outline-danger-deep",
      },
      {
        variant: "ghost",
        tone: "warning",
        class:
          "text-warning-fg hover:bg-warning-bg focus-visible:outline-warning-fg",
      },
      {
        variant: "ghost",
        tone: "success",
        class:
          "text-success-fg hover:bg-success-bg focus-visible:outline-success-fg",
      },

      /* ── Variant: text-only — like outline but spacious padding,
              icon-less by convention (gap 0) ── */
      {
        variant: "text-only",
        tone: "neutral",
        class:
          "text-ink hover:bg-ink hover:border-ink hover:text-white focus-visible:outline-ink gap-0",
      },
      {
        variant: "text-only",
        tone: "danger",
        class:
          "text-danger-fg border-danger-border hover:bg-danger-fg hover:border-danger-fg hover:text-white focus-visible:outline-danger-fg gap-0",
      },
      {
        variant: "text-only",
        tone: "warning",
        class:
          "text-warning-fg border-warning-border hover:bg-warning-deep hover:border-warning-deep hover:text-white focus-visible:outline-warning-deep gap-0",
      },
      {
        variant: "text-only",
        tone: "success",
        class:
          "text-success-fg border-success-border hover:bg-success-fg hover:border-success-fg hover:text-white focus-visible:outline-success-fg gap-0",
      },
      // text-only has wider horizontal padding (from original CSS)
      { variant: "text-only", size: "sm", iconOnly: false, class: "px-3.5" },
      { variant: "text-only", size: "md", iconOnly: false, class: "px-4" },
      { variant: "text-only", size: "lg", iconOnly: false, class: "px-5.5" },

      /* ── Variant: over-media · tone-specific hovers ── */
      {
        variant: "over-media",
        tone: "danger",
        class: "hover:bg-danger-deep/50 hover:border-danger-deep/70",
      },
      {
        variant: "over-media",
        tone: "warning",
        class: "hover:bg-primary/50 hover:border-primary/70",
      },
    ],
    defaultVariants: {
      variant: "outline",
      size: "md",
      tone: "neutral",
      iconOnly: false,
    },
  },
);

/* ─────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────── */

type ButtonVariants = VariantProps<typeof buttonVariants>;

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled"
> &
  ButtonVariants & {
    /**
     * If true, Button forwards its classes/props to its child instead of
     * rendering a <button>. Use it to turn it into an <a> or <Link>:
     *   <Button asChild><Link href="/">Go</Link></Button>
     */
    asChild?: boolean;
    disabled?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      size,
      variant,
      tone,
      iconOnly,
      asChild = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ size, variant, tone, iconOnly }),
          className,
        )}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
