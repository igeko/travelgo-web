import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Concatenates conditional classnames and resolves Tailwind conflicts
 * (e.g. "px-4" + "px-6" → "px-6"). Used throughout UI components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
