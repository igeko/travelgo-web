/**
 * Design sketch — Map Search Action Card
 * URL: /design/map-search-action
 *
 * Card contestuale che compare sul punto cliccato sulla mappa
 * quando l'utente ha selezionato una macro-categoria di ricerca
 * nel pannello laterale sinistro.
 *
 * Struttura:
 *   [icona categoria 32×32] [titolo + sottotitolo] [Button "Cerca"] [Button ×]
 *
 * Posizionamento: floating card centrata sopra il tap point,
 * con un anchor dot (10px, colore categoria) sul punto esatto del click.
 *
 * Componente target: features/explore/MapSearchActionCard.tsx (da creare)
 * Trigger: click sulla mappa con categoria attiva nel pannello
 * Dismiss: click su ×, pressione Esc, o nuovo click sulla mappa
 */

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import {
  IconToolsKitchen2,
  IconBed,
  IconCompass,
  IconX,
  IconSearch,
} from "@/components/ui/icons";
import type { Icon } from "@/components/ui/icons";

/* ─── Macro-categorie ─────────────────────────────────────────────── */
type MapCategory = "eat" | "sleep" | "explore";

const CATEGORY_CONFIG: Record<
  MapCategory,
  { icon: Icon; color: string; label: string; searchLabel: string }
> = {
  eat: {
    icon: IconToolsKitchen2,
    color: "#c0622a",
    label: "Ristoranti",
    searchLabel: "Cerca ristoranti qui",
  },
  sleep: {
    icon: IconBed,
    color: "#2d6a8f",
    label: "Alloggi",
    searchLabel: "Cerca alloggi qui",
  },
  explore: {
    icon: IconCompass,
    color: "#3a7d44",
    label: "Attrazioni",
    searchLabel: "Cerca attrazioni qui",
  },
};

/* ─── Componente ──────────────────────────────────────────────────── */

type MapSearchActionCardProps = {
  category: MapCategory;
  onSearch?: () => void;
  onDismiss?: () => void;
  className?: string;
};

/**
 * MapSearchActionCard
 *
 * Card floating che appare al click sulla mappa.
 * Va posizionata tramite absolute/transform rispetto al punto di click:
 *
 *   style={{
 *     position: "absolute",
 *     left: clickX,
 *     top: clickY,
 *     transform: "translate(-50%, calc(-100% - 16px))",
 *   }}
 */
export function MapSearchActionCard({
  category,
  onSearch,
  onDismiss,
  className,
}: MapSearchActionCardProps) {
  const { icon: CatIcon, color, searchLabel } = CATEGORY_CONFIG[category];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5",
        "bg-white rounded-lg border border-border",
        "min-w-0",
        className
      )}
    >
      {/* Icona categoria */}
      <span
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-white"
        style={{ background: color }}
        aria-hidden
      >
        <CatIcon size={15} />
      </span>

      {/* Testo */}
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium text-ink leading-tight">
          {searchLabel}
        </span>
        <span className="block text-[11px] text-ink/45 mt-0.5">
          Zona selezionata
        </span>
      </span>

      {/* CTA */}
      <Button
        variant="solid"
        tone="neutral"
        size="md"
        iconOnly={false}
        onClick={onSearch}
        className="flex-shrink-0"
      >
        <IconSearch size={14} />
        Cerca
      </Button>

      {/* Dismiss */}
      <Button
        variant="ghost"
        tone="neutral"
        size="md"
        iconOnly
        onClick={onDismiss}
        aria-label="Chiudi"
        className="flex-shrink-0"
      >
        <IconX size={14} />
      </Button>
    </div>
  );
}

