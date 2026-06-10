/**
 * Design sketch — Place hover
 * URL: /design/place-hover
 *
 * Quando un pin è selezionato sulla mappa Explore:
 *  - Desktop → popover ancorato al pin (300px) con foto + banda ink + summary + 2 azioni
 *  - Mobile  → 4° stato del bottom sheet ("place"), accanto a peek/half/full
 *
 * Azioni (aggiornate al prodotto): Add to trip (primary, SPLIT BUTTON —
 * il chevron apre "Tappa del giorno / Flessibile": gestione fuzzy non
 * invasiva, proposta A) · Yumeji (ghost, heart icon). "Flessibile" segue
 * la stessa destinazione dell'Add to trip (giorno selezionato/suggerito),
 * cambia solo il flag fuzzy sulla scheduled. Chiedi a Go: link ghost
 * sotto le azioni (desktop) + input sticky contestuale (mobile).
 * L'input "Scrivi a Go" resta sticky in fondo allo sheet, contestualizzato
 * al posto selezionato — coerente con come `goFocus` viene aggiornato da
 * ExploreMap.tsx quando arriva un evento `place.opened`.
 *
 * Su mobile niente meta (orari/prezzo): restano scopribili dentro Go.
 */

import {
  IconStar,
  IconX,
  IconSparkles,
  IconHeart,
  IconArrowUp,
  IconSearch,
  IconCalendarPlus,
  IconChevronDown,
  IconCircleDashed,
  IconMapPin,
} from "@/components/ui/icons";

const PLACE = {
  name: "Toshogu Shrine",
  rating: 4.6,
  summary:
    "Santuario shintoista decorato, mausoleo del primo shogun Tokugawa, immerso nei cedri di Nikko.",
};

export default function PlaceHoverPage() {
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-10">
      <header className="mb-10">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">
          Explore · pin selezionato
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-3 tracking-[-0.01em]">
          Place hover
        </h1>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[680px]">
          Click su un pin →{" "}
          <span className="font-medium text-ink">desktop</span> apre un popover
          ancorato al pin,{" "}
          <span className="font-medium text-ink">mobile</span> espande il bottom
          sheet a un nuovo stato &ldquo;place&rdquo;. Stessa identità visiva
          (foto, banda ink, summary), due azioni:{" "}
          <span className="font-medium text-ink">Add to trip</span> (split
          button: il chevron apre{" "}
          <span className="font-medium text-ink">Tappa del giorno / Flessibile</span>{" "}
          — gestione fuzzy non invasiva) e{" "}
          <span className="font-medium text-ink">Yumeji</span>. Go resta come
          link ghost sotto le azioni (desktop) e nell&apos;input sticky
          contestuale (mobile).
        </p>
      </header>

      <div className="grid gap-x-10 gap-y-12 grid-cols-1 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="flex flex-col mb-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint mb-1">
              Desktop
            </span>
            <h2 className="font-serif text-[16px] font-medium text-ink leading-tight tracking-[-0.01em]">
              Popover ancorato al pin
            </h2>
          </div>
          <DesktopMockup />
          <p className="text-[12px] text-ink-soft leading-[1.5] max-w-[460px]">
            300px sopra il pin. Hover su un pin → tooltip leggero col nome;
            click → questo popover. Si chiude cliccando fuori o sulla X.
          </p>
        </section>

        <section className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center text-center mb-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint mb-1">
              Mobile · place state
            </span>
            <h2 className="font-serif text-[16px] font-medium text-ink leading-tight tracking-[-0.01em]">
              Quarto stato del sheet
            </h2>
          </div>
          <MobilePlaceFrame />
          <p className="text-[12px] text-ink-soft leading-[1.5] text-center max-w-[260px]">
            Sheet a ~340px: foto, summary, due azioni. Niente orari/prezzo —
            quelli vivono nel chat di Go. L&apos;input{" "}
            <span className="text-ink">Scrivi a Go di Toshogu…</span> resta
            sticky.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ─── Photo art — temple silhouette su tono caldo ───────────────── */
function PhotoArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 130"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <rect width="300" height="130" fill="#dfa97e" />
      <polygon
        points="0,90 50,40 100,70 160,20 220,55 270,35 300,60 300,130 0,130"
        fill="#a8623d"
        opacity="0.55"
      />
      <g transform="translate(125,55)" fill="#3d2818" opacity="0.78">
        <rect x="0" y="22" width="40" height="28" />
        <polygon points="-6,22 46,22 40,10 0,10" />
        <polygon points="-3,10 43,10 38,2 2,2" />
      </g>
      <circle cx="245" cy="38" r="14" fill="#f4cf94" opacity="0.7" />
    </svg>
  );
}

/* ─── Pin set on mock map ─────────────────────────────────────── */
function ScatterPin({ x, y }: { x: number; y: number }) {
  return (
    <svg
      viewBox="0 0 16 22"
      width="14"
      height="19"
      className="absolute opacity-55"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-100%)" }}
      aria-hidden
    >
      <path
        d="M8 0C3.6 0 0 3.6 0 8c0 6 8 14 8 14s8-8 8-14C16 3.6 12.4 0 8 0z"
        fill="#0d2c3d"
      />
    </svg>
  );
}

