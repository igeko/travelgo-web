"use client";

import { Children, cloneElement, forwardRef, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   SoftField · soft "pill" text input / textarea
   Reproduces the `.soft` and `.addr-row` patterns from the design.

   Usage:
     <SoftField value={x} onChange={setX} label="Address">
       <SoftField.Prefix><IconMapPin /></SoftField.Prefix>
       <SoftField.Suffix><Button>map</Button></SoftField.Suffix>
     </SoftField>

   - Single-line by default, multiline=true switches to textarea.
   - Optional floating label that appears on focus.
   - Optional <SoftField.Prefix> (left) and <SoftField.Suffix> (right) slots.
   - Auto-counter when maxLength is set.
   Controlled-only: parent owns `value` + `onChange`.
───────────────────────────────────────────────────────────────── */

type CommonProps = {
  value: string;
  onChange: (value: string) => void;
  /**
   * Visual style.
   * - "pill" (default): soft pill with bg/border/radius and focus ring.
   * - "inline": "passport row" — no chrome, inline value, caret + orange label
   *   as the only activity signals. Variants A–D are driven by `icon`/`label`
   *   presence (A icon+label · B icon only · C label only · D bare).
   */
  variant?: "pill" | "inline";
  /**
   * Leading icon (rendered at 14px). Inline variant only — its presence,
   * together with `label`, selects the A/B/C/D layout variant.
   */
  icon?: ReactNode;
  /** Floating label (pill) / eyebrow label (inline) that marks the field */
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Error state — tints the value primary-deep (inline variant). */
  error?: boolean;
  /**
   * Micro message rendered below the row (inline variant). Italic primary-deep,
   * may contain inline links (ReactNode).
   */
  errorMessage?: ReactNode;
  /** Commit the value: fired on Enter (single-line) and on blur. */
  onCommit?: (value: string) => void;
  /** Cancel/restore: fired on Escape. */
  onCancel?: () => void;
  /** Maximum length. When set, the character counter is shown below. */
  maxLength?: number;
  /** Hide the counter even when maxLength is set */
  hideCounter?: boolean;
  /** When true the floating label is always visible (not just on hover/focus) */
  labelAlwaysVisible?: boolean;
  /** Visual size of the pill. Default "md". */
  size?: "sm" | "md";
  /** Drop the pill chrome (bg/border/radius/padding) — for embedding inside another container. */
  bare?: boolean;
  /** Slots: <SoftField.Prefix /> and/or <SoftField.Suffix /> */
  children?: ReactNode;
  /** Extra classes on the outer pill wrapper */
  className?: string;
  /** Forwarded to the native element */
  autoComplete?: string;
  name?: string;
  id?: string;
  /**
   * Escape hatch: extra props forwarded directly to the underlying
   * <input> or <textarea>. Useful for aria-* attributes, role,
   * onKeyDown, etc. without polluting the top-level API.
   */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>;
};

type SingleLineProps = CommonProps & {
  multiline?: false;
  /** HTML input type (default "text") */
  type?: "text" | "email" | "url" | "tel" | "search";
  rows?: never;
};

type MultilineProps = CommonProps & {
  multiline: true;
  /** Default visible rows for the textarea */
  rows?: number;
  type?: never;
};

export type SoftFieldProps = SingleLineProps | MultilineProps;

/* ─────────────────────────────────────────────────────────────────
   Slot sub-components
   We identify them by displayName so children parsing is explicit
   (Radix/shadcn pattern).
───────────────────────────────────────────────────────────────── */

/**
 * Walk through the slot's children. Any direct child that is a <Button>
 * (identified by displayName) gets `size="sm"` injected — unless the
 * consumer has already passed an explicit size, in which case theirs wins.
 *
 * Rationale: SoftField is a "soft pill" with a fixed height; a sm Button
 * (h-6, 24px) is the only size that fits nicely. We make this the default
 * so consumers can write <Button variant="outline">map</Button> without
 * thinking about it.
 */
function autoSizeButtons(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const type = child.type as { displayName?: string };
    if (type?.displayName !== "Button") return child;

    const props = child.props as { size?: string };
    if (props.size !== undefined) return child; // consumer override wins

    return cloneElement(child as ReactElement<{ size?: string }>, {
      size: "sm",
    });
  });
}