/* ─── Note developer ───────────────────────────────────────────────── */
/*
 * POSIZIONAMENTO SULLA MAPPA
 * --------------------------
 * Usare google.maps.OverlayView o un div assoluto dentro il container mappa.
 * Offset consigliato: translate(-50%, calc(-100% - 16px)) dal punto di click
 * così la card appare sopra il dot.
 *
 * ANCHOR DOT
 * ----------
 * Renderizzare un dot colorato (10px, stesso colore categoria, bordo bianco 2px)
 * esattamente sul punto di click, sotto la card.
 *
 * TRIGGER
 * -------
 * Aprire quando: google.maps "click" event + categoria attiva nel pannello.
 * Chiudere quando: onDismiss | Escape | click altrove sulla mappa.
 *
 * CATEGORY COLORS
 * ---------------
 * Stessi token del CategoryPin component (components/ui/CategoryPin.tsx):
 *   eat: #c0622a  |  sleep: #2d6a8f  |  explore: #3a7d44
 *
 * CATEGORY → QUERY
 * ----------------
 * La categoria selezionata mappa su un set di OpenTripMap / Places types:
 *   eat     → kinds=foods | type=restaurant,cafe,bar
 *   sleep   → kinds=accomodations | type=lodging
 *   explore → kinds=cultural,natural | type=tourist_attraction,museum,park
 */

/* ─── Pagina preview ───────────────────────────────────────────────── */

/** Sfondo mappa simulato */
function MapMock({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden flex items-center justify-center"
      style={{ background: "#c8e6c9", height: 180 }}
    >
      {/* griglia stradale fittizia */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="60" x2="100%" y2="60" stroke="#7ab77a" strokeWidth="3"/>
        <line x1="0" y1="120" x2="100%" y2="120" stroke="#7ab77a" strokeWidth="5"/>
        <line x1="80" y1="0" x2="80" y2="100%" stroke="#7ab77a" strokeWidth="3"/>
        <line x1="200" y1="0" x2="200" y2="100%" stroke="#7ab77a" strokeWidth="6"/>
        <line x1="320" y1="0" x2="320" y2="100%" stroke="#7ab77a" strokeWidth="2"/>
      </svg>
      {children}
    </div>
  );
}

/** Anchor dot */
function AnchorDot({ color }: { color: string }) {
  return (
    <div
      className="absolute rounded-full border-2 border-white"
      style={{
        width: 10,
        height: 10,
        background: color,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}

export default function MapSearchActionPage() {
  const categories = Object.entries(CATEGORY_CONFIG) as [
    MapCategory,
    (typeof CATEGORY_CONFIG)[MapCategory]
  ][];

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Intestazione */}
        <div>
          <p className="text-[11px] font-medium tracking-eyebrow text-ink/40 uppercase mb-1">
            Design · map interaction
          </p>
          <h1 className="text-[22px] font-semibold text-ink">
            Map Search Action Card
          </h1>
          <p className="mt-2 text-[14px] text-ink/60 leading-relaxed">
            Card contestuale al click sulla mappa — appare sopra il punto
            toccato quando una macro-categoria è attiva nel pannello laterale.
          </p>
        </div>

        {/* Preview per ciascuna categoria */}
        <section className="space-y-4">
          {categories.map(([cat, { color }]) => (
            <MapMock key={cat}>
              <AnchorDot color={color} />
              <div
                className="absolute"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, calc(-100% - 10px))",
                  width: 340,
                }}
              >
                <MapSearchActionCard category={cat} />
              </div>
            </MapMock>
          ))}
        </section>

        {/* Note developer */}
        <section className="space-y-3 border-t border-border pt-8">
          <h2 className="text-[13px] font-semibold text-ink uppercase tracking-eyebrow">
            Note per il developer
          </h2>
          <div className="space-y-3">
            {[
              { label: "File target", value: "features/explore/MapSearchActionCard.tsx (da creare)" },
              { label: "Usato in", value: "features/explore/ExploreMap.tsx — onMapClick handler" },
              { label: "Posizione", value: "translate(-50%, calc(-100% - 16px)) dal click point" },
              { label: "Dismiss", value: "onDismiss | Escape | nuovo click mappa" },
              { label: "Button CTA", value: "<Button variant='solid' tone='neutral' size='md'>" },
              { label: "Button ×", value: "<Button variant='ghost' tone='neutral' size='md' iconOnly>" },
              { label: "Colori icona", value: "Stessi di CategoryPin — eat #c0622a · sleep #2d6a8f · explore #3a7d44" },
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