function SelectedPin({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute z-10"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-100%)" }}
    >
      <svg viewBox="0 0 28 38" width="26" height="36" aria-hidden>
        <path
          d="M14 0C6.3 0 0 6.3 0 14c0 9.3 14 24 14 24s14-14.7 14-24C28 6.3 21.7 0 14 0z"
          fill="#0d2c3d"
        />
        <circle cx="14" cy="14" r="5.5" fill="#f47b3a" />
      </svg>
    </div>
  );
}

/* ─── Card content (riusata sia desktop che mobile) ─────────────── */
function CardPhotoBlock({ height = 130 }: { height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <PhotoArt className="block w-full h-full" />
      <div className="absolute inset-x-0 bottom-0 bg-ink px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-white font-medium text-[14px] leading-tight">
          {PLACE.name}
        </span>
        <span className="inline-flex items-center gap-1 text-white text-[12px]">
          <IconStar className="w-3 h-3" stroke={2.5} style={{ color: "#FAC775" }} />
          {PLACE.rating}
        </span>
      </div>
    </div>
  );
}

/** Azioni della card — aggiornate al prodotto: Add to trip (primary) +
 *  Yumeji. L'Add è uno SPLIT BUTTON: il segmento col chevron apre il
 *  menu Tappa/Flessibile (gestione fuzzy non invasiva — proposta A).
 *  `menuOpen` mostra il menu (mock statico, nel reale: popover
 *  z-dropdown, chiusura su selezione/Esc/click-out). */
