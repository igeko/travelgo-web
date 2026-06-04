import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * twMerge extended with TravelGo's custom @theme tokens. Without this,
 * tailwind-merge misreads e.g. `text-meta` as a text-color and drops it
 * when merged alongside a real color like `text-ink-soft`.
 * Keep in sync with the token names in app/globals.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["nano", "micro", "tiny", "mini", "meta"] }],
      tracking: [{ tracking: ["meta", "eyebrow", "eyebrow-wide"] }],
      z: [{ z: ["dropdown", "overlay", "modal", "toast"] }],
      rounded: [{ rounded: ["xs", "pill"] }],
    },
  },
});

/**
 * Concatenates conditional classnames and resolves Tailwind conflicts
 * (e.g. "px-4" + "px-6" → "px-6"). Used throughout UI components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
