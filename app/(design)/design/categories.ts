/**
 * Design scratchpad categories.
 * Maps each sketch slug (path relative to /design) to a sidebar group/subgroup,
 * mirroring the (dev)/dev registry. Pages discovered on disk but missing here
 * fall into the "Altri" group at the end, so auto-discovery keeps working.
 */
export type DesignMeta = {
  group: string;
  /** Optional subgroup label within a group (accordion). */
  subgroup?: string;
  /** Override the prettified slug. */
  title?: string;
};

/** Group render order. Groups not listed here are appended after these. */
export const DESIGN_GROUP_ORDER = ["Trip", "Day", "Activities", "Explore"];

/** Fallback group for sketches without explicit metadata. */
export const DESIGN_FALLBACK_GROUP = "Altri";

/** Groups rendered with the orange highlight + leading divider (like dev's Features/Admin). */
export const DESIGN_HIGHLIGHT_GROUPS = new Set(["Explore"]);

export const designCategories: Record<string, DesignMeta> = {
  // ── Trip ─────────────────────────────────────────────────────────
  "trip-flow": { group: "Trip", title: "Trip flow" },

  // ── Day ──────────────────────────────────────────────────────────
  "day-layout": { group: "Day", title: "Day layout" },
  "day-incipit": { group: "Day", title: "Day incipit" },

  // ── Activities ───────────────────────────────────────────────────
  "activity-search": { group: "Activities", title: "Activity search" },
  "activities-editor": { group: "Activities", subgroup: "Editor", title: "Editor" },
  "activities-editor/day": { group: "Activities", subgroup: "Editor", title: "Day editor" },
  "activities-editor/builder": { group: "Activities", subgroup: "Editor", title: "Builder" },

  // ── Explore ──────────────────────────────────────────────────────
  discovery: { group: "Explore", title: "Discovery" },
  yumeji: { group: "Explore", title: "Yumeji" },
  "place-hover": { group: "Explore", title: "Place hover" },
  "explore-toolbar": { group: "Explore", title: "Toolbar" },
  "explore-mobile-states": { group: "Explore", title: "Mobile states" },
};

/** Declaration order index, used to sort entries within a group. */
export const designOrderIndex: Record<string, number> = Object.fromEntries(
  Object.keys(designCategories).map((slug, i) => [slug, i]),
);
