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
  /** Floating label that becomes visible on focus */
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Maximum length. When set, the character counter is shown below. */
  maxLength?: number;
  /** Hide the counter even when maxLength is set */
  hideCounter?: boolean;
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
        "[&>svg]:size-3.5",
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
    label,
    placeholder,
    disabled,
    maxLength,
    hideCounter,
    children,
    className,
    autoComplete,
    name,
    id,
    inputProps,
  } = props;

  const multiline = "multiline" in props && props.multiline === true;
  const { prefix, suffix } = extractSlots(children);

  const sharedInputClasses = cn(
    "block w-full bg-transparent border-0 outline-0 shadow-none p-0 m-0 appearance-none",
    "font-sans text-[15px] leading-[1.45] font-normal text-ink",
    "placeholder:text-ink-faint",
    "disabled:cursor-not-allowed",
  );

  return (
    <div className={cn("w-full", className)}>
      <div
        data-multiline={multiline ? "true" : "false"}
        className={cn(
          // Named `group/sf` so Prefix/Suffix can react to focus-within and
          // to the multiline state on this wrapper.
          "group/sf relative flex gap-1.5 px-[18px] py-2",
          // Slot alignment: top in multiline (next to the first textarea line),
          // centered in single-line.
          multiline ? "items-start" : "items-center",
          "bg-[#fafaf6] border border-border",
          // Shape: pill for input, generous radius for textarea
          multiline ? "rounded-[20px]" : "rounded-pill",
          // Interaction states
          "transition-[background,border-color,box-shadow] duration-150",
          "hover:border-border-strong",
          "focus-within:border-orange focus-within:bg-surface focus-within:shadow-[0_0_0_3px_rgba(244,123,58,0.12)]",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        {/* Floating ghost label (only visible when wrapper has focus-within) */}
        {label && (
          <span
            className={cn(
              "absolute -top-2 left-4 px-1.5 bg-surface",
              "text-[9px] uppercase tracking-[0.08em] text-ink-faint font-medium",
              "opacity-0 pointer-events-none transition-opacity",
              "group-focus-within/sf:opacity-100",
            )}
          >
            {label}
          </span>
        )}

        {/* Prefix slot */}
        {prefix}

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
            className={cn(sharedInputClasses, "resize-y min-h-[54px]")}
            {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
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
            className={sharedInputClasses}
            {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {/* Suffix slot */}
        {suffix}
      </div>

      {/* Counter (auto, only when maxLength is set) */}
      {maxLength && !hideCounter && (
        <div className="text-right mt-1 text-[10px] text-ink-faint opacity-60 tabular-nums">
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
