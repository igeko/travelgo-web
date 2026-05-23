/**
 * lib/yumeji/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Yumeji catalog · editorial widget model (pure types, no React, no DB).
 *
 * The Yumeji page is composed as an ordered list of widgets read from a
 * manifest. Each widget declares its *type* (its "tipologia") and editorial
 * `props`; the data it shows is NOT in the manifest — it is derived from a
 * single, bounded server-side load of the user's collection (see select.ts +
 * YumeService.buildCatalog). This keeps widgets independent in their rendering
 * logic while sharing one fetch: no widget queries the DB on its own.
 * ─────────────────────────────────────────────────────────────────
 */

import type { DbActivity } from "@/lib/dal";

/** A yume in the catalog working set is just the owned activity entity. */
export type CatalogYume = DbActivity;

// ── Manifest (editorial config) ───────────────────────────────────
// Discriminated union: one variant per widget type. `props` carries only
// editorial knobs (titles, caps, layout), never data.

export type RecentProps = {
  title: string;
  subtitle?: string;
  /** Max items shown. */
  limit?: number;
};

export type ByCategoryProps = {
  title: string;
  subtitle?: string;
  /** Max category groups to render. */
  maxCategories?: number;
  /** Max preview items per category. */
  perCategory?: number;
};

export type YumejiWidgetSpec =
  | { id: string; type: "recent"; props: RecentProps }
  | { id: string; type: "byCategory"; props: ByCategoryProps };

export type YumejiWidgetType = YumejiWidgetSpec["type"];

// ── Resolved (manifest + derived data) ────────────────────────────
// What the server hands the dispatcher: each spec paired with its slice.

export type CategoryGroup = {
  category: string;
  /** Capped preview slice for this category. */
  items: CatalogYume[];
  /** Total items in this category within the working set (for "see all"). */
  total: number;
};

export type ResolvedWidget =
  | { id: string; type: "recent"; props: RecentProps; data: CatalogYume[] }
  | { id: string; type: "byCategory"; props: ByCategoryProps; data: CategoryGroup[] };

export type YumejiCatalog = {
  widgets: ResolvedWidget[];
  /** True when the user's collection is empty (drives the page empty state). */
  isEmpty: boolean;
};