function Prefix({ children }: { children: ReactNode }) {
  // Default size + color applied to any direct SVG child.
  // Consumer can override by passing explicit className/size on the icon.
  // When the parent wrapper is multiline (data-multiline="true"), nudge the
  // slot slightly down so it sits with the first line of the textarea.
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center text-ink-faint",
        "[&>svg]:size-3.5 group-data-[size=sm]/sf:[&>svg]:size-3",
        "group-data-[multiline=true]/sf:self-start group-data-[multiline=true]/sf:mt-1.5",
      )}
    >
      {autoSizeButtons(children)}
    </span>
  );
}
Prefix.displayName = "SoftField.Prefix";

function Suffix({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center",
        "group-data-[multiline=true]/sf:self-start group-data-[multiline=true]/sf:mt-1",
      )}
    >
      {autoSizeButtons(children)}
    </span>
  );
}
Suffix.displayName = "SoftField.Suffix";

/* ─────────────────────────────────────────────────────────────────
   Children parser · separate Prefix / Suffix from anything else.
   We ignore anything that isn't a Prefix or Suffix (no "rest" slot).
───────────────────────────────────────────────────────────────── */

function extractSlots(children: ReactNode): {
  prefix: ReactNode | null;
  suffix: ReactNode | null;
} {
  let prefix: ReactNode | null = null;
  let suffix: ReactNode | null = null;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const name = (child.type as { displayName?: string })?.displayName;
    if (name === "SoftField.Prefix") prefix = child;
    else if (name === "SoftField.Suffix") suffix = child;
  });

  return { prefix, suffix };
}

/* ─────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────── */

