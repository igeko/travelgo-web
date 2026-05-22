"use client";

import { useState } from "react";

/**
 * Explore — toolbar verticale + chip row + pannello luoghi
 *
 * Sketch dell'opzione C con doppia espansione:
 *  - toolbar a destra (macro categorie)
 *  - chip row orizzontale che esce dalla macro selezionata (sotto-categorie)
 *  - pannello Go a sinistra in modalità "luoghi trovati" con paginazione (10 + load more)
 *
 * No mappa reale: SVG stilizzato come placeholder.
 * No API reale: tutto useState + mock inline.
 */

type SubCat = {
  id: string;
  label: string;
  icon: string;
};

type MacroCat = {
  id: string;
  label: string;
  icon: string;
  subs: SubCat[];
};

const MACROS: MacroCat[] = [
  {
    id: "mangia",
    label: "Mangia",
    icon: "ti-soup",
    subs: [
      { id: "ristoranti", label: "Ristoranti", icon: "ti-tools-kitchen-2" },
      { id: "pub", label: "Pub", icon: "ti-beer" },
      { id: "street", label: "Street food", icon: "ti-burger" },
      { id: "caffe", label: "Caffè", icon: "ti-coffee" },
      { id: "mercati", label: "Mercati", icon: "ti-shopping-bag" },
    ],
  },
  { id: "vedi", label: "Vedi", icon: "ti-building-castle", subs: [] },
  { id: "natura", label: "Natura", icon: "ti-tree", subs: [] },
  { id: "dormi", label: "Dormi", icon: "ti-bed", subs: [] },
  { id: "viste", label: "Viste", icon: "ti-eye", subs: [] },
  { id: "notte", label: "Notte", icon: "ti-glass-full", subs: [] },
];

type Place = {
  id: string;
  category: string;
  name: string;
  zone: string;
  walkMin: number;
  price: string;
  rating: number;
  subIcon: string;
};

const PLACES: Place[] = [
  { id: "p1", category: "Ristorante", name: "Sushi Yoshitake", zone: "Ginza", walkMin: 12, price: "€€€", rating: 4.7, subIcon: "ti-tools-kitchen-2" },
  { id: "p2", category: "Ristorante", name: "Sukiyabashi Jiro", zone: "Ginza", walkMin: 8, price: "€€€", rating: 4.6, subIcon: "ti-tools-kitchen-2" },
  { id: "p3", category: "Caffè", name: "Higashiya Ginza", zone: "Ginza", walkMin: 6, price: "€€", rating: 4.5, subIcon: "ti-coffee" },
  { id: "p4", category: "Mercato", name: "Tsukiji Outer Market", zone: "Tsukiji", walkMin: 18, price: "libero", rating: 4.4, subIcon: "ti-shopping-bag" },
  { id: "p5", category: "Ristorante", name: "Tempura Kondo", zone: "Ginza", walkMin: 10, price: "€€", rating: 4.5, subIcon: "ti-tools-kitchen-2" },
  { id: "p6", category: "Caffè", name: "Cafe de l'Ambre", zone: "Ginza", walkMin: 7, price: "€", rating: 4.6, subIcon: "ti-coffee" },
  { id: "p7", category: "Ristorante", name: "Birdland", zone: "Ginza", walkMin: 9, price: "€€", rating: 4.4, subIcon: "ti-tools-kitchen-2" },
  { id: "p8", category: "Caffè", name: "Kissa Mode", zone: "Tsukiji", walkMin: 16, price: "€", rating: 4.3, subIcon: "ti-coffee" },
  { id: "p9", category: "Ristorante", name: "Ginza Kojyu", zone: "Ginza", walkMin: 11, price: "€€€", rating: 4.5, subIcon: "ti-tools-kitchen-2" },
  { id: "p10", category: "Mercato", name: "Nihonbashi Marche", zone: "Nihonbashi", walkMin: 20, price: "libero", rating: 4.2, subIcon: "ti-shopping-bag" },
];

const TOTAL_PLACES = 247;
const PAGE_SIZE = 10;

