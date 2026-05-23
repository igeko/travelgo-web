/**
 * components/ui/mapPins.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared Google Maps marker icons + brand colours, so RouteMap and Map
 * render identical pins. These build SVG data-URI icons and therefore must
 * only be called client-side, after the Maps SDK is ready (they reference
 * `google.maps.Size`/`Point`).
 * ─────────────────────────────────────────────────────────────────
 */

import type { ComponentType } from "react";

export const INK = "#0d2c3d"; // brand blue — markers + route line
export const ORANGE = "#f47b3a"; // brand orange — ad-hoc pin (Go places / "show on map")
export const NEUTRAL = "#5b6b78"; // muted slate — unselected Go places (ink-soft)
export const NIGHT = "#4338ca"; // indigo — Explore night-route layer (--color-night)

export type StopRole = "start" | "mid" | "end";

/* ─────────────────────────────────────────────────────────────────
   Icon → inner SVG geometry (shared by RouteMap stop pins and the
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
 * Build a teardrop pin marker (40×40): a coloured rounded body with a pointer
 * tail, white outline for map contrast, and the stop's icon knocked out in
 * white inside the head. The "end" role uses a flag. The body colour defaults
 * to brand ink but can be overridden. Anchored at the tip.
 *
 * `glyph` is a string of inner SVG paths (24-box) inheriting stroke from the
 * wrapping <g> — typically produced by the caller's icon resolver.
 */
export function makePinIcon(role: StopRole, glyph: string, color: string = INK): google.maps.Icon {
  const inner = role === "end" ? FLAG_INNER : glyph;
  // Rounded teardrop body: head centred at (20,16), tip at the bottom.
  const body =
    `<path d="M20 4c-6.6 0-12 5.2-12 11.7 0 8.1 10.4 18.4 11.3 19.3a1 1 0 0 0 1.4 0C21.6 34.1 32 23.8 32 15.7 32 9.2 26.6 4 20 4z" ` +
    `fill="${color}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;
  // Icon (24-box) scaled to ~18px and centred in the head.
  const icon =
    `<g transform="translate(11 7) scale(0.75)" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">${body}${icon}</svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 38),
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
export function makeNightPin(glyph: string, color: string = NIGHT): google.maps.Icon {
  const stem = `<path d="M14 30c2.5 4 6 8.5 8 12 2-3.5 5.5-8 8-12z" fill="${color}"/>`;
  const head = `<circle cx="22" cy="20" r="15" fill="${color}" stroke="#fff" stroke-width="3"/>`;
  const icon =
    `<g transform="translate(13.6 11.6) scale(0.7)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">` +
    `<defs><filter id="np" x="-40%" y="-20%" width="180%" height="150%">` +
    `<feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="rgba(13,44,61,0.35)"/></filter></defs>` +
    `<g filter="url(#np)">${stem}${head}${icon}</g></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 52),
    anchor: new google.maps.Point(22, 46),
  };
}

export function makeAdHocPin(color: string = ORANGE, dotColor: string = "#fff", glyph?: string): google.maps.Icon {
  // Either the category icon (knocked out white, centred in the head) or a dot.
  const center = glyph
    ? `<g transform="translate(13.5 9.5) scale(0.54)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`
    : `<circle cx="20" cy="16" r="4.2" fill="${dotColor}"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="46" viewBox="0 0 44 46">` +
    `<defs><filter id="ps" x="-40%" y="-20%" width="180%" height="150%">` +
    `<feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="rgba(13,44,61,0.35)"/></filter></defs>` +
    `<g filter="url(#ps)" transform="translate(2 2)">` +
    `<path d="M20 4c-6.6 0-12 5.2-12 11.7 0 8.1 10.4 18.4 11.3 19.3a1 1 0 0 0 1.4 0C21.6 34.1 32 23.8 32 15.7 32 9.2 26.6 4 20 4z" ` +
    `fill="${color}"/>` +
    center +
    `</g></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 46),
    anchor: new google.maps.Point(22, 40),
  };
}
