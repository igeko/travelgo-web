"use client";

/**
 * Tooltip — lightweight, dependency-free, asChild primitive.
 *
 * Clones its single child trigger (no extra wrapper element, so flex/grid
 * layouts are preserved) and renders the bubble through a portal on
 * `document.body` with fixed positioning — so it is never clipped by an
 * ancestor's `overflow`. Shows on hover and keyboard focus.
 *
 *   <Tooltip label="Dormi" side="left">
 *     <button>…</button>
 *   </Tooltip>
 */

import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type TooltipSide = "top" | "bottom" | "left" | "right";

type Coords = { top: number; left: number };

const GAP = 8;
const SHOW_DELAY = 250;

type TriggerProps = {
  ref?: Ref<HTMLElement>;
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
  "aria-describedby"?: string;
};

export function Tooltip({
  label,
  side = "top",
  disabled = false,
  children,
}: {
  label: string;
  side?: TooltipSide;
  /** When true, render the trigger untouched (no tooltip). */
  disabled?: boolean;
  children: ReactElement;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const map: Record<TooltipSide, Coords> = {
      top: { top: r.top - GAP, left: r.left + r.width / 2 },
      bottom: { top: r.bottom + GAP, left: r.left + r.width / 2 },
      left: { top: r.top + r.height / 2, left: r.left - GAP },
      right: { top: r.top + r.height / 2, left: r.right + GAP },
    };
    setCoords(map[side]);
  }, [side]);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      place();
    }, SHOW_DELAY);
  }, [place]);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCoords(null);
  }, []);

  // React 19: a forwarded child's ref lives in props.ref, not element.ref.
  const childRef = isValidElement(children)
    ? ((children.props as { ref?: Ref<HTMLElement> }).ref ?? undefined)
    : undefined;
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
      assignRef(childRef, node);
    },
    [childRef],
  );

  if (disabled || !isValidElement(children)) return children;

  const childProps = (children.props ?? {}) as TriggerProps;
  // asChild pattern: merging a stable ref callback into the cloned trigger is
  // intentional and safe (the callback runs at commit, not during render).
  // eslint-disable-next-line react-hooks/refs
  const trigger = cloneElement(children as ReactElement<TriggerProps>, {
    ref: setRef,
    "aria-describedby": coords ? id : undefined,
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      childProps.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      childProps.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(e);
      place();
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(e);
      hide();
    },
  } as TriggerProps);

  const transform: Record<TooltipSide, string> = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  };

  return (
    <>
      {trigger}
      {coords &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            className={cn(
              "pointer-events-none fixed z-toast whitespace-nowrap rounded-md bg-ink px-2 py-1",
              "text-tiny font-medium text-white shadow-md",
            )}
            style={{ top: coords.top, left: coords.left, transform: transform[side] }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}

function assignRef(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null) {
  if (typeof ref === "function") ref(node);
  else if (ref && typeof ref === "object") {
    (ref as { current: HTMLElement | null }).current = node;
  }
}
