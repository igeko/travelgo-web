/**
 * lib/yumeji/select.ts
 * ─────────────────────────────────────────────────────────────────
 * Pure selectors + the widget resolver.
 *
 * A selector is each widget's "tipologia": given the shared working set
 * (newest-first), it returns the slice that widget shows — computed in memory,
 * never a query. `resolveWidget` maps a manifest spec to its resolved form by
 * dispatching on `type`. Adding a widget = add a selector + a case here + a
 * variant in types.ts. No React, no DB.
 * ─────────────────────────────────────────────────────────────────
 */

import type {
  ByCategoryProps,
  CatalogYume,
  CategoryGroup,
  RecentProps,
  ResolvedWidget,
  YumejiWidgetSpec,
} from "./types";

const DEFAULT_RECENT_LIMIT = 12;
const DEFAULT_MAX_CATEGORIES = 4;
const DEFAULT_PER_CATEGORY = 6;

/** Newest saved yume first. The working set already arrives ordered. */
export function selectRecent(items: CatalogYume[], props: RecentProps): CatalogYume[] {
  return items.slice(0, props.limit ?? DEFAULT_RECENT_LIMIT);
}

/**
 * Group the working set by `category`, drop the uncategorised, order groups by
 * size (largest first), and cap both the number of groups and the items shown
 * per group. `total` keeps the full per-category count so a future "see all"
 * can paginate the real collection.
 */
export function selectByCategory(items: CatalogYume[], props: ByCategoryProps): CategoryGroup[] {
  const maxCategories = props.maxCategories ?? DEFAULT_MAX_CATEGORIES;
  const perCategory = props.perCategory ?? DEFAULT_PER_CATEGORY;

  const byCategory = new Map<string, CatalogYume[]>();
  for (const item of items) {
    const category = item.category?.trim();
    if (!category) continue;
    const bucket = byCategory.get(category);
    if (bucket) bucket.push(item);
    else byCategory.set(category, [item]);
  }

  return [...byCategory.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxCategories)
    .map(([category, group]) => ({
      category,
      items: group.slice(0, perCategory),
      total: group.length,
    }));
}

/** Pair a manifest spec with its derived data slice. */
export function resolveWidget(spec: YumejiWidgetSpec, items: CatalogYume[]): ResolvedWidget {
  switch (spec.type) {
    case "recent":
      return { ...spec, data: selectRecent(items, spec.props) };
    case "byCategory":
      return { ...spec, data: selectByCategory(items, spec.props) };
  }
}