export default function ExploreToolbarSketch() {
  const [openMacroId, setOpenMacroId] = useState<string>("mangia");
  const [activeSubs, setActiveSubs] = useState<Set<string>>(
    new Set(["ristoranti", "caffe", "mercati"]),
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("p1");
  const [loadedCount, setLoadedCount] = useState<number>(PAGE_SIZE);

  const openMacro = MACROS.find((m) => m.id === openMacroId) ?? MACROS[0];

  function toggleSub(id: string) {
    setActiveSubs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const remaining = TOTAL_PLACES - loadedCount;
  const visiblePlaces = PLACES.slice(0, Math.min(loadedCount, PLACES.length));

  return (
    <div className="relative h-[calc(100vh-37px)] w-full overflow-hidden bg-[#efede5]">
      {/* ── Mappa SVG placeholder ───────────────────────────────────── */}
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path d="M0 0 L 400 0 L 340 200 L 140 300 L 0 320 Z" fill="#bfd8e0" opacity="0.9" />
        <path d="M1500 480 L 1600 470 L 1600 760 L 1540 760 Z" fill="#bfd8e0" opacity="0.9" />
        <path d="M820 220 q 100 -20 160 50 q 20 90 -50 130 q -130 40 -160 -40 q -40 -90 50 -140 z" fill="#d5e2bd" opacity="0.9" />
        <path d="M1080 720 q 100 -25 180 30 q 40 80 -50 130 q -140 40 -180 -30 q -30 -75 50 -130 z" fill="#d5e2bd" opacity="0.9" />
        <path d="M0 560 Q 440 540 820 580 T 1600 560" stroke="#ffffff" strokeWidth="14" fill="none" />
        <path d="M820 0 L 860 440 L 820 700 L 880 1000" stroke="#ffffff" strokeWidth="14" fill="none" />
        <path d="M440 0 L 500 440 L 460 760 L 540 1000" stroke="#ffffff" strokeWidth="9" fill="none" opacity="0.9" />
        <path d="M1140 0 L 1180 440 L 1100 880 L 1140 1000" stroke="#ffffff" strokeWidth="9" fill="none" opacity="0.9" />
        <path d="M0 880 L 1600 870" stroke="#ffffff" strokeWidth="9" fill="none" opacity="0.9" />
        <path d="M0 280 L 1600 270" stroke="#ffffff" strokeWidth="5" fill="none" opacity="0.8" />
        <path d="M0 800 L 1600 800" stroke="#ffffff" strokeWidth="5" fill="none" opacity="0.8" />
        <path d="M0 640 Q 540 620 1060 640 T 1600 620" stroke="#b2b2b2" strokeWidth="1.5" strokeDasharray="6 4" fill="none" />
      </svg>

      {/* labels mappa */}
      <span className="absolute left-[56%] top-[22%] -translate-x-1/2 -translate-y-1/2 text-[10.5px] font-medium text-ink-soft" style={{ textShadow: "0 0 4px #efede5, 0 0 4px #efede5" }}>
        Ginza
      </span>
      <span className="absolute left-[82%] top-[20%] -translate-x-1/2 -translate-y-1/2 text-[10.5px] font-medium text-ink-soft" style={{ textShadow: "0 0 4px #efede5, 0 0 4px #efede5" }}>
        Nihonbashi
      </span>
      <span className="absolute left-[76%] top-[60%] -translate-x-1/2 -translate-y-1/2 text-[10.5px] font-medium text-ink-soft" style={{ textShadow: "0 0 4px #efede5, 0 0 4px #efede5" }}>
        Tsukiji
      </span>
      <span className="absolute left-[88%] top-[75%] -translate-x-1/2 -translate-y-1/2 text-[10.5px] font-medium text-ink-soft" style={{ textShadow: "0 0 4px #efede5, 0 0 4px #efede5" }}>
        Hama-rikyu
      </span>

      {/* ── Trip header (in alto, accanto al chip row) ───────────── */}
      <div className="absolute top-[18px] left-[380px] z-10 inline-flex items-center gap-2 rounded-pill border border-border bg-surface py-[6px] pl-[8px] pr-[14px]">
        <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-orange-soft text-orange text-[13px]">
          <i className="ti ti-building-castle" />
        </span>
        <span className="font-serif text-[13.5px] font-medium text-ink tracking-[-0.005em]">
          Tokyo · primavera
        </span>
        <span className="text-tiny text-ink-soft">· giorno 3</span>
      </div>

      {/* ── Chip row (sotto-categorie della macro aperta) ────────── */}
      <div
        className="absolute z-10 inline-flex items-center gap-[6px] rounded-pill border border-border bg-surface py-[4px] pl-[6px] pr-[6px]"
        style={{ top: 23, right: 70 }}
      >
        {openMacro.subs.map((sub) => {
          const on = activeSubs.has(sub.id);
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => toggleSub(sub.id)}
              className={
                "inline-flex items-center gap-[5px] whitespace-nowrap rounded-pill px-[11px] py-[5px] text-mini transition-colors " +
                (on
                  ? "bg-orange text-white"
                  : "text-ink-soft hover:bg-surface-soft hover:text-ink")
              }
            >
              <i className={`ti ${sub.icon} text-[13px]`} />
              {sub.label}
            </button>
          );
        })}

        <button
          type="button"
          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-pill bg-ink py-[5px] pl-[10px] pr-[12px] text-mini font-medium text-white"
        >
          {TOTAL_PLACES} luoghi
          <i className="ti ti-arrow-right text-[12px]" />
        </button>
      </div>

      {/* ── Toolbar verticale macro (in alto a destra) ───────────── */}
      <div className="absolute right-[18px] top-[18px] z-10 flex flex-col gap-1 rounded-pill border border-border bg-surface p-[5px]" aria-label="Categorie">
        {MACROS.map((macro) => {
          const isOpen = macro.id === openMacroId;
          const hasActive = isOpen && macro.subs.some((s) => activeSubs.has(s.id));
          return (
            <button
              key={macro.id}
              type="button"
              onClick={() => setOpenMacroId(macro.id)}
              aria-label={macro.label}
              aria-pressed={isOpen}
              className={
                "relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-[17px] transition-colors " +
                (isOpen ? "bg-ink text-white" : "text-ink-soft hover:bg-surface-soft")
              }
            >
              <i className={`ti ${macro.icon}`} />
              {hasActive && (
                <span className="absolute right-[5px] top-[5px] h-[7px] w-[7px] rounded-full bg-orange ring-[1.5px] ring-ink" />
              )}
            </button>
          );
        })}

        <span className="my-1 mx-2 h-px bg-border" />

        <button
          type="button"
          aria-label="Tutte le categorie"
          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-[17px] text-ink-soft hover:bg-surface-soft"
        >
          <i className="ti ti-adjustments-horizontal" />
        </button>
      </div>

      {/* ── Pin sulla mappa (mock) ──────────────────────────────── */}
      <Pin x={52} y={38} subIcon="ti-tools-kitchen-2" />
      <Pin x={64} y={52} active label="Sushi Yoshitake" />
      <Pin x={76} y={44} subIcon="ti-tools-kitchen-2" />
      <Pin x={68} y={28} subIcon="ti-coffee" />
      <Pin x={82} y={68} subIcon="ti-shopping-bag" />
      <Pin x={58} y={64} subIcon="ti-coffee" />
      <Pin x={88} y={36} subIcon="ti-tools-kitchen-2" />

      {/* ── Zoom (in basso a destra) ─────────────────────────────── */}
      <div className="absolute right-[18px] bottom-[18px] z-10 overflow-hidden rounded-md border border-border bg-surface">
        <button className="flex h-[34px] w-[34px] items-center justify-center border-b border-border text-[16px] text-ink hover:bg-surface-soft">
          <i className="ti ti-plus" />
        </button>
        <button className="flex h-[34px] w-[34px] items-center justify-center text-[16px] text-ink hover:bg-surface-soft">
          <i className="ti ti-minus" />
        </button>
      </div>

      {/* ── Go panel (in basso a sinistra, modalità "luoghi trovati") ── */}
      <aside className="absolute left-[18px] top-[18px] bottom-[18px] z-10 flex w-[340px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
        {/* head */}
        <header className="flex items-center gap-2.5 border-b border-border px-[14px] py-[12px]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink font-serif text-meta font-medium text-white">
            五
          </span>
          <span className="text-meta font-medium uppercase tracking-eyebrow text-orange">GO</span>
          <span className="text-meta text-ink-faint">·</span>
          <span className="flex-1 font-serif italic text-meta text-ink">luoghi trovati</span>
          <span className="inline-flex gap-1">
            <button className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-ink-faint hover:bg-surface-soft" aria-label="Espandi">
              <i className="ti ti-arrows-maximize text-[14px]" />
            </button>
            <button className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-ink-faint hover:bg-surface-soft" aria-label="Chiudi">
              <i className="ti ti-x text-[14px]" />
            </button>
          </span>
        </header>

        {/* filters mirror */}
        <div className="flex flex-wrap items-center gap-[6px] px-[14px] pt-[10px]">
          <span className="mr-[2px] text-micro font-medium uppercase tracking-eyebrow-wide text-ink-soft">
            Filtri
          </span>
          {openMacro.subs
            .filter((s) => activeSubs.has(s.id))
            .map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => toggleSub(sub.id)}
                className="inline-flex items-center gap-1 rounded-pill bg-orange-soft py-[3px] pl-[7px] pr-[8px] text-tiny font-medium text-orange-deep"
              >
                <i className={`ti ${sub.icon} text-[11px]`} />
                {sub.label}
                <i className="ti ti-x text-[10px] opacity-55" />
              </button>
            ))}
        </div>

        {/* count + sort */}
        <div className="flex items-center justify-between px-[14px] pt-[12px] pb-1">
          <span className="text-mini text-ink-soft">
            <b className="font-semibold text-ink">{loadedCount}</b> di {TOTAL_PLACES} luoghi
          </span>
          <button className="inline-flex items-center gap-1 text-[11.5px] text-ink-soft hover:text-ink">
            Top rated <i className="ti ti-chevron-down" />
          </button>
        </div>

        {/* results scroll */}
        <div className="flex-1 overflow-y-auto px-[10px] pb-[8px] pt-1 scrollbar-thin">
          {visiblePlaces.map((p) => {
            const isSelected = selectedPlaceId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlaceId(p.id)}
                className={
                  "mb-[6px] flex w-full items-start gap-[10px] rounded-md p-[10px] text-left transition-colors " +
                  (isSelected ? "bg-orange-soft/60" : "bg-surface-soft hover:bg-[#ece8de]")
                }
              >
                <span className="mt-[2px] inline-block h-[18px] w-[18px] flex-shrink-0 rounded-[4px] border-[1.5px] border-ink-faint" />
                <span className="min-w-0 flex-1">
                  <span className="mb-[3px] flex items-center gap-[6px] text-micro font-medium uppercase tracking-eyebrow text-orange">
                    {p.category}
                    <span className="font-normal text-ink-faint">
                      · {p.price} · ★ {p.rating}
                    </span>
                  </span>
                  <span className="block font-serif text-[14px] font-medium leading-[1.18] tracking-[-0.005em] text-ink">
                    {p.name}
                  </span>
                  <span className="mt-[2px] block text-[11.5px] text-ink-soft">
                    {p.zone}, Tokyo · {p.walkMin} min
                  </span>
                </span>
                <i className="ti ti-chevron-down self-center text-meta text-ink-faint" />
              </button>
            );
          })}

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setLoadedCount((n) => Math.min(n + PAGE_SIZE, TOTAL_PLACES))}
              className="mx-1 mt-[4px] flex w-[calc(100%-8px)] items-center justify-center gap-[8px] rounded-md border border-dashed border-border-strong bg-transparent px-[14px] py-[11px] text-meta font-medium text-ink hover:border-solid hover:bg-surface-soft"
            >
              <i className="ti ti-arrow-down text-[14px] text-orange" />
              Mostra altri {Math.min(PAGE_SIZE, remaining)}
              <span className="ml-1 text-tiny font-normal text-ink-faint">· restano {remaining}</span>
            </button>
          )}

          {remaining === 0 && (
            <p className="mt-[6px] mb-1 text-center text-tiny italic text-ink-faint">
              Sono tutti i {TOTAL_PLACES} luoghi
            </p>
          )}
        </div>

        {/* input (twin segmented + send) */}
        <div className="border-t border-border px-[10px] pt-[8px] pb-[10px]">
          <div className="flex h-[48px] items-center gap-2 rounded-pill border border-border bg-surface p-[5px]">
            <div className="inline-flex flex-shrink-0 gap-[1px] rounded-pill bg-surface-soft p-[3px]">
              <button
                aria-label="Cerca"
                className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full text-meta text-ink-soft hover:text-ink"
              >
                <i className="ti ti-search" />
              </button>
              <button
                aria-label="Chiedi a Go"
                aria-pressed
                className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full bg-orange text-meta text-white"
              >
                <i className="ti ti-sparkles" />
              </button>
            </div>
            <span className="min-w-0 flex-1 px-[2px] font-serif italic text-meta text-ink-faint">
              Scrivi a Go…
            </span>
            <button
              aria-label="Invia"
              className="inline-flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full bg-surface-soft text-meta text-ink hover:bg-[#ece8de]"
            >
              <i className="ti ti-arrow-up" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ─── Pin component ─────────────────────────────────────────────── */
function Pin({
  x,
  y,
  active = false,
  subIcon,
  label,
}: {
  x: number;
  y: number;
  active?: boolean;
  subIcon?: string;
  label?: string;
}) {
  return (
    <div
      className="absolute z-[5]"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -100%)" }}
    >
      {active && label && (
        <span className="absolute bottom-full left-1/2 mb-[2px] -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-ink px-[8px] py-[4px] text-[11.5px] font-medium text-white">
          {label}
          <span
            className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #0d2c3d",
            }}
          />
        </span>
      )}
      <span
        className={
          "relative inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-[2.5px] text-mini " +
          (active
            ? "border-white bg-orange text-white"
            : "border-orange bg-surface text-orange")
        }
      >
        {!active && subIcon && <i className={`ti ${subIcon} text-[12px]`} />}
        <span
          className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
          style={{
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: "6px solid #ffffff",
          }}
        />
      </span>
    </div>
  );
}
