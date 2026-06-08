/**
 * components/ui/mapPins.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared Google Maps marker icons + brand colours used by the Map
 * primitive (stop / ad-hoc / night pins). These build SVG data-URI icons
 * and therefore must only be called client-side, after the Maps SDK is
 * ready (they reference `google.maps.Size`/`Point`).
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType } from "react";

export const INK = "#0d2c3d"; // brand blue — markers + route line
export const ORANGE = "#f47b3a"; // brand orange — ad-hoc pin (Go places / "show on map")
export const NEUTRAL = "#5b6b78"; // muted slate — unselected Go places (ink-soft)
export const NIGHT = "#4338ca"; // indigo — Explore night-route layer (--color-night)

export type StopRole = "start" | "mid" | "end";

/* ─────────────────────────────────────────────────────────────────
   Icon → inner SVG geometry (shared by itinerary stop pins and the
   ad-hoc/category pins). Renders a Tabler icon component to its child
   shapes WITHOUT pulling in react-dom/server. Cached per key.
───────────────────────────────────────────────────────────────── */
export type GlyphCmp = ComponentType<{ size?: number; stroke?: number }>;
type SvgChild = { type?: unknown; props?: Record<string, unknown> };

const glyphCache = new Map<string, string>();

/** camelCase React prop → kebab-case SVG attribute (strokeWidth → stroke-width). */
function attrName(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Serialize one SVG child element (path/circle/line/…) to a self-closing tag. */
function serializeChild(child: SvgChild): string {
  if (!child || typeof child.type !== "string") return "";
  const props = child.props ?? {};
  const attrs = Object.entries(props)
    .filter(([k, v]) => k !== "children" && k !== "className" && v != null && typeof v !== "object" && typeof v !== "function")
    .map(([k, v]) => `${attrName(k)}="${String(v)}"`)
    .join(" ");
  return `<${child.type}${attrs ? ` ${attrs}` : ""} />`;
}

/** Inner geometry of a Tabler icon (uncoloured — stroke inherited from a
 *  wrapping <g>). Invokes the component to get its element tree and serializes
 *  the child shapes by hand. Cached per `cacheKey`. */
export function iconGlyph(cacheKey: string, Cmp: GlyphCmp): string {
  const cached = glyphCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const ref = (Cmp as { render?: (p: object, r: null) => unknown }).render;
  const element = typeof ref === "function"
    ? ref({ size: 24, stroke: 2 }, null)
    : (Cmp as unknown as (p: object) => unknown)({ size: 24, stroke: 2 });
  const kids = (element as SvgChild | null)?.props?.children;
  const list: SvgChild[] = Array.isArray(kids) ? kids.filter(Boolean) : kids ? [kids as SvgChild] : [];
  const inner = list.map(serializeChild).join("");
  glyphCache.set(cacheKey, inner);
  return inner;
}

/** Origin flag inner paths (inline; not in the icon barrel). */
const FLAG_INNER = `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 5v16"/><path d="M5 5c3 -1.5 6 -1.5 9 0s6 1.5 9 0v9c-3 1.5 -6 1.5 -9 0s-6 -1.5 -9 0"/>`;

/**
 * Drag&drop ghost: scale factor applied to scaledSize/anchor, and a stronger
 * drop-shadow injected into the SVG. Shared by every pin factory so the
 * "lifted" feel is uniform across stop / night / ad-hoc variants. Opacity is
 * left to the caller (`marker.setOpacity`) — it's a per-marker runtime style,
 * not baked into the icon.
 */
const GHOST_SCALE = 1.15;
const GHOST_SHADOW =
  `<filter id="g" x="-60%" y="-40%" width="220%" height="180%">` +
  `<feDropShadow dx="0" dy="3" stdDeviation="2.8" flood-color="rgba(13,44,61,0.5)"/></filter>`;

/**
 * Build a teardrop pin marker (40×40): a coloured rounded body with a pointer
 * tail, white outline for map contrast, and the stop's icon knocked out in
 * white inside the head. The "end" role uses a flag. The body colour defaults
 * to brand ink but can be overridden. Anchored at the tip.
 *
 * `glyph` is a string of inner SVG paths (24-box) inheriting stroke from the
 * wrapping <g> — typically produced by the caller's icon resolver.
 *
 * `isGhost: true` returns the "lifted" drag variant — scaled ~1.15× with a
 * stronger drop shadow.
 */
export function makePinIcon(role: StopRole, glyph: string, color: string = INK, isGhost = false): google.maps.Icon {
  const inner = role === "end" ? FLAG_INNER : glyph;
  // Rounded teardrop body: head centred at (20,16), tip at the bottom.
  const body =
    `<path d="M20 4c-6.6 0-12 5.2-12 11.7 0 8.1 10.4 18.4 11.3 19.3a1 1 0 0 0 1.4 0C21.6 34.1 32 23.8 32 15.7 32 9.2 26.6 4 20 4z" ` +
    `fill="${color}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;
  // Icon (24-box) scaled to ~18px and centred in the head.
  const icon =
    `<g transform="translate(11 7) scale(0.75)" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

  const defs = isGhost ? `<defs>${GHOST_SHADOW}</defs>` : "";
  const wrap = isGhost ? `<g filter="url(#g)">${body}${icon}</g>` : `${body}${icon}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">${defs}${wrap}</svg>`;

  const s = isGhost ? GHOST_SCALE : 1;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(40 * s, 40 * s),
    anchor: new google.maps.Point(20 * s, 38 * s),
  };
}

