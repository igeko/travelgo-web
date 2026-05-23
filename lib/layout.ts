/**
 * Standard page-container spacing — keep identical across every top-level page wrapper.
 * Single source of truth for the gap between content and viewport edges, and between columns.
 */

/** Max content width for top-level pages. Single source of truth (Explore opts out — it's full-bleed). */
export const PAGE_MAX = "max-w-[1280px]";

/** Horizontal page padding (content ↔ viewport edges). Lighter through the tablet band, full at desktop. */
export const PAGE_PX = "px-4 lg:px-5";

/** Vertical page padding. */
export const PAGE_PY = "py-4 sm:py-5";

/** Gap between columns/blocks in multi-column page layouts. Tight on tablet, full at desktop. */
export const PAGE_GAP = "gap-3 lg:gap-[18px]";
