/**
 * Design sketch — Roadmap Pins
 * URL: /design/roadmap-pins
 *
 * Pin delle attività sulla mappa roadmap builder.
 * Forma: teardrop (24×30 base, coerente col Pin esistente in components/).
 *
 * 4 stati:
 *   default  → bianco + bordo ink + icona ink
 *   selected → fill ink + icona arancio (più grande: 32×41)
 *   dimmed   → surface-soft + bordo/icona sbiaditi (altro giorno)
 *   overflow → danger-bg + bordo/icona danger-fg
 *              due varianti icona: clock-exclamation (timing) | map-pin-exclamation (geo)
 *
 * Componente target: components/ui/RoadmapPin.tsx  (da creare)
 * Usato in: features/explore/ExploreMap.tsx (roadmap mode)
 */

import { cn } from "@/lib/cn";
import {
  IconBuildingMonument,
  IconSoup,
  IconCoffee,
  IconTorii,
  IconWalk,
  IconCamera,
  IconBed,
  IconClockExclamation,
  IconMapPin,
} from "@/components/ui/icons";
import type { Icon } from "@/components/ui/icons";

/* ─── Tipi ────────────────────────────────────────────────────── */
type PinState = "default" | "selected" | "dimmed" | "overflow";
type OverflowType = "timing" | "geo";

type RoadmapPinProps = {
  /** Icona Tabler che rappresenta il tipo di attività. Default: MapPin. */
  icon?: Icon;
  state?: PinState;
  /**
   * Tipo di overflow. Rilevante solo quando state="overflow".
   * "timing" → fuori orario nel giorno  (IconClockExclamation)
   * "geo"    → troppo distante dal giorno (IconMapPinExclamation — vedi sotto)
   */
  overflowType?: OverflowType;
  className?: string;
};

/* ─── Token colori (da globals.css) ──────────────────────────── */
// default:  bg white, border #0d2c3d, icon #0d2c3d       → 28×36
// selected: bg #0d2c3d, no border, icon #f47b3a           → 32×41
// dimmed:   bg #f5f3ee, border rgba(13,44,61,.20), icon rgba(13,44,61,.30) → 22×28
// overflow: bg #fcebeb, border #9a3015, icon #9a3015      → 28×36  (sel: 32×41, bg #9a3015, icon #fcebeb)

/* ─── SVG teardrop paths ─────────────────────────────────────── */
// Tutti calcolati su viewBox 0 0 W H, cerchio centrato a (W/2, W/2), r ≈ W/2-1
// W=28 H=36: M14 1 C7 1 1 7 1 14 c0 8.5 13 21 13 21 s13-12.5 13-21 C27 7 21 1 14 1 Z
// W=32 H=41: M16 1 C8 1 1 8 1 16 c0 9.5 15 24 15 24 s15-14.5 15-24 C31 8 24 1 16 1 Z
// W=22 H=28: M11 1 C6 1 1 5.5 1 11 c0 6.5 10 16 10 16 s10-9.5 10-16 C21 5.5 16 1 11 1 Z

const PATHS = {
  sm:  { w: 22, h: 28, d: "M11 1C6 1 1 5.5 1 11c0 6.5 10 16 10 16s10-9.5 10-16C21 5.5 16 1 11 1Z", cx: 11, cy: 11, iconSize: 10 },
  md:  { w: 28, h: 36, d: "M14 1C7 1 1 7 1 14c0 8.5 13 21 13 21s13-12.5 13-21C27 7 21 1 14 1Z",     cx: 14, cy: 14, iconSize: 13 },
  lg:  { w: 32, h: 41, d: "M16 1C8 1 1 8 1 16c0 9.5 15 24 15 24s15-14.5 15-24C31 8 24 1 16 1Z",     cx: 16, cy: 16, iconSize: 15 },
};