function ActionButtons({
  size = "md",
  menuOpen = false,
  compact = false,
}: {
  size?: "md" | "lg";
  menuOpen?: boolean;
  /** Mobile (sheet 260px): copy corta "Aggiungi", Yumeji solo icona. */
  compact?: boolean;
}) {
  const h = size === "lg" ? "h-10" : "h-9";
  return (
    <div className="relative">
      <div className="flex gap-2">
        <span className={`flex flex-1 ${h} overflow-hidden rounded-md`}>
          <button
            type="button"
            className="flex-1 bg-primary hover:bg-orange-deep text-white text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <IconCalendarPlus className="w-4 h-4" />
            {compact ? "Aggiungi" : "Add to trip"}
          </button>
          <button
            type="button"
            aria-label="Opzioni di aggiunta"
            aria-expanded={menuOpen}
            className={`${compact ? "w-9" : "w-8"} inline-flex items-center justify-center text-white transition-colors border-l border-white/25 ${
              menuOpen ? "bg-orange-deep" : "bg-primary hover:bg-orange-deep"
            }`}
          >
            <IconChevronDown className="w-3.5 h-3.5" />
          </button>
        </span>
        {compact ? (
          <button
            type="button"
            aria-label="Salva in Yumeji"
            className={`${h} w-12 shrink-0 rounded-md border border-border bg-surface hover:bg-surface-soft text-ink inline-flex items-center justify-center transition-colors`}
          >
            <IconHeart className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            className={`flex-1 ${h} rounded-md border border-border bg-surface hover:bg-surface-soft text-ink text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors`}
          >
            <IconHeart className="w-4 h-4" />
            Yumeji
          </button>
        )}
      </div>
      {menuOpen ? (
        <div className="absolute left-0 top-full z-dropdown mt-1 w-[180px] rounded-md border border-border-strong bg-surface p-1 shadow-float">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-mini text-ink hover:bg-surface-soft"
          >
            <IconMapPin className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
            Tappa
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-mini text-ink hover:bg-surface-soft"
          >
            <IconCircleDashed className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
            Flessibile
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Desktop mockup ──────────────────────────────────────────── */
function DesktopMockup() {
  return (
    <div className="relative w-full aspect-[5/4] max-w-[520px] rounded-lg overflow-hidden border border-border bg-[#DDE6DA]">
      <svg
        viewBox="0 0 500 400"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden
      >
        <path
          d="M-20 130 Q120 90 240 180 T520 240"
          stroke="#C8DACC"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M-20 280 Q140 240 280 290 T520 310"
          stroke="#C8DACC"
          strokeWidth="3"
          fill="none"
        />
        <path d="M180 -20 L 200 420" stroke="#C8DACC" strokeWidth="3" fill="none" />
        <path
          d="M0 200 Q100 220 200 200 T520 195"
          stroke="#9ec4d4"
          strokeWidth="5"
          fill="none"
          opacity="0.55"
        />
      </svg>

      <ScatterPin x={18} y={28} />
      <ScatterPin x={26} y={72} />
      <ScatterPin x={78} y={32} />
      <ScatterPin x={86} y={70} />
      <ScatterPin x={62} y={88} />

      <SelectedPin x={50} y={62} />

      {/* niente overflow-hidden sul wrapper: il menu dello split button
          deve poter sbordare sotto la card */}
      <div className="absolute left-1/2 top-[6%] z-20 w-[300px] -translate-x-1/2 rounded-md border border-border bg-surface shadow-float">
        <div className="relative overflow-hidden rounded-t-md">
          <CardPhotoBlock />
          <button
            type="button"
            aria-label="Chiudi"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/55 text-white hover:bg-ink/70 transition-colors"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-2 p-3">
          <p className="text-[12px] text-ink-soft leading-snug">
            {PLACE.summary}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success-fg" />
              Aperto
            </span>
            <span className="text-ink-faint">·</span>
            <span>chiude alle 17:00</span>
            <span className="text-ink-faint">·</span>
            <span>¥¥</span>
          </div>
          <div className="border-t border-border pt-2">
            {/* Menu split aperto (mock): Tappa del giorno / Flessibile */}
            <ActionButtons menuOpen />
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-ink-faint">
            <IconSparkles className="h-3 w-3 shrink-0" />
            <span className="cursor-pointer underline-offset-2 hover:text-ink-soft hover:underline">
              Chiedi a Go di {PLACE.name.split(" ")[0]}…
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile · place state ───────────────────────────────────── */
function MobilePlaceFrame() {
  return (
    <div
      className="relative w-full max-w-[260px] rounded-[28px] bg-[#1a1410] p-[6px] shadow-[0_18px_40px_-16px_rgba(13,44,61,0.25),0_4px_12px_-4px_rgba(13,44,61,0.08)]"
      style={{ aspectRatio: "260 / 540" }}
    >
      <span
        aria-hidden
        className="absolute top-[10px] left-1/2 z-50 h-[18px] w-[70px] -translate-x-1/2 rounded-[10px] bg-[#1a1410]"
      />
      <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[#efede5]">
        <div className="relative z-[25] flex h-[28px] items-end justify-between px-[14px] pb-[4px] text-[10px] font-semibold text-ink">
          <span>9:41</span>
          <span className="inline-flex items-center gap-[3px] text-[9px]">
            <i className="ti ti-signal-4g" />
            <i className="ti ti-battery-3" />
          </span>
        </div>

        <svg
          viewBox="0 0 260 540"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path d="M0 0 L 80 0 L 70 36 L 16 60 L 0 64 Z" fill="#bfd8e0" opacity="0.9" />
          <path d="M140 100 q 30 -8 50 18 q 10 30 -15 45 q -45 12 -50 -15 q -12 -28 15 -48 z" fill="#d5e2bd" opacity="0.9" />
          <path d="M0 180 Q 70 174 140 188 T 260 178" stroke="#fff" strokeWidth="7" fill="none" />
          <path d="M140 0 L 154 140 L 140 280" stroke="#fff" strokeWidth="7" fill="none" />
          <path d="M70 0 L 82 140" stroke="#fff" strokeWidth="4" fill="none" opacity="0.9" />
          <path d="M196 0 L 208 140" stroke="#fff" strokeWidth="4" fill="none" opacity="0.9" />
        </svg>

        <SelectedPin x={56} y={32} />
        <ScatterPin x={30} y={20} />
        <ScatterPin x={78} y={18} />

        <aside
          className="absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[18px] bg-surface"
          style={{ height: 360, boxShadow: "0 -8px 24px -8px rgba(13,44,61,0.15)" }}
        >
          <div className="relative flex-shrink-0">
            <span className="mx-auto mt-[6px] mb-[2px] block h-[4px] w-[32px] rounded-full bg-[#d6d2c5]" />
            <button
              type="button"
              aria-label="Deseleziona"
              className="absolute right-[10px] top-[6px] inline-flex h-[24px] w-[24px] items-center justify-center rounded-full bg-surface-soft text-ink hover:bg-border transition-colors"
            >
              <IconX className="h-3 w-3" />
            </button>
          </div>

          <div className="mx-[10px] mt-[6px] overflow-hidden rounded-md">
            <CardPhotoBlock height={110} />
          </div>

          <div className="flex flex-1 flex-col gap-2 px-[12px] py-[10px]">
            <p className="text-[11px] leading-snug text-ink-soft">{PLACE.summary}</p>
            <ActionButtons size="lg" compact />
          </div>

          <SheetGoInput contextual />
        </aside>
      </div>
    </div>
  );
}

/* ─── Sticky Go input in fondo allo sheet ─────────────────────── */
function SheetGoInput({ contextual = false }: { contextual?: boolean }) {
  return (
    <div className="flex-shrink-0 border-t border-border px-[7px] py-[5px]">
      <div className="flex h-[30px] items-center gap-[4px] rounded-pill border border-border bg-surface p-[2px]">
        <div className="inline-flex flex-shrink-0 gap-[1px] rounded-pill bg-surface-soft p-[2px]">
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] text-ink-soft">
            <IconSearch className="h-3 w-3" />
          </span>
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-orange text-[9px] text-white">
            <IconSparkles className="h-3 w-3" />
          </span>
        </div>
        <span className="min-w-0 flex-1 truncate px-[2px] font-serif text-[9.5px] italic text-ink-faint">
          {contextual ? "Scrivi a Go di Toshogu…" : "Scrivi a Go…"}
        </span>
        <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-surface-soft text-[10px] text-ink">
          <IconArrowUp className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