const SoftFieldBase = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  SoftFieldProps
>(function SoftField(props, ref) {
  const {
    value,
    onChange,
    variant = "pill",
    icon,
    label,
    placeholder,
    disabled,
    error,
    errorMessage,
    onCommit,
    onCancel,
    maxLength,
    hideCounter,
    labelAlwaysVisible,
    size = "md",
    bare = false,
    children,
    className,
    autoComplete,
    name,
    id,
    inputProps,
  } = props;

  const multiline = "multiline" in props && props.multiline === true;
  const inline = variant === "inline";
  const small = size === "sm";
  const { prefix, suffix } = extractSlots(children);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement & HTMLTextAreaElement>,
  ) => {
    inputProps?.onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter" && !multiline) onCommit?.(value);
    else if (e.key === "Escape") onCancel?.();
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement>,
  ) => {
    inputProps?.onBlur?.(e);
    if (!e.defaultPrevented) onCommit?.(value);
  };

  const sharedInputClasses = cn(
    "block w-full min-w-0 bg-transparent border-0 outline-0 shadow-none p-0 m-0 appearance-none",
    "font-sans leading-[1.45] font-normal text-ink",
    "disabled:cursor-not-allowed",
    inline
      ? cn(
          "flex-1 font-medium text-[12.5px] caret-primary",
          "placeholder:text-ink-faint placeholder:italic placeholder:font-normal",
          error && "text-primary-deep",
        )
      : cn(small ? "text-[13px]" : "text-[15px]", "placeholder:text-ink-faint"),
  );

  return (
    <div className={cn("w-full", className)}>
      <div
        data-multiline={multiline ? "true" : "false"}
        data-size={size}
        data-variant={variant}
        className={cn(
          // Named `group/sf` so Prefix/Suffix and inline icon/label can react to
          // focus-within and to the multiline state on this wrapper.
          "group/sf relative flex",
          inline
            ? // Inline "passport row": no chrome, value is inline.
              cn(
                "w-full gap-2.5 py-2",
                multiline ? "items-start" : "items-center",
                disabled ? "opacity-55 cursor-not-allowed" : "cursor-text",
              )
            : cn(
                bare ? "gap-1.5 p-0" : small ? "gap-1 px-3.5 py-1.5" : "gap-1.5 px-[18px] py-[10px]",
                // In sm the auto-sized (h-6) slot buttons are taller than the text
                // line and would stretch the pill — shrink them to match the line.
                small && "[&_button]:h-5 [&_button]:px-2",
                // Slot alignment: top in multiline (next to the first textarea line),
                // centered in single-line.
                multiline ? "items-start" : "items-center",
                // Pill chrome — skipped when bare (the field is embedded in another container).
                !bare && [
                  "bg-surface-input border border-border",
                  // Shape: pill for input, generous radius for textarea
                  multiline ? (small ? "rounded-[16px]" : "rounded-[20px]") : "rounded-pill",
                  // Interaction states
                  "transition-[background,border-color,box-shadow] duration-150",
                  "hover:border-border-strong",
                  "focus-within:border-orange focus-within:bg-surface focus-within:shadow-[0_0_0_3px_rgba(244,123,58,0.12)]",
                ],
                disabled && "opacity-50 pointer-events-none",
              ),
        )}
      >
        {/* Pill: floating ghost label (visible on hover/focus, or always when labelAlwaysVisible) */}
        {!inline && label && (
          <span
            className={cn(
              "absolute -top-2 left-4 px-1.5 bg-surface",
              "text-[9px] uppercase tracking-[0.08em] text-ink-faint font-medium",
              "pointer-events-none transition-opacity",
              labelAlwaysVisible
                ? "opacity-100"
                : "opacity-0 group-hover/sf:opacity-100 group-focus-within/sf:opacity-100",
            )}
          >
            {label}
          </span>
        )}

        {/* Inline: leading icon — faint when empty, primary when filled or focused */}
        {inline && icon && (
          <span
            className={cn(
              "shrink-0 inline-flex items-center transition-colors",
              "[&>svg]:size-3.5 [&>svg]:[stroke-width:1.75]",
              value ? "text-primary" : "text-ink-faint",
              "group-focus-within/sf:text-primary",
              multiline && "self-start mt-0.5",
            )}
          >
            {icon}
          </span>
        )}

        {/* Inline: eyebrow label — turns primary on focus */}
        {inline && label && (
          <span
            className={cn(
              "shrink-0 w-[50px] leading-tight transition-colors",
              "text-micro uppercase tracking-eyebrow font-medium",
              "text-ink-faint group-focus-within/sf:text-primary",
              multiline && "self-start mt-0.5",
            )}
          >
            {label}
          </span>
        )}

        {/* Pill: prefix slot */}
        {!inline && prefix}

        {/* Input or textarea */}
        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            rows={(props as MultilineProps).rows}
            autoComplete={autoComplete}
            name={name}
            id={id}
            {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(sharedInputClasses, "resize-y", small ? "min-h-[40px]" : "min-h-[54px]")}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={(props as SingleLineProps).type ?? "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            autoComplete={autoComplete}
            name={name}
            id={id}
            {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(sharedInputClasses, (inputProps as React.InputHTMLAttributes<HTMLInputElement>)?.className)}
          />
        )}

        {/* Suffix slot */}
        {suffix}
      </div>

      {/* Inline: micro error message below the row */}
      {inline && errorMessage && (
        <p className="mt-1 pl-6 text-tiny italic text-primary-deep">{errorMessage}</p>
      )}

      {/* Counter (auto, only when maxLength is set) */}
      {maxLength && !hideCounter && (
        <div className="text-right mt-1 text-micro text-ink-faint opacity-60 tabular-nums">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
});

/* Attach slot sub-components for the dot notation API */
export const SoftField = Object.assign(SoftFieldBase, {
  Prefix,
  Suffix,
});
