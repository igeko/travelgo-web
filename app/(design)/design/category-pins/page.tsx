/**
 * Design sketch — Category Pins
 * URL: /design/category-pins
 *
 * Pin delle macro-categorie di ricerca sulla mappa.
 * Mostrati quando l'utente cerca ristoranti, alloggi, attrazioni, ecc.
 *
 * 3 macro-categorie:
 *   eat     → #c0622a (arancio muted) — ristoranti, bar, caffè, cibo
 *   sleep   → #2d6a8f (blu muted)    — hotel, campeggi, ostelli, b&b
 *   explore → #3a7d44 (verde muted)  — attrazioni, monumenti, natura, musei
 *
 * Componente Figma: "Category Pin" COMPONENT_SET (id: 2145:1003)
 * Componente target: components/ui/CategoryPin.tsx  (da creare)
 * Usato in: features/explore/ExploreMap.tsx (search results mode)
 *
 * Google Maps anchor: bottom-center della teardrop
 *   anchor: new google.maps.Point(17, 43)
 */

import { cn } from "@/lib/cn";
import {
  IconToolsKitchen2,
  IconBed,
  IconCompass,
} from "@/components/ui/icons";
import type { Icon } from "@/components/ui/icons";

/* ─── Tipi ────────────────────────────────────────────────────────── */
type PinCategory = "eat" | "sleep" | "explore";

type CategoryPinProps = {
  category: PinCategory;
  className?: string;
};

/* ─── Palette palette 3 — muted naturali ─────────────────────────── */
const CATEGORY_CONFIG: Record<
  PinCategory,
  { color: string; icon: Icon; label: string }
> = {
  eat: {
    color: "#c0622a",
    icon: IconToolsKitchen2,
    label: "Eat",
  },
  sleep: {
    color: "#2d6a8f",
    icon: IconBed,
    label: "Sleep",
  },
  explore: {
    color: "#3a7d44",
    icon: IconCompass,
    label: "Explore",
  },
};

/* ─── Teardrop SVG path (34×43) ───────────────────────────────────── */
const TEARDROP =
  "M17,1 C8.7,1 1,8.5 1,17 C1,27 17,42 17,42 C17,42 33,27 33,17 C33,8.5 25.3,1 17,1 Z";

/* ─── Componente ──────────────────────────────────────────────────── */

/**
 * CategoryPin
 *
 * Pin teardrop colorato per macro-categoria di ricerca sulla mappa.
 * Dimensione fissa 34×43px — non scalare, il anchor è bottom-center.
 *
 * Usare come Google Maps OverlayView o come custom marker icon:
 *   icon: {
 *     url: `data:image/svg+xml,...`,
 *     anchor: new google.maps.Point(17, 43),
 *   }
 */
export function CategoryPin({ category, className }: CategoryPinProps) {
  const { color, icon: Icon } = CATEGORY_CONFIG[category];

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width="34"
        height="43"
        viewBox="0 0 34 43"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.25))" }}
      >
        <path d={TEARDROP} fill={color} stroke="white" strokeWidth="1.5" />
      </svg>
      {/* Icona sovrapposta — centrata rispetto alla testa del pin */}
      <Icon
        size={15}
        color="white"
        className="absolute"
        style={{ top: 11, left: "50%", transform: "translateX(-50%)" }}
        aria-hidden
      />
    </div>
  );
}

/* ─── Note developer ───────────────────────────────────────────────── */
/*
 * MAPPING CATEGORIE → MACRO
 * -------------------------
 * eat:     "restaurant" | "cafe" | "bar" | "fast_food" | "food_court"
 * sleep:   "hotel" | "hostel" | "motel" | "campsite" | "guest_house" | "apartment"
 * explore: "attraction" | "museum" | "monument" | "park" | "viewpoint" | "ruins" | "gallery"
 *
 * Funzione helper consigliata:
 *
 *   function toPinCategory(type: string): PinCategory {
 *     if (["restaurant","cafe","bar","fast_food"].includes(type)) return "eat";
 *     if (["hotel","hostel","campsite","motel"].includes(type))   return "sleep";
 *     return "explore";
 *   }
 *
 * GOOGLE MAPS — SVG come data URL
 * --------------------------------
 * Per usare come icon in google.maps.Marker:
 *
 *   const svgIcon = {
 *     url: `data:image/svg+xml,${encodeURIComponent(pinSvgString)}`,
 *     scaledSize: new google.maps.Size(34, 43),
 *     anchor: new google.maps.Point(17, 43),
 *   };
 *
 * COLORI — hardcoded by design
 * ----------------------------
 * I 3 colori sono intenzionalmente hardcoded (non token Tailwind)
 * perché appartengono alla semantica della mappa, non al design system UI.
 * eat: #c0622a  |  sleep: #2d6a8f  |  explore: #3a7d44
 */

/* ─── Pagina preview ───────────────────────────────────────────────── */

export default function CategoryPinsPage() {
  const categories = Object.entries(CATEGORY_CONFIG) as [
    PinCategory,
    (typeof CATEGORY_CONFIG)[PinCategory]
  ][];

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-xl mx-auto space-y-10">

        {/* Intestazione */}
        <div>
          <p className="text-[11px] font-medium tracking-eyebrow text-ink/40 uppercase mb-1">
            Design · map pins
          </p>
          <h1 className="text-[22px] font-semibold text-ink">Category Pins</h1>
          <p className="mt-2 text-[14px] text-ink/60 leading-relaxed">
            Pin delle macro-categorie di ricerca sulla mappa. Palette muted
            naturale — visibili senza sovrastare i pin roadmap (ink).
          </p>
        </div>

        {/* Preview su sfondo mappa */}
        <section
          className="rounded-xl p-10 flex items-end justify-center gap-8"
          style={{ background: "#c8e6c9" }}
        >
          {categories.map(([cat, { label }]) => (
            <div key={cat} className="flex flex-col items-center gap-2">
              <CategoryPin category={cat} />
              <span className="text-[11px] font-semibold tracking-eyebrow uppercase text-ink/60 bg-white/60 rounded px-1.5 py-0.5">
                {label}
              </span>
            </div>
          ))}
        </section>

        {/* Tokens */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-ink uppercase tracking-eyebrow">
            Colori
          </h2>
          <div className="space-y-2">
            {categories.map(([cat, { color, label }]) => (
              <div key={cat} className="flex items-center gap-4 text-[13px]">
                <div
                  className="w-6 h-6 rounded flex-shrink-0 border border-black/10"
                  style={{ background: color }}
                />
                <span className="w-20 font-medium text-ink">{label}</span>
                <code className="text-ink/50 font-mono text-[12px]">{color}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Note developer */}
        <section className="space-y-3 border-t border-border pt-8">
          <h2 className="text-[13px] font-semibold text-ink uppercase tracking-eyebrow">
            Note per il developer
          </h2>
          <div className="space-y-3">
            {[
              { label: "File target", value: "components/ui/CategoryPin.tsx (da creare)" },
              { label: "Figma", value: "Components → Category Pin (id: 2145:1003)" },
              { label: "Usato in", value: "features/explore/ExploreMap.tsx (search results mode)" },
              { label: "Anchor Maps", value: "new google.maps.Point(17, 43) — punta bottom-center" },
              { label: "Dimensione", value: "34×43px fissa, non scalare" },
              { label: "Colori", value: "Hardcoded — non sono token del design system" },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-4 text-[13px]">
                <span className="w-36 flex-shrink-0 font-medium text-ink/50">{label}</span>
                <span className="text-ink/80">{value}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