/**
 * Ad-hoc marker (40×40): a teardrop pin with a white dot. Visually distinct
 * from the icon-only stop markers, so a Go-suggested place reads as "not part
 * of the route". `color` is the body fill, `dotColor` the centre dot (default
 * white). Pass `glyph` (inner SVG from `iconGlyph`) to draw a category icon in
 * the head instead of the dot. Anchored at the tip.
 */
/**
 * Night-route marker (44×52): a circular badge with a short pointer stem —
 * deliberately a different silhouette from the teardrop route/ad-hoc pins so
 * the Explore "night route" layer reads as its own thing. Indigo body, white
 * ring, the stop's glyph (bed for a sleep spot, the activity icon otherwise)
 * knocked out white in the centre. Anchored at the tip.
 */
export function makeNightPin(glyph: string, color: string = NIGHT, isGhost = false): google.maps.Icon {
  const stem = `<path d="M14 30c2.5 4 6 8.5 8 12 2-3.5 5.5-8 8-12z" fill="${color}"/>`;
  const head = `<circle cx="22" cy="20" r="15" fill="${color}" stroke="#fff" stroke-width="3"/>`;
  const icon =
    `<g transform="translate(13.6 11.6) scale(0.7)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`;
  // Stronger shadow when ghost, otherwise the lift effect is barely visible
  // through the existing dy=1.2 / stdDeviation=1.1 filter.
  const filter = isGhost
    ? GHOST_SHADOW
    : `<filter id="np" x="-40%" y="-20%" width="180%" height="150%">` +
      `<feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="rgba(13,44,61,0.35)"/></filter>`;
  const filterId = isGhost ? "g" : "np";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">` +
    `<defs>${filter}</defs>` +
    `<g filter="url(#${filterId})">${stem}${head}${icon}</g></svg>`;
  const s = isGhost ? GHOST_SCALE : 1;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44 * s, 52 * s),
    anchor: new google.maps.Point(22 * s, 46 * s),
  };
}

/* ─────────────────────────────────────────────────────────────────
   Roadmap pin — pin teardrop "compatto" delle attività pianificate
   sull'Explore map. Vedi /design/roadmap-pins.

   3 stati cablati su mappa: "default" (giorno in focus o nessuno selezionato),
   "dimmed" (attività di altri giorni quando un giorno è in focus), "overflow"
   (timing/geo). Lo stato "selected" della spec NON è gestito qui: la selezione
   sul pin continua a usare il halo overlay esistente, così la grafica del
   marker resta stabile fra "non selezionato" e "selezionato".

   Anchor sempre al bottom-center (tip).
───────────────────────────────────────────────────────────────── */
export type RoadmapPinState = "default" | "dimmed" | "overflow";
/** Semantic category — drives the palette. activity = blu, accommodation = arancione. */
export type RoadmapPinKind = "activity" | "accommodation";

type RoadmapShape = { w: number; h: number; d: string; cx: number; iconSize: number };
const ROADMAP_SHAPES: Record<RoadmapPinState, RoadmapShape> = {
  default:  { w: 28, h: 36, d: "M14 1C7 1 1 7 1 14c0 8.5 13 21 13 21s13-12.5 13-21C27 7 21 1 14 1Z", cx: 14, iconSize: 13 },
  dimmed:   { w: 22, h: 28, d: "M11 1C6 1 1 5.5 1 11c0 6.5 10 16 10 16s10-9.5 10-16C21 5.5 16 1 11 1Z", cx: 11, iconSize: 10 },
  overflow: { w: 28, h: 36, d: "M14 1C7 1 1 7 1 14c0 8.5 13 21 13 21s13-12.5 13-21C27 7 21 1 14 1Z", cx: 14, iconSize: 13 },
};

type RoadmapPalette = { fill: string; stroke: string; strokeW: number; icon: string };

