/**
 * lib/yumeji/manifest.ts
 * ─────────────────────────────────────────────────────────────────
 * Editorial composition of the Yumeji page: an ordered list of widgets.
 *
 * For now this lives in code (typed, refactor-safe). The shape is the same one
 * a CMS/DB row would carry, so moving it editorial-side later is a swap of the
 * source, not of the consumers. Reorder, retitle, or add widgets here.
 * ─────────────────────────────────────────────────────────────────
 */

import type { YumejiWidgetSpec } from "./types";

export const YUMEJI_MANIFEST: YumejiWidgetSpec[] = [
  {
    id: "recent",
    type: "recent",
    props: {
      title: "Salvati di recente",
      subtitle: "Gli ultimi sogni che hai aggiunto alla collezione.",
      limit: 12,
    },
  },
  {
    id: "by-category",
    type: "byCategory",
    props: {
      title: "Sfoglia per categoria",
      subtitle: "I tuoi yume raggruppati per tipo.",
      maxCategories: 4,
      perCategory: 6,
    },
  },
];