/* ─── RoadmapPin ─────────────────────────────────────────────── */
export function RoadmapPin({
  icon: IconComponent = IconMapPin,
  state = "default",
  overflowType = "timing",
  className,
}: RoadmapPinProps) {
  const isSelected = state === "selected";
  const isDimmed   = state === "dimmed";
  const isOverflow = state === "overflow";
  const isOverflowSelected = isSelected && isOverflow; // N.B.: gestito dal chiamante

  const shape = isDimmed ? PATHS.sm : isSelected ? PATHS.lg : PATHS.md;

  /* fill + stroke */
  const fill = isSelected
    ? isOverflow ? "#9a3015" : "#0d2c3d"
    : isDimmed   ? "#f5f3ee"
    : isOverflow ? "#fcebeb"
    : "#ffffff";

  const stroke = isSelected
    ? "none"
    : isDimmed   ? "rgba(13,44,61,0.20)"
    : isOverflow ? "#9a3015"
    : "#0d2c3d";

  const strokeW = isDimmed ? 1.2 : 1.5;

  /* icon color */
  const iconColor = isSelected
    ? isOverflow ? "#fcebeb" : "#f47b3a"
    : isDimmed   ? "rgba(13,44,61,0.30)"
    : isOverflow ? "#9a3015"
    : "#0d2c3d";

  /* overflow icon override */
  const OverflowIcon = overflowType === "geo"
    ? IconMapPin   // placeholder — in prod: IconMapPinExclamation (da aggiungere a barrel)
    : IconClockExclamation;

  const DisplayIcon = isOverflow ? OverflowIcon : IconComponent;

  return (
    <span
      className={cn("relative inline-block", className)}
      style={{ width: shape.w, height: shape.h }}
    >
      {/* Teardrop SVG */}
      <svg
        width={shape.w}
        height={shape.h}
        viewBox={`0 0 ${shape.w} ${shape.h}`}
        aria-hidden
        style={{ display: "block" }}
      >
        <path
          d={shape.d}
          fill={fill}
          stroke={stroke === "none" ? undefined : stroke}
          strokeWidth={stroke === "none" ? undefined : strokeW}
        />
      </svg>

      {/* Icona */}
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
        style={{ top: shape.cy - shape.iconSize / 2 - 1, width: shape.iconSize, height: shape.iconSize }}
      >
        <DisplayIcon
          style={{ width: shape.iconSize, height: shape.iconSize, color: iconColor }}
          strokeWidth={2}
        />
      </span>
    </span>
  );
}

