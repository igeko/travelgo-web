"use client";

/**
 * Resolves the language-agnostic EXPLORE_CATEGORY_TREE into the localized
 * `ExploreMacroCategory[]` the toolbar consumes. Labels come from the
 * `ExploreCategories` message namespace, keyed by the stable category id.
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { EXPLORE_CATEGORY_TREE } from "./categories";
import type { ExploreMacroCategory } from "./ExploreToolbar";

export function useExploreCategories(): ExploreMacroCategory[] {
  const t = useTranslations("ExploreCategories");
  return useMemo(
    () =>
      EXPLORE_CATEGORY_TREE.map((macro) => ({
        id: macro.id,
        icon: macro.icon,
        label: t(macro.id),
        subs: macro.subs.map((sub) => ({
          id: sub.id,
          icon: sub.icon,
          label: t(sub.id),
        })),
      })),
    [t],
  );
}