/** Palette per kind × state — colori dei token del design system, senza
 *  bordo. Activity = ink (#0d2c3d), accommodation = primary (#f47b3a). overflow
 *  resta rosso indipendentemente dal kind (segnale di rischio). */
const ROADMAP_COLORS: Record<RoadmapPinKind, Record<RoadmapPinState, RoadmapPalette>> = {
  activity: {
    default:  { fill: "#0d2c3d",              stroke: "#0d2c3d",              strokeW: 0, icon: "#ffffff" },
    dimmed:   { fill: "rgba(13,44,61,0.35)",   stroke: "rgba(13,44,61,0.35)",   strokeW: 0, icon: "#ffffff" },
    overflow: { fill: "#9a3015",              stroke: "#9a3015",              strokeW: 0, icon: "#ffffff" },
  },
  accommodation: {
    default:  { fill: "#f47b3a",              stroke: "#f47b3a",              strokeW: 0, icon: "#ffffff" },
    dimmed:   { fill: "rgba(244,123,58,0.35)", stroke: "rgba(244,123,58,0.35)", strokeW: 0, icon: "#ffffff" },
    overflow: { fill: "#9a3015",              stroke: "#9a3015",              strokeW: 0, icon: "#ffffff" },
  },
};

/** Scale multiplier applied to the roadmap pin on hover (~+25% size). */
const ROADMAP_HOVER_SCALE = 1.25;

/** Build a roadmap pin marker. `glyph` is the inner 24-box SVG (typically
 *  from `iconGlyph(IconClockExclamation)` for overflow/timing, `iconGlyph(
 *  IconMapPinExclamation)` for overflow/geo, or the activity's icon).
 *  `isHovered` scales the rendered pin by 1.25× (kept proportional, the SVG
 *  internals stay identical — only the output Size/anchor are multiplied). */
export function makeRoadmapPin(
  state: RoadmapPinState,
  glyph: string,
  isGhost = false,
  kind: RoadmapPinKind = "activity",
  isHovered = false,
): google.maps.Icon {
  const shape = ROADMAP_SHAPES[state];
  const c = ROADMAP_COLORS[kind][state];
  const teardrop =
    `<path d="${shape.d}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${c.strokeW}" stroke-linejoin="round"/>`;
  // 24-box icon scaled into the head (centred at the circle's centre, with
  // a -1 vertical offset that matches the spec — keeps the icon optically
  // centred above the tip).
  const iconScale = shape.iconSize / 24;
  const iconX = shape.cx - shape.iconSize / 2;
  const iconY = shape.cx - shape.iconSize / 2 - 1;
  const icon =
    `<g transform="translate(${iconX} ${iconY}) scale(${iconScale})" fill="none" stroke="${c.icon}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`;

  const defs = isGhost ? `<defs>${GHOST_SHADOW}</defs>` : "";
  const wrap = isGhost ? `<g filter="url(#g)">${teardrop}${icon}</g>` : `${teardrop}${icon}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${shape.w}" height="${shape.h}" viewBox="0 0 ${shape.w} ${shape.h}">${defs}${wrap}</svg>`;

  const s = (isGhost ? GHOST_SCALE : 1) * (isHovered ? ROADMAP_HOVER_SCALE : 1);
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(shape.w * s, shape.h * s),
    anchor: new google.maps.Point((shape.w * s) / 2, shape.h * s),
  };
}

export function makeAdHocPin(color: string = ORANGE, dotColor: string = "#fff", glyph?: string, isGhost = false): google.maps.Icon {
  // Either the category icon (knocked out white, centred in the head) or a dot.
  const center = glyph
    ? `<g transform="translate(13.5 9.5) scale(0.54)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`
    : `<circle cx="20" cy="16" r="4.2" fill="${dotColor}"/>`;
  const filter = isGhost
    ? GHOST_SHADOW
    : `<filter id="ps" x="-40%" y="-20%" width="180%" height="150%">` +
      `<feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="rgba(13,44,61,0.35)"/></filter>`;
  const filterId = isGhost ? "g" : "ps";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="46" viewBox="0 0 44 46">` +
    `<defs>${filter}</defs>` +
    `<g filter="url(#${filterId})" transform="translate(2 2)">` +
    `<path d="M20 4c-6.6 0-12 5.2-12 11.7 0 8.1 10.4 18.4 11.3 19.3a1 1 0 0 0 1.4 0C21.6 34.1 32 23.8 32 15.7 32 9.2 26.6 4 20 4z" ` +
    `fill="${color}"/>` +
    center +
    `</g></svg>`;
  const s = isGhost ? GHOST_SCALE : 1;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44 * s, 46 * s),
    anchor: new google.maps.Point(22 * s, 40 * s),
  };
}
