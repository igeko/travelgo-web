"use client";

/**
 * TabSwitcher · Generic tab/view switcher component
 *
 * Renders a pill-shaped toggle between multiple options.
 * Aligns with Button system: same sizes (sm/md/lg), variant, tone.
 * Used for switching between different views (e.g., List, Timeline, Story).
 *
 * @example
 * ```tsx
 * const [view, setView] = useState("timeline");
 * <TabSwitcher
 *   value={view}
 *   onChange={setView}
 *   tabs={[
 *     { key: "lista", label: "Lista" },
 *     { key: "timeline", label: "Timeline" },
 *     { key: "racconto", label: "Racconto" },
 *   ]}
 *   size="md"
 *   variant="outline"
 *   tone="neutral"
 * />
 * ```
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   TabSwitcher pill container and button styles
   Aligns with Button system: rounded-pill, border, font-medium, sizes
───────────────────────────────────────────────────────────────── */

const containerVariants = cva(
  // Base container
  [
    "inline-flex items-center select-none",
    "rounded-pill border transition-[background,color,border-color] duration-150",
    "gap-[2px] p-[3px]",
  ],
  {
    variants: {
      size: {
        sm: "text-[11px]",
        md: "text-xs",
        lg: "text-[13px]",
      },
      variant: {
        outline: "bg-surface border-border-strong",
        solid: "border-transparent",
        ghost: "bg-transparent border-transparent",
      },
      tone: {
        neutral: "",
        danger: "",
        warning: "",
        success: "",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "outline",
      tone: "neutral",
    },
  }
);

const buttonVariants = cva(
  // Base button inside container
  [
    "inline-flex items-center justify-center font-medium select-none",
    "rounded-pill border transition-[background,color,border-color] duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
  ],
  {
    variants: {
      size: {
        sm: "h-6 px-2.5 text-[11px]",
        md: "h-8 px-3.5 text-xs",
        lg: "h-10 px-4.5 text-[13px]",
      },
      isActive: {
        true: "",
        false: "",
      },
      tone: {
        neutral: "",
        danger: "",
        warning: "",
        success: "",
      },
    },
    compoundVariants: [
      // Active state (solid style)
      {
        isActive: true,
        tone: "neutral",
        class: "bg-ink text-white border-ink shadow-sm",
      },
      {
        isActive: true,
        tone: "danger",
        class: "bg-[#a32d2d] text-white border-[#a32d2d] shadow-sm",
      },
      {
        isActive: true,
        tone: "warning",
        class: "bg-[#e0a818] text-white border-[#e0a818] shadow-sm",
      },
      {
        isActive: true,
        tone: "success",
        class: "bg-[#3d6e0e] text-white border-[#3d6e0e] shadow-sm",
      },
      // Inactive state (ghost style with neutral tone)
      {
        isActive: false,
        tone: "neutral",
        class:
          "bg-transparent text-ink border-transparent hover:bg-surface-soft focus-visible:outline-ink",
      },
      {
        isActive: false,
        tone: "danger",
        class:
          "bg-transparent text-[#a32d2d] border-transparent hover:bg-[#fcebeb] focus-visible:outline-[#a32d2d]",
      },
      {
        isActive: false,
        tone: "warning",
        class:
          "bg-transparent text-[#a37809] border-transparent hover:bg-[#fef5cf] focus-visible:outline-[#a37809]",
      },
      {
        isActive: false,
        tone: "success",
        class:
          "bg-transparent text-[#3d6e0e] border-transparent hover:bg-status-paid-bg focus-visible:outline-[#3d6e0e]",
      },
    ],
    defaultVariants: {
      size: "md",
      isActive: false,
      tone: "neutral",
    },
  }
);

export interface TabConfig {
  key: string;
  label: string;
}

export interface TabSwitcherProps<T extends string = string>
  extends VariantProps<typeof containerVariants> {
  /** Currently selected tab key */
  value: T;
  /** Callback when tab changes */
  onChange: (key: T) => void;
  /** Array of tab configurations */
  tabs: TabConfig[];
  /** Optional CSS class for the container */
  className?: string;
}

export function TabSwitcher<T extends string = string>({
  value,
  onChange,
  tabs,
  className,
  size = "md",
  variant = "outline",
  tone = "neutral",
}: TabSwitcherProps<T>) {
  return (
    <div
      className={cn(
        containerVariants({ size, variant, tone }),
        className
      )}
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key as T)}
          className={buttonVariants({
            size,
            isActive: value === key,
            tone,
          })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
