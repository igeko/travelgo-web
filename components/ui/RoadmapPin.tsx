/**
 * components/ui/RoadmapPin.tsx
 * ─────────────────────────────────────────────────────────────────
 * React component version of the roadmap pin shown in
 * /design/roadmap-pins. Renders inline (no Google Maps SDK
 * needed) — utile per legende, sandbox, e UI ausiliarie che
 * devono mostrare un pin senza una mappa.
 *
 * Forma teardrop coerente con la spec. Tre stati su mappa:
 *   - `default`  → bianco + bordo ink + icona ink     (28×36)
 *   - `dimmed`   → surface-soft + bordo/icona sbiaditi (22×28)
 *   - `overflow` → danger-bg + bordo/icona danger-fg   (28×36)
 *                  due varianti d'icona: clock-exclamation (timing) |
 *                  map-pin-exclamation (geo)
 *
 * Lo stato `selected` della spec (32×41 ink + icona primary) NON è
 * gestito qui: nella mappa Explore la selezione resta a carico del
 * halo overlay esistente, così la grafica del marker non cambia fra
 * "selezionato" e "non selezionato". Vedi `components/ui/mapPins.ts` →
 * `makeRoadmapPin` per la variante data-URI usata da Google Maps.
 *
 * Atomic level: atom.
 * ─────────────────────────────────────────────────────────────────
 */

import { cn } from "@/lib/cn";
import {
  IconMapPin,
  IconClockExclamation,
  IconMapPinExclamation,
  type Icon,
} from "@/components/ui/icons";

export type RoadmapPinState = "default" | "dimmed" | "overflow";
export type RoadmapOverflowType = "timing" | "geo";

type RoadmapPinProps = {
  /** Tabler icon che rappresenta il tipo dell'attività. Default: MapPin. */
  icon?: Icon;
  state?: RoadmapPinState;
  /** Tipo di overflow — rilevante solo con state="overflow". */
  overflowType?: RoadmapOverflowType;
  className?: string;
};

type Shape = { w: number; h: number; d: string; cx: number; iconSize: number };

const SHAPES: Record<RoadmapPinState, Shape> = {
  default:  { w: 28, h: 36, d: "M14 1C7 1 1 7 1 14c0 8.5 13 21 13 21s13-12.5 13-21C27 7 21 1 14 1Z", cx: 14, iconSize: 13 },
  dimmed:   { w: 22, h: 28, d: "M11 1C6 1 1 5.5 1 11c0 6.5 10 16 10 16s10-9.5 10-16C21 5.5 16 1 11 1Z", cx: 11, iconSize: 10 },
  overflow: { w: 28, h: 36, d: "M14 1C7 1 1 7 1 14c0 8.5 13 21 13 21s13-12.5 13-21C27 7 21 1 14 1Z", cx: 14, iconSize: 13 },
};

const COLORS: Record<RoadmapPinState, { fill: string; stroke: string; strokeW: number; icon: string }> = {
  default:  { fill: "#ffffff", stroke: "#0d2c3d",            strokeW: 1.5, icon: "#0d2c3d" },
  dimmed:   { fill: "#f5f3ee", stroke: "rgba(13,44,61,0.20)", strokeW: 1.2, icon: "rgba(13,44,61,0.30)" },
  overflow: { fill: "#fcebeb", stroke: "#9a3015",            strokeW: 1.5, icon: "#9a3015" },
};

export function RoadmapPin({
  icon: IconCmp = IconMapPin,
  state = "default",
  overflowType = "timing",
  className,
}: RoadmapPinProps) {
  const shape = SHAPES[state];
  const c = COLORS[state];

  // In overflow l'icona dell'attività viene sostituita dall'icona overflow.
  const OverflowIcon = overflowType === "geo" ? IconMapPinExclamation : IconClockExclamation;
  const DisplayIcon = state === "overflow" ? OverflowIcon : IconCmp;

  return (
    <span
      className={cn("relative inline-block", className)}
      style={{ width: shape.w, height: shape.h }}
    >
      <svg
        width={shape.w}
        height={shape.h}
        viewBox={`0 0 ${shape.w} ${shape.h}`}
        aria-hidden
        style={{ display: "block" }}
      >
        <path
          d={shape.d}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth={c.strokeW}
          strokeLinejoin="round"
        />
      </svg>
      <span
        aria-hidden
        className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center"
        style={{
          top: shape.cx - shape.iconSize / 2 - 1,
          width: shape.iconSize,
          height: shape.iconSize,
        }}
      >
        <DisplayIcon
          style={{ width: shape.iconSize, height: shape.iconSize, color: c.icon }}
          strokeWidth={2}
        />
      </span>
    </span>
  );
}
