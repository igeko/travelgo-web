"use client";

import { cn } from "@/lib/cn";

/**
 * Avatar Go · cerchio ink con il kanji 五 bianco e un alone arancione
 * che pulsa. Decorativo: `aria-hidden`.
 *
 * Sizes fedeli a trip.html:
 *   xs  → 24px (w-6)
 *   sm  → 28px (w-7)
 *   md  → 32px (w-8)
 *   lg  → 40px (w-10)  ← usato nel trigger
 */
type Size = "xs" | "sm" | "md" | "lg";

export function GoAvatar({
  size = "md",
  pulse = true,
  className,
}: {
  size?: Size;
  /** Abilita l'animazione pulsante dell'alone arancione (default true) */
  pulse?: boolean;
  className?: string;
}) {
  const dims =
    size === "xs" ? "w-6 h-6 text-mini" :
    size === "sm" ? "w-7 h-7 text-[14px]" :
    size === "md" ? "w-8 h-8 text-[16px]" :
                   "w-10 h-10 text-[20px]";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-full shrink-0",
        "bg-ink text-white font-medium leading-none go-jp",
        pulse && "go-halo",
        dims,
        className,
      )}
    >
      五
    </span>
  );
}