/* ─── Pagina ─────────────────────────────────────────────────── */
export default function RoadmapPinsPage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">

      {/* Header */}
      <header className="mb-10">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">
          Roadmap builder · mappa
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-3 tracking-[-0.01em]">
          Roadmap pin
        </h1>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[640px]">
          Pin delle attività pianificate sulla mappa roadmap. Forma teardrop coerente
          col componente <code className="font-mono text-[12px] bg-surface-soft px-1 rounded-sm">Pin</code> esistente.
          Quattro stati: <strong className="font-medium text-ink">default</strong>,{" "}
          <strong className="font-medium text-ink">selected</strong>,{" "}
          <strong className="font-medium text-ink">dimmed</strong>,{" "}
          <strong className="font-medium text-ink">overflow</strong>.
        </p>
      </header>

      {/* ── Stati su mappa ── */}
      <section className="mb-12">
        <SectionLabel>stati su mappa</SectionLabel>
        <div className="relative bg-[#e5eae0] rounded-lg overflow-visible" style={{ height: 240 }}>

          {/* Mappa SVG */}
          <svg className="absolute inset-0 w-full h-full rounded-lg" viewBox="0 0 820 240" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="g1" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0L0 0 0 80" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1"/>
              </pattern>
              <pattern id="g2" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="820" height="240" fill="#e5eae0"/>
            <rect width="820" height="240" fill="url(#g2)"/>
            <rect width="820" height="240" fill="url(#g1)"/>
            {/* Park */}
            <ellipse cx="90" cy="70" rx="70" ry="45" fill="#c5d9a8" opacity="0.9"/>
            {/* Water */}
            <path d="M820 155 Q750 140 720 185 Q700 220 820 240Z" fill="#b8d4e8" opacity="0.75"/>
            {/* Blocks */}
            <rect x="195" y="100" width="40" height="28" rx="2" fill="rgba(255,255,255,0.3)"/>
            <rect x="250" y="85" width="30" height="38" rx="2" fill="rgba(255,255,255,0.3)"/>
            <rect x="380" y="140" width="50" height="32" rx="2" fill="rgba(255,255,255,0.3)"/>
            <rect x="560" y="80" width="40" height="44" rx="2" fill="rgba(255,255,255,0.3)"/>
            {/* Path line — anchor points: 168,185  290,138  430,195  580,148  700,175 */}
            <path d="M168,185 C210,165 255,145 290,138" stroke="#0d2c3d" strokeWidth="2" strokeDasharray="5 4" fill="none" opacity="0.35"/>
            <path d="M290,138 C330,130 385,170 430,195" stroke="#0d2c3d" strokeWidth="2" strokeDasharray="5 4" fill="none" opacity="0.35"/>
            <path d="M430,195 C475,195 530,160 580,148" stroke="#0d2c3d" strokeWidth="2" strokeDasharray="5 4" fill="none" opacity="0.35"/>
            <path d="M580,148 C625,140 665,165 700,175" stroke="#9a3015" strokeWidth="2" strokeDasharray="5 4" fill="none" opacity="0.35"/>
            {/* Anchor dots */}
            <circle cx="168" cy="185" r="2.5" fill="#0d2c3d" opacity="0.4"/>
            <circle cx="290" cy="138" r="2.5" fill="#0d2c3d" opacity="0.4"/>
            <circle cx="430" cy="195" r="2.5" fill="#0d2c3d" opacity="0.4"/>
            <circle cx="580" cy="148" r="2.5" fill="#0d2c3d" opacity="0.4"/>
            <circle cx="700" cy="175" r="2.5" fill="#9a3015" opacity="0.4"/>
          </svg>

          {/* Dimmed — altri giorni */}
          <div className="absolute" style={{ left: 44, top: 28 }}>
            <RoadmapPin icon={IconCamera} state="dimmed"/>
          </div>
          <div className="absolute" style={{ left: 730, top: 55 }}>
            <RoadmapPin icon={IconBed} state="dimmed"/>
          </div>

          {/* Stop 1 — default: anchor (168,185) → top=185-36=149, left=168-14=154 */}
          <div className="absolute" style={{ left: 154, top: 149 }}>
            <RoadmapPin icon={IconBuildingMonument} state="default"/>
          </div>

          {/* Stop 2 — default: anchor (290,138) → top=138-36=102, left=290-14=276 */}
          <div className="absolute" style={{ left: 276, top: 102 }}>
            <RoadmapPin icon={IconSoup} state="default"/>
          </div>

          {/* Stop 3 — selected: anchor (430,195) → top=195-41=154, left=430-16=414 */}
          <div className="absolute" style={{ left: 414, top: 154, zIndex: 10 }}>
            <RoadmapPin icon={IconCoffee} state="selected"/>
          </div>

          {/* Stop 4 — default: anchor (580,148) → top=148-36=112, left=580-14=566 */}
          <div className="absolute" style={{ left: 566, top: 112 }}>
            <RoadmapPin icon={IconTorii} state="default"/>
          </div>

          {/* Stop 5 — overflow timing: anchor (700,175) → top=175-36=139, left=700-14=686 */}
          <div className="absolute" style={{ left: 686, top: 139 }}>
            <RoadmapPin icon={IconWalk} state="overflow" overflowType="timing"/>
          </div>
        </div>
      </section>

      {/* ── Tutti gli stati ── */}
      <section className="mb-12">
        <SectionLabel>stati — riferimento</SectionLabel>
        <div className="flex gap-12 flex-wrap items-end bg-[#e5eae0] rounded-lg px-8 py-8">

          <PinWithLabel label="default" sub="tappa del giorno">
            <RoadmapPin icon={IconBuildingMonument} state="default"/>
          </PinWithLabel>

          <PinWithLabel label="selected" sub="tappato">
            <RoadmapPin icon={IconBuildingMonument} state="selected"/>
          </PinWithLabel>

          <PinWithLabel label="dimmed" sub="altro giorno">
            <RoadmapPin icon={IconBuildingMonument} state="dimmed"/>
          </PinWithLabel>

          <div className="w-px self-stretch bg-black/10"/>

          <PinWithLabel label="overflow / timing" sub="fuori orario nel giorno">
            <RoadmapPin icon={IconBuildingMonument} state="overflow" overflowType="timing"/>
          </PinWithLabel>

          <PinWithLabel label="overflow / geo" sub="troppo distante">
            <RoadmapPin icon={IconBuildingMonument} state="overflow" overflowType="geo"/>
          </PinWithLabel>

          <PinWithLabel label="overflow selected" sub="overflow + tappato">
            {/* Overflow selected: stessa logica di selected ma colori danger */}
            <span className="relative inline-block" style={{ width: 32, height: 41 }}>
              <svg width="32" height="41" viewBox="0 0 32 41" aria-hidden style={{ display: "block" }}>
                <path d="M16 1C8 1 1 8 1 16c0 9.5 15 24 15 24s15-14.5 15-24C31 8 24 1 16 1Z" fill="#9a3015"/>
              </svg>
              <span className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center" style={{ top: 8, width: 15, height: 15 }}>
                <IconClockExclamation style={{ width: 15, height: 15, color: "#fcebeb" }} strokeWidth={2}/>
              </span>
            </span>
          </PinWithLabel>

        </div>
      </section>

      {/* ── Note sviluppatore ── */}
      <section className="border-t border-border pt-8">
        <SectionLabel>note per lo sviluppatore</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <DevCard title="Componente da creare" file="components/ui/RoadmapPin.tsx">
            <CodeBlock>{`type RoadmapPinProps = {
  icon?: Icon          // da @/components/ui/icons
  state?: PinState     // "default"|"selected"|"dimmed"|"overflow"
  overflowType?:       // "timing" | "geo"
    OverflowType
  className?: string
}`}</CodeBlock>
          </DevCard>

          <DevCard title="Dimensioni per stato" file="components/ui/RoadmapPin.tsx">
            <CodeBlock>{`default  → 28×36px  (circle r≈13, iconSize 13)
selected → 32×41px  (circle r≈15, iconSize 15)
dimmed   → 22×28px  (circle r≈10, iconSize 10)
overflow → 28×36px  (stessi di default)`}</CodeBlock>
            <p className="mt-2 text-[11px] text-ink-faint">
              Il selected è più grande per emergere visivamente sulla mappa.
              L&apos;anchor point (tip) è sempre al <code>bottom-center</code> del componente.
            </p>
          </DevCard>

          <DevCard title="Colori per stato" file="components/ui/RoadmapPin.tsx">
            <CodeBlock>{`default:  fill white   border ink      icon ink
selected: fill ink     border —        icon primary
dimmed:   fill surface border ink/20  icon ink/30
overflow: fill danger-bg border danger-fg icon danger-fg
ov+sel:   fill danger-fg border —     icon danger-bg`}</CodeBlock>
          </DevCard>

          <DevCard title="Icone overflow" file="components/ui/icons.tsx">
            <p>Due icone da usare nello stato overflow:</p>
            <CodeBlock>{`overflowType="timing" → IconClockExclamation
overflowType="geo"    → IconMapPinExclamation
                        (da aggiungere al barrel)`}</CodeBlock>
            <p className="mt-2 text-[11px] text-ink-faint">
              Se <code>overflowType</code> non serve al chiamante, usare sempre <code>timing</code> come default e gestire il tipo nel tooltip/hover card.
            </p>
          </DevCard>

          <DevCard title="Anchor point e z-index" file="features/explore/ExploreMap.tsx">
            <p>Il tip del pin è il punto preciso sulla mappa. Per il posizionamento Google Maps:</p>
            <CodeBlock>{`// anchor = bottom-center del pin SVG
anchor: new google.maps.Point(
  pin.width / 2,   // x center
  pin.height       // y bottom
)`}</CodeBlock>
          </DevCard>

          <DevCard title="Path line tra anchor points" file="features/explore/ExploreMap.tsx">
            <p>La linea path connette i tip dei pin in sequenza:</p>
            <CodeBlock>{`// Polyline tratteggiata tra le coordinate
// delle attività nello stesso giorno
strokeColor: token("ink")
strokeOpacity: 0.35
strokeWeight: 2
icons: [{ icon: { path: "M 0,-1 0,1" },
          offset: "0", repeat: "9px" }]`}</CodeBlock>
            <p className="mt-2 text-[11px] text-ink-faint">
              Il path verso un pin overflow usa <code>danger-fg</code> invece di ink.
            </p>
          </DevCard>

          <DevCard title="Fallback senza icona" file="components/ui/RoadmapPin.tsx">
            <p>
              Se l&apos;attività non ha un tipo configurato, il prop <code>icon</code> va omesso.
              Il componente usa <code>IconMapPin</code> come default automatico — stesso pin generico del sistema esistente.
            </p>
          </DevCard>

          <DevCard title="Token da aggiungere" file="app/globals.css">
            <p>Tutti i colori usano token già esistenti:</p>
            <CodeBlock>{`--color-danger-bg:     #fcebeb  ✓
--color-danger-fg:     #9a3015  ✓
--color-primary:       #f47b3a  ✓
--color-ink:           #0d2c3d  ✓
--color-surface-soft:  #f5f3ee  ✓`}</CodeBlock>
            <p className="mt-2 text-[11px] text-ink-faint">
              Nessun nuovo token necessario.
            </p>
          </DevCard>

        </div>
      </section>

    </div>
  );
}

/* ─── Helper UI ──────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-4">
      {children}
    </div>
  );
}

function PinWithLabel({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {children}
      <div className="text-center">
        <div className="text-[11px] font-medium text-ink">{label}</div>
        {sub && <div className="text-[10px] text-ink-faint">{sub}</div>}
      </div>
    </div>
  );
}

function DevCard({
  title,
  file,
  children,
}: {
  title: string;
  file: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 flex flex-col gap-2">
      <div>
        <div className="text-[12px] font-medium text-ink">{title}</div>
        <div className="text-[10px] text-orange font-mono">{file}</div>
      </div>
      <div className="text-[12px] text-ink-soft leading-relaxed [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-ink [&_code]:bg-surface-soft [&_code]:px-1 [&_code]:rounded-sm">
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-[11px] font-mono text-ink bg-surface-soft rounded px-3 py-2 leading-relaxed overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}
