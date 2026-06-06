/**
 * features/activity/resolveGlyph.ts
 * ─────────────────────────────────────────────────────────────────
 * Activity stop → inner-SVG glyph resolver shared by every map surface
 * (ActivityRouteMap stop pins, ExploreNextShell itinerary markers, …). Picks
 * the most specific icon available for a stop: the activity's `iconKey`
 * first, then the block-`type` fallback, and finally a generic map pin
 * for stops with neither.
 *
 * The returned string is the inner geometry (24-box) inheriting stroke
 * from the wrapping <g> in mapPins — i.e. it's the second argument to
 * `makePinIcon` / `makeAdHocPin` / `makeNightPin`.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  IconKey,
  IconMapPin,
  IconSoup,
  IconTrain,
  IconTree,
} from "@/components/ui/icons";
import { iconGlyph } from "@/components/ui/mapPins";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import type { BlockType } from "@/lib/dal/domain";

/** Block type → Tabler icon. Mirrors the legend used by Timeline / ActivityRow. */
const TYPE_CMP: Record<string, React.ComponentType<{ size?: number; stroke?: number }>> = {
  place:  IconMapPin,
  meal:   IconSoup,
  pause:  IconTree,
  action: IconKey,
  move:   IconTrain,
};

/** The minimal shape `resolveGlyph` reads from a stop. */
export type GlyphStop = {
  /** Activity stop icon key (from `stopIcons` registry). */
  iconKey?: string | null;
  /** Activity block type — fallback when no `iconKey` is set. */
  type?: BlockType | null;
};

/** Resolve a stop to its inner-SVG glyph (string of <path> et al.). */
export function resolveGlyph(stop: GlyphStop): string {
  if (stop.iconKey) {
    const Cmp = getStopIcon(stop.iconKey);
    if (Cmp) return iconGlyph(`stop:${stop.iconKey}`, Cmp);
  }
  if (stop.type && TYPE_CMP[stop.type]) {
    return iconGlyph(`type:${stop.type}`, TYPE_CMP[stop.type]);
  }
  return iconGlyph("type:place", IconMapPin);
}
